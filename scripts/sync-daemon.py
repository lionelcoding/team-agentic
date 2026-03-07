#!/usr/bin/env python3
"""sync-daemon.py — Bridge between Supabase gateway_commands and OpenClaw CLI.

Runs eight concurrent loops:
  A) poll_commands      — every 5s, picks up pending commands and executes them
  B) sync_agent_status  — every 30s, reads OpenClaw health and updates agents table
  C) parse_sessions     — every 60s, parses JSONL session files → agent_actions + signal_items
  D) push_usage_cost    — every 5min, reads openclaw usage-cost → cost_entries
  E) sync_crons         — every 5min, reads openclaw cron list → cron_schedule
  F) process_signals    — every 5min, classifies raw signals → tagged
  G) fetch_sources      — every 10min, reads signal_sources → fetches content → signal_items
  H) auto_dispatch      — every 5min, dispatches high-score tagged signals → handover_messages + wake agent

Pattern DA-6 "sortant uniquement": all connections are outbound from VPS to Supabase.
"""

import argparse
import asyncio
import json
import logging
import os
import re
import shutil
import signal
import subprocess
import sys
import uuid
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from urllib.parse import urlparse

from dotenv import load_dotenv
from supabase import create_client, Client

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
COMMAND_POLL_INTERVAL = 5     # seconds
STATUS_SYNC_INTERVAL = 30    # seconds
COMMAND_TIMEOUT = 60          # seconds
JSONL_PARSE_INTERVAL = 60    # seconds — Loop C
USAGE_COST_INTERVAL = 300    # seconds — Loop D (5 min)
CRON_SYNC_INTERVAL = 300     # seconds — Loop E (5 min)
SIGNAL_PROCESS_INTERVAL = 300  # seconds — Loop F (5 min)
SOURCE_FETCH_INTERVAL = 600    # seconds — Loop G (10 min)
AUTO_DISPATCH_INTERVAL = 300   # seconds — Loop H (5 min)
AUTO_DISPATCH_MIN_SCORE = 60   # minimum relevance_score for auto-dispatch

# Source fetching
SOURCE_CURSOR_FILE = "/tmp/sync-daemon-source-cursors.json"
APIFY_TOKEN = os.environ.get("APIFY_TOKEN", "")

# Session JSONL parsing
SESSIONS_BASE = "/root/.openclaw/agents"
CURSOR_FILE = "/tmp/sync-daemon-cursors.json"
SIGNAL_CURSOR_FILE = "/tmp/sync-daemon-signal-cursors.json"

# Agents whose sessions can produce signals
SIGNAL_AGENTS = {"research", "main"}

# Tool call names that may contain signal URLs
SIGNAL_TOOL_NAMES = {"web_search", "brave_search", "read_url", "fetch_url", "web_fetch", "bash"}

# Domain → platform mapping for signals
DOMAIN_PLATFORM_MAP = {
    "twitter.com": "twitter", "x.com": "twitter",
    "linkedin.com": "linkedin",
    "reddit.com": "reddit",
    "youtube.com": "youtube", "youtu.be": "youtube",
    "github.com": "github",
    "arxiv.org": "arxiv",
    "legifrance.gouv.fr": "legifrance",
    "producthunt.com": "producthunt",
}

# DB valid subcategories: knowledge, strategy, outbound_inbound
# Classification maps internal tags → DB subcategory
SIGNAL_TAG_TO_SUBCATEGORY = {
    "legal": "strategy",
    "competitor": "strategy",
    "market": "knowledge",
    "seo": "knowledge",
    "tech": "knowledge",
}

# Keyword-based classification rules for signals
SIGNAL_CLASSIFICATION_RULES = {
    "tags": {
        "legal": ["rgpd", "gdpr", "cnil", "legal", "juridique", "loi", "réglementation", "compliance"],
        "competitor": ["concurrent", "competitor", "concurrence", "benchmark", "vs ", "versus", "alternative"],
        "market": ["funding", "levée", "fundraise", "acquisition", "ipo", "marché", "market", "tendance", "trend"],
        "seo": ["seo", "google", "serp", "search engine", "référencement", "backlink"],
        "tech": ["ai", "ia", "llm", "gpt", "claude", "machine learning", "deep learning", "tech", "api", "saas"],
    },
    "impact_for_tag": {
        "legal": "fort",
        "competitor": "fort",
        "market": "moyen",
        "seo": "moyen",
        "tech": "moyen",
    },
    "score_for_tag": {
        "legal": 70,
        "competitor": 80,
        "market": 60,
        "seo": 50,
        "tech": 60,
    },
}

# Auto-dispatch: subcategory → (primary_agent, fallback_agent)
DISPATCH_ROUTING = {
    "knowledge":        ("research",  "architect"),
    "strategy":         ("architect", "research"),
    "outbound_inbound": ("outbound",  "tam"),
}

# Impact level → handover priority
IMPACT_TO_PRIORITY = {
    "fort":   "high",
    "moyen":  "normal",
    "faible": "low",
}

# Command map: name → callable(agent_id, payload) → list of CLI args
COMMANDS: dict[str, callable] = {
    "wake":      lambda aid, p: ["openclaw", "agent", "--agent", aid, "--message", p.get("message", "wake up — resume your current tasks"), "--json"],
    "sleep":     lambda aid, _: ["openclaw", "agent", "--agent", aid, "--message", "go to sleep — save state and stop", "--json"],
    "heartbeat": lambda _, __: ["openclaw", "system", "heartbeat", "enable"],
    "health":    lambda _, __: ["openclaw", "health", "--json"],
    "list_crons": lambda _, __: ["openclaw", "cron", "list", "--json"],
    "run_cron":   lambda _, p: ["openclaw", "cron", "run", p.get("cron_id", ""), "--json"],
    "toggle_cron": lambda _, p: ["openclaw", "cron", "enable" if p.get("enabled") else "disable", p.get("cron_id", "")],
    "create_cron": lambda aid, p: ["openclaw", "cron", "add", "--agent", aid or p.get("agent_id", ""), "--name", p.get("name", ""), "--cron", p.get("schedule_expr", ""), "--message", p.get("description", p.get("name", "scheduled task"))] + ["--json"],
    "update_cron": lambda _, p: ["openclaw", "cron", "edit", p.get("cron_id", "")] + (["--name", p["name"]] if p.get("name") else []) + (["--cron", p["schedule_expr"]] if p.get("schedule_expr") else []) + (["--description", p["description"]] if p.get("description") else []) + ["--json"],
    "delete_cron": lambda _, p: ["openclaw", "cron", "rm", p.get("cron_id", ""), "--json"],
}

# Agent IDs that exist on the VPS
KNOWN_AGENTS = {"main", "architect", "tam", "research", "outbound", "monitor"}

# Workspace paths per agent
AGENT_WORKSPACES = {
    "main":      "/root/clawd",
    "architect": "/root/clawd-eagle/architect",
    "tam":       "/root/clawd-eagle/tam",
    "research":  "/root/clawd-eagle/research",
    "outbound":  "/root/clawd-eagle/outbound",
    "monitor":   "/root/clawd-eagle/monitor",
}

# Files that can be read/written via the dashboard
ALLOWED_FILES = {
    "SOUL.md", "IDENTITY.md", "HEARTBEAT.md", "AGENTS.md",
    "USER.md", "TOOLS.md", "MEMORY.md",
}

# Original agents that cannot be deprovisioned
PROTECTED_AGENTS = {"main", "architect", "tam", "research", "outbound", "monitor"}

# Base path for new agent workspaces
EAGLE_BASE = "/root/clawd-eagle"

# Agent ID format validation
AGENT_ID_RE = re.compile(r"^[a-z][a-z0-9-]{1,30}$")

# File templates for provisioned agents
AGENT_FILE_TEMPLATES = {
    "SOUL.md": "# {name}\n\n## Role\n{role}\n\n## Description\n{description}\n",
    "IDENTITY.md": "# Identity: {name}\n\n- **ID**: {agent_id}\n- **Role**: {role}\n- **Model**: {model}\n- **Created**: {created_at}\n",
    "HEARTBEAT.md": "# Heartbeat\n\nNo activity yet.\n",
}

# Mapping from OpenClaw health status strings to our DB status values
HEALTH_STATUS_MAP = {
    "running": "working",
    "active":  "working",
    "idle":    "idle",
    "stopped": "idle",
    "error":   "error",
    "failed":  "error",
}

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S%z",
    stream=sys.stdout,
)
log = logging.getLogger("sync-daemon")


# ---------------------------------------------------------------------------
# Daemon
# ---------------------------------------------------------------------------
class SyncDaemon:
    def __init__(self, *, dry_run: bool = False):
        self.dry_run = dry_run
        self.running = True

        # Load env from multiple possible locations
        for env_path in [".env", "/root/.sync-daemon.env"]:
            if os.path.exists(env_path):
                load_dotenv(env_path)
                log.info("Loaded env from %s", env_path)
                break

        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            log.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
            sys.exit(1)

        self.supabase: Client = create_client(url, key)
        log.info("Connected to Supabase (%s)", url)
        if dry_run:
            log.info("DRY-RUN mode — commands will be printed, not executed")

        # Load dynamic agents from DB
        self._load_dynamic_agents()

        # Graceful shutdown
        signal.signal(signal.SIGTERM, self._handle_signal)
        signal.signal(signal.SIGINT, self._handle_signal)

    def _handle_signal(self, signum, _frame):
        name = signal.Signals(signum).name
        log.info("Received %s — shutting down gracefully", name)
        self.running = False

    # ------------------------------------------------------------------
    # Dynamic agent loading
    # ------------------------------------------------------------------
    def _load_dynamic_agents(self):
        """Load agents from DB that are not in the hardcoded set."""
        try:
            resp = self.supabase.table("agents").select("id, workspace_path").execute()
            for agent in (resp.data or []):
                aid = agent["id"]
                wp = agent.get("workspace_path")
                if aid not in KNOWN_AGENTS and wp:
                    KNOWN_AGENTS.add(aid)
                    AGENT_WORKSPACES[aid] = wp
                    log.info("Loaded dynamic agent: %s -> %s", aid, wp)
            log.info("Agent registry: %d total (%s)", len(KNOWN_AGENTS), ", ".join(sorted(KNOWN_AGENTS)))
        except Exception:
            log.exception("Failed to load dynamic agents from DB — continuing with hardcoded set")

    # ------------------------------------------------------------------
    # Provision / Deprovision
    # ------------------------------------------------------------------
    def _provision_agent(self, agent_id: str, payload: dict) -> dict:
        """Create workspace + template files for a new agent."""
        if not AGENT_ID_RE.match(agent_id):
            raise ValueError(f"Invalid agent_id format: {agent_id}")
        if agent_id in KNOWN_AGENTS:
            raise ValueError(f"Agent already exists: {agent_id}")

        name = payload.get("name", agent_id)
        role = payload.get("role", "")
        description = payload.get("description", "")
        model = payload.get("model", "anthropic/claude-sonnet-4-20250514")

        workspace = os.path.join(EAGLE_BASE, agent_id)

        if self.dry_run:
            log.info("[DRY-RUN] Would provision agent %s at %s", agent_id, workspace)
            return {"dry_run": True, "agent_id": agent_id, "workspace": workspace}

        os.makedirs(workspace, exist_ok=True)

        created_at = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        template_vars = {
            "name": name,
            "agent_id": agent_id,
            "role": role,
            "description": description,
            "model": model,
            "created_at": created_at,
        }
        for filename, template in AGENT_FILE_TEMPLATES.items():
            path = os.path.join(workspace, filename)
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(template.format(**template_vars))

        # Register dynamically
        KNOWN_AGENTS.add(agent_id)
        AGENT_WORKSPACES[agent_id] = workspace

        log.info("Provisioned agent %s at %s", agent_id, workspace)
        return {
            "agent_id": agent_id,
            "workspace": workspace,
            "files_created": list(AGENT_FILE_TEMPLATES.keys()),
        }

    def _deprovision_agent(self, agent_id: str) -> dict:
        """Remove workspace for a non-protected agent."""
        if agent_id in PROTECTED_AGENTS:
            raise ValueError(f"Cannot deprovision protected agent: {agent_id}")
        if agent_id not in KNOWN_AGENTS:
            raise ValueError(f"Unknown agent: {agent_id}")

        workspace = AGENT_WORKSPACES.get(agent_id)

        if self.dry_run:
            log.info("[DRY-RUN] Would deprovision agent %s at %s", agent_id, workspace)
            return {"dry_run": True, "agent_id": agent_id}

        if workspace and os.path.isdir(workspace):
            shutil.rmtree(workspace)
            log.info("Removed workspace: %s", workspace)

        KNOWN_AGENTS.discard(agent_id)
        AGENT_WORKSPACES.pop(agent_id, None)

        log.info("Deprovisioned agent %s", agent_id)
        return {"agent_id": agent_id, "removed": True}

    # ------------------------------------------------------------------
    # Main entry
    # ------------------------------------------------------------------
    async def run(self):
        log.info("Sync daemon started")
        await asyncio.gather(
            self._poll_commands_loop(),
            self._sync_status_loop(),
            self._parse_sessions_loop(),
            self._push_usage_cost_loop(),
            self._sync_crons_loop(),
            # Loop F disabled — manual classification via dashboard
            # self._process_signals_loop(),
            self._fetch_signal_sources_loop(),
            # Loop H disabled — manual dispatch via dashboard
            # self._auto_dispatch_loop(),
        )
        log.info("Sync daemon stopped")

    # ------------------------------------------------------------------
    # Loop A: poll gateway_commands
    # ------------------------------------------------------------------
    async def _poll_commands_loop(self):
        while self.running:
            try:
                await self._poll_commands()
            except Exception:
                log.exception("Error in poll_commands")
            await asyncio.sleep(COMMAND_POLL_INTERVAL)

    async def _poll_commands(self):
        resp = (
            self.supabase.table("gateway_commands")
            .select("id, command, agent_id, payload")
            .eq("status", "pending")
            .order("created_at")
            .execute()
        )
        commands = resp.data or []
        if not commands:
            return

        log.info("Found %d pending command(s)", len(commands))
        for cmd in commands:
            if not self.running:
                break
            await self._process_command(cmd)

    async def _process_command(self, cmd: dict):
        cmd_id = cmd["id"]
        command = cmd["command"]
        agent_id = cmd.get("agent_id")
        payload = cmd.get("payload") or {}

        log.info("Processing command %s: %s (agent=%s)", cmd_id, command, agent_id)

        # Mark as processing (prevents duplicate pickup)
        self.supabase.table("gateway_commands").update(
            {"status": "processing"}
        ).eq("id", cmd_id).execute()

        try:
            result = await self._execute_command(command, agent_id, payload)
            self.supabase.table("gateway_commands").update({
                "status": "done",
                "result": result,
                "processed_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", cmd_id).execute()
            log.info("Command %s completed successfully", cmd_id)

            # Sync crons immediately after cron mutations
            if command in ("create_cron", "update_cron", "delete_cron", "toggle_cron"):
                await self._sync_crons()

        except Exception as exc:
            error_msg = str(exc)
            self.supabase.table("gateway_commands").update({
                "status": "error",
                "error_message": error_msg[:500],
                "processed_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", cmd_id).execute()
            log.error("Command %s failed: %s", cmd_id, error_msg)

    async def _execute_command(self, command: str, agent_id: str | None, payload: dict) -> dict:
        # Special case: restart = stop + start
        if command == "restart":
            if not agent_id:
                raise ValueError("restart requires agent_id")
            stop_result = await self._run_cli(
                COMMANDS["sleep"](agent_id, payload), label="restart:stop"
            )
            start_result = await self._run_cli(
                COMMANDS["wake"](agent_id, payload), label="restart:start"
            )
            return {"stop": stop_result, "start": start_result}

        # Provision / deprovision — handled locally
        if command == "provision_agent":
            if not agent_id:
                raise ValueError("provision_agent requires agent_id")
            return self._provision_agent(agent_id, payload)

        if command == "deprovision_agent":
            if not agent_id:
                raise ValueError("deprovision_agent requires agent_id")
            return self._deprovision_agent(agent_id)

        # Ingest signal — handled locally, INSERT into signal_items
        if command == "ingest_signal":
            return self._ingest_signal(agent_id, payload)

        # File commands — handled locally, no CLI
        if command in ("list_files", "read_file", "write_file"):
            return self._handle_file_command(command, agent_id, payload)

        if command not in COMMANDS:
            raise ValueError(f"Unknown command: {command}")

        # Validate agent_id for agent-specific commands
        if command in ("wake", "sleep") and not agent_id:
            raise ValueError(f"{command} requires agent_id")

        cli_args = COMMANDS[command](agent_id, payload)
        return await self._run_cli(cli_args, label=command)

    # ------------------------------------------------------------------
    # Ingest signal (local, no CLI)
    # ------------------------------------------------------------------
    def _ingest_signal(self, agent_id: str | None, payload: dict) -> dict:
        """Insert a signal directly into signal_items from an external source."""
        title = payload.get("title")
        if not title:
            raise ValueError("ingest_signal requires payload.title")

        det_id = str(uuid.uuid5(
            uuid.NAMESPACE_DNS,
            f"ingest-{title[:100]}-{payload.get('source_url', '')[:100]}"
        ))

        row = {
            "id": det_id,
            "title": title[:255],
            "summary": payload.get("summary", "")[:2000],
            "source_url": payload.get("source_url", ""),
            "source_platform": payload.get("source_platform", "other"),
            "subcategory": payload.get("subcategory", "seo"),
            "impact_level": payload.get("impact_level", "moyen"),
            "relevance_score": payload.get("relevance_score", 50),
            "status": "raw",
            "collected_by": agent_id,
        }

        if self.dry_run:
            log.info("[DRY-RUN] Would ingest signal: %s", title)
            return {"dry_run": True, "signal_id": det_id}

        self.supabase.table("signal_items").upsert(row, on_conflict="id").execute()
        log.info("Ingested signal: %s (id=%s)", title, det_id)
        return {"signal_id": det_id, "title": title, "status": "raw"}

    # ------------------------------------------------------------------
    # File commands (local filesystem, no CLI)
    # ------------------------------------------------------------------
    def _handle_file_command(self, command: str, agent_id: str | None, payload: dict) -> dict:
        if not agent_id or agent_id not in AGENT_WORKSPACES:
            raise ValueError(f"Invalid agent_id for file command: {agent_id}")

        workspace = AGENT_WORKSPACES[agent_id]

        if command == "list_files":
            return self._list_files(workspace)
        elif command == "read_file":
            filename = payload.get("filename")
            if not filename:
                raise ValueError("read_file requires payload.filename")
            return self._read_file(workspace, filename)
        elif command == "write_file":
            filename = payload.get("filename")
            content = payload.get("content")
            if not filename or content is None:
                raise ValueError("write_file requires payload.filename and payload.content")
            return self._write_file(workspace, filename, content)
        else:
            raise ValueError(f"Unknown file command: {command}")

    def _validate_filename(self, filename: str) -> None:
        """Reject path traversal and files not in ALLOWED_FILES."""
        if "/" in filename or "\\" in filename or ".." in filename:
            raise ValueError(f"Invalid filename (path traversal): {filename}")
        if filename not in ALLOWED_FILES:
            raise ValueError(f"File not allowed: {filename}. Allowed: {', '.join(sorted(ALLOWED_FILES))}")

    def _list_files(self, workspace: str) -> dict:
        if not os.path.isdir(workspace):
            raise ValueError(f"Workspace not found: {workspace}")
        files = []
        for f in sorted(os.listdir(workspace)):
            if f.endswith(".md") and f in ALLOWED_FILES:
                path = os.path.join(workspace, f)
                stat = os.stat(path)
                files.append({
                    "filename": f,
                    "size": stat.st_size,
                    "modified": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
                })
        log.info("list_files: %s → %d files", workspace, len(files))
        return {"files": files}

    def _read_file(self, workspace: str, filename: str) -> dict:
        self._validate_filename(filename)
        path = os.path.join(workspace, filename)
        if not os.path.isfile(path):
            raise ValueError(f"File not found: {filename}")
        with open(path, "r", encoding="utf-8") as fh:
            content = fh.read()
        log.info("read_file: %s/%s (%d bytes)", workspace, filename, len(content))
        return {"filename": filename, "content": content, "size": len(content)}

    def _write_file(self, workspace: str, filename: str, content: str) -> dict:
        self._validate_filename(filename)
        path = os.path.join(workspace, filename)
        if self.dry_run:
            log.info("[DRY-RUN] Would write %d bytes to %s", len(content), path)
            return {"dry_run": True, "filename": filename, "size": len(content)}
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(content)
        log.info("write_file: %s/%s (%d bytes)", workspace, filename, len(content))
        return {"filename": filename, "size": len(content), "written": True}

    async def _run_cli(self, args: list[str], *, label: str = "") -> dict:
        cmd_str = " ".join(args)

        if self.dry_run:
            log.info("[DRY-RUN] Would execute: %s", cmd_str)
            return {"dry_run": True, "command": cmd_str}

        log.info("Executing: %s", cmd_str)

        proc = await asyncio.create_subprocess_exec(
            *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        try:
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(), timeout=COMMAND_TIMEOUT
            )
        except asyncio.TimeoutError:
            proc.kill()
            await proc.communicate()
            raise TimeoutError(f"Command timed out after {COMMAND_TIMEOUT}s: {cmd_str}")

        stdout_str = stdout.decode().strip()
        stderr_str = stderr.decode().strip()

        if proc.returncode != 0:
            raise RuntimeError(
                f"CLI exited with code {proc.returncode}: {stderr_str or stdout_str}"
            )

        # Try to parse JSON output
        try:
            return json.loads(stdout_str)
        except (json.JSONDecodeError, ValueError):
            return {"output": stdout_str, "stderr": stderr_str}

    # ------------------------------------------------------------------
    # Loop B: sync agent status from OpenClaw health
    # ------------------------------------------------------------------
    async def _sync_status_loop(self):
        while self.running:
            try:
                await self._sync_agent_status()
            except Exception:
                log.exception("Error in sync_agent_status")
            await asyncio.sleep(STATUS_SYNC_INTERVAL)

    async def _sync_agent_status(self):
        if self.dry_run:
            log.info("[DRY-RUN] Would run: openclaw health --json")
            return

        try:
            proc = await asyncio.create_subprocess_exec(
                "openclaw", "health", "--json",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(), timeout=COMMAND_TIMEOUT
            )
        except asyncio.TimeoutError:
            log.warning("Health check timed out")
            return
        except FileNotFoundError:
            log.warning("openclaw CLI not found — skipping status sync")
            return

        if proc.returncode != 0:
            log.warning("Health check failed (exit %d): %s",
                        proc.returncode, stderr.decode().strip())
            return

        try:
            health = json.loads(stdout.decode())
        except (json.JSONDecodeError, ValueError):
            log.warning("Could not parse health output as JSON")
            return

        # Parse agents from health response
        # Format: list of {agentId, heartbeat, sessions, ...}
        # No explicit "status" field — derive from sessions recency
        raw_agents = health.get("agents", [])
        if not raw_agents:
            log.debug("No agent data in health response")
            return

        now_ts = int(datetime.now(timezone.utc).timestamp() * 1000)
        now_iso = datetime.now(timezone.utc).isoformat()
        updated = 0

        for info in raw_agents:
            agent_id = info.get("agentId")
            if not agent_id or agent_id not in KNOWN_AGENTS:
                continue

            # Derive status from session recency
            # If most recent session was active in last 5 min → working
            # Otherwise → idle
            sessions = info.get("sessions", {})
            recent = sessions.get("recent", [])
            db_status = "idle"
            last_action_at = None

            if recent:
                most_recent = recent[0]
                age_ms = most_recent.get("age", float("inf"))
                updated_at_ms = most_recent.get("updatedAt", 0)
                last_action_at = datetime.fromtimestamp(
                    updated_at_ms / 1000, tz=timezone.utc
                ).isoformat()

                # Active in last 5 minutes → working
                if age_ms < 300_000:
                    db_status = "working"

            update_data = {
                "status": db_status,
                "updated_at": now_iso,
            }
            if last_action_at:
                update_data["last_action_at"] = last_action_at

            self.supabase.table("agents").update(
                update_data
            ).eq("id", agent_id).execute()
            updated += 1

        if updated:
            log.info("Synced status for %d agent(s)", updated)

    # ------------------------------------------------------------------
    # Cursor persistence for JSONL parsing
    # ------------------------------------------------------------------
    def _load_cursors(self) -> dict:
        try:
            with open(CURSOR_FILE, "r") as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {}

    def _save_cursors(self, cursors: dict):
        with open(CURSOR_FILE, "w") as f:
            json.dump(cursors, f)

    def _load_signal_cursors(self) -> dict:
        try:
            with open(SIGNAL_CURSOR_FILE, "r") as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {}

    def _save_signal_cursors(self, cursors: dict):
        with open(SIGNAL_CURSOR_FILE, "w") as f:
            json.dump(cursors, f)

    # ------------------------------------------------------------------
    # Loop C: parse sessions JSONL → agent_actions (60s)
    # ------------------------------------------------------------------
    async def _parse_sessions_loop(self):
        while self.running:
            try:
                await self._parse_sessions()
            except Exception:
                log.exception("Error in parse_sessions")
            await asyncio.sleep(JSONL_PARSE_INTERVAL)

    async def _parse_sessions(self):
        if self.dry_run:
            log.info("[DRY-RUN] Would parse session JSONL files")
            return

        if not os.path.isdir(SESSIONS_BASE):
            log.debug("Sessions base not found: %s", SESSIONS_BASE)
            return

        cursors = self._load_cursors()
        signal_cursors = self._load_signal_cursors()
        total_inserted = 0
        total_signals = 0

        for agent_id in sorted(KNOWN_AGENTS):
            sessions_dir = os.path.join(SESSIONS_BASE, agent_id, "sessions")
            if not os.path.isdir(sessions_dir):
                continue

            agent_cursors = cursors.get(agent_id, {})
            agent_signal_cursors = signal_cursors.get(agent_id, {})
            agent_inserted = 0

            for fname in os.listdir(sessions_dir):
                if not fname.endswith(".jsonl"):
                    continue
                # Skip deleted/reset sessions
                if fname.startswith(".deleted.") or fname.startswith(".reset."):
                    continue

                session_id = fname[:-6]  # strip .jsonl
                fpath = os.path.join(sessions_dir, fname)
                last_line = agent_cursors.get(session_id, 0)

                try:
                    actions = self._extract_actions_from_jsonl(
                        fpath, agent_id, session_id, last_line
                    )
                except Exception:
                    log.exception("Failed to parse %s", fpath)
                    continue

                if actions:
                    # Batch insert
                    try:
                        self.supabase.table("agent_actions").insert(actions).execute()
                        new_cursor = last_line + len(actions)
                        agent_cursors[session_id] = new_cursor
                        agent_inserted += len(actions)
                    except Exception:
                        log.exception("Failed to insert %d actions for %s/%s",
                                      len(actions), agent_id, session_id)

                # Extract signals for signal-producing agents (independent of actions)
                if agent_id in SIGNAL_AGENTS:
                    signal_last_line = agent_signal_cursors.get(session_id, 0)
                    try:
                        new_signals = self._extract_signals_from_session(
                            fpath, agent_id, session_id, signal_last_line
                        )
                    except Exception:
                        log.exception("Failed to extract signals from %s", fpath)
                        new_signals = []

                    if new_signals:
                        try:
                            self.supabase.table("signal_items").upsert(
                                new_signals, on_conflict="id"
                            ).execute()
                            total_signals += len(new_signals)
                        except Exception:
                            log.exception("Failed to upsert %d signals for %s/%s",
                                          len(new_signals), agent_id, session_id)

                    # Update signal cursor to current file length
                    try:
                        with open(fpath, "r") as f:
                            line_count = sum(1 for _ in f)
                        agent_signal_cursors[session_id] = line_count
                    except Exception:
                        pass

            if agent_inserted:
                log.info("Parsed %d actions from agent %s", agent_inserted, agent_id)

            cursors[agent_id] = agent_cursors
            signal_cursors[agent_id] = agent_signal_cursors
            total_inserted += agent_inserted

        self._save_cursors(cursors)
        self._save_signal_cursors(signal_cursors)
        if total_inserted:
            log.info("Total: inserted %d agent_actions", total_inserted)
            # Aggregate costs per agent after new actions
            await self._aggregate_agent_costs()
        if total_signals:
            log.info("Total: upserted %d signal_items", total_signals)

    def _extract_actions_from_jsonl(
        self, fpath: str, agent_id: str, session_id: str, skip_lines: int
    ) -> list[dict]:
        """Read JSONL file from skip_lines offset, extract assistant messages with tool calls."""
        actions = []
        line_num = 0

        with open(fpath, "r", encoding="utf-8") as f:
            for raw_line in f:
                line_num += 1
                if line_num <= skip_lines:
                    continue

                raw_line = raw_line.strip()
                if not raw_line:
                    continue

                try:
                    entry = json.loads(raw_line)
                except json.JSONDecodeError:
                    continue

                if entry.get("type") != "message":
                    continue

                msg = entry.get("message", {})
                if msg.get("role") != "assistant":
                    continue

                usage = msg.get("usage", {})
                if not usage:
                    continue

                content = msg.get("content", [])
                tool_calls = [c for c in content if c.get("type") == "toolCall"]
                if not tool_calls:
                    continue

                # Use first tool call as the action type
                first_tool = tool_calls[0]
                tool_name = first_tool.get("name", "unknown")

                # Build description: "read + bash + write (+2 more) | {args preview}"
                tool_names = [c.get("name", "?") for c in tool_calls]
                shown = tool_names[:3]
                desc_parts = " + ".join(shown)
                if len(tool_names) > 3:
                    desc_parts += f" (+{len(tool_names) - 3} more)"
                args_preview = json.dumps(first_tool.get("arguments", {}))
                if len(args_preview) > 120:
                    args_preview = args_preview[:120] + "..."
                description = f"{desc_parts} | {args_preview}"

                cost_data = usage.get("cost", {})
                timestamp = entry.get("timestamp", datetime.now(timezone.utc).isoformat())

                actions.append({
                    "agent_id": agent_id,
                    "action_type": tool_name,
                    "description": description,
                    "tokens_used": usage.get("totalTokens", 0),
                    "cost": cost_data.get("total", 0),
                    "model_used": msg.get("model"),
                    "session_id": session_id,
                    "result": "success",
                    "created_at": timestamp,
                })

        return actions

    # ------------------------------------------------------------------
    # Signal extraction from sessions (called in Loop C for research/main)
    # ------------------------------------------------------------------
    def _extract_signals_from_session(
        self, fpath: str, agent_id: str, session_id: str, skip_lines: int
    ) -> list[dict]:
        """Extract signal items from tool_calls in JSONL sessions for signal-producing agents."""
        signals = []
        line_num = 0
        tool_call_index = 0
        last_assistant_text = ""

        with open(fpath, "r", encoding="utf-8") as f:
            for raw_line in f:
                line_num += 1
                if line_num <= skip_lines:
                    continue

                raw_line = raw_line.strip()
                if not raw_line:
                    continue

                try:
                    entry = json.loads(raw_line)
                except json.JSONDecodeError:
                    continue

                if entry.get("type") != "message":
                    continue

                msg = entry.get("message", {})
                if msg.get("role") != "assistant":
                    continue

                content = msg.get("content", [])

                # Collect text blocks as potential summary
                text_parts = []
                for block in content:
                    if block.get("type") == "text":
                        text_parts.append(block.get("text", ""))

                tool_calls = [c for c in content if c.get("type") == "toolCall"]
                if not tool_calls:
                    if text_parts:
                        last_assistant_text = " ".join(text_parts)
                    continue

                for tc in tool_calls:
                    tool_name = tc.get("name", "")
                    if tool_name not in SIGNAL_TOOL_NAMES:
                        tool_call_index += 1
                        continue

                    args = tc.get("arguments", {})
                    args_str = json.dumps(args) if isinstance(args, dict) else str(args)

                    # Extract URL from arguments
                    url = self._extract_url_from_args(args, args_str)

                    # For web_search, use query as title even without URL
                    if not url and tool_name in ("web_search", "brave_search"):
                        query = args.get("query") or args.get("search_query") or ""
                        if not query:
                            tool_call_index += 1
                            continue
                        url = ""
                        title = query[:255]
                        platform = "other"
                    elif not url:
                        tool_call_index += 1
                        continue
                    else:
                        # Extract title from arguments or tool result
                        title = self._extract_title_from_args(args, tool_name)
                        if not title:
                            title = url[:120]
                        # Platform from domain
                        platform = self._platform_from_url(url)

                    # Summary from following assistant text or args
                    summary = last_assistant_text[:500] if last_assistant_text else args_str[:500]

                    # Deterministic UUID
                    det_id = str(uuid.uuid5(
                        uuid.NAMESPACE_DNS,
                        f"signal-{session_id}-{tool_call_index}"
                    ))

                    signals.append({
                        "id": det_id,
                        "title": title[:255],
                        "summary": summary,
                        "source_url": url[:2000],
                        "source_platform": platform,
                        "subcategory": "knowledge",
                        "impact_level": "moyen",
                        "relevance_score": 50,
                        "status": "raw",
                        "collected_by": agent_id,
                    })

                    tool_call_index += 1

                if text_parts:
                    last_assistant_text = " ".join(text_parts)

        return signals

    def _extract_url_from_args(self, args: dict, args_str: str) -> str | None:
        """Try to extract a URL from tool call arguments."""
        # Direct URL fields
        for key in ("url", "uri", "href", "link", "source"):
            if key in args and isinstance(args[key], str) and args[key].startswith("http"):
                return args[key]

        # Search query — not a URL, skip
        if "query" in args and "url" not in args_str.lower():
            return None

        # Bash command with curl/wget
        if "command" in args:
            cmd = args["command"]
            if isinstance(cmd, str) and ("curl" in cmd or "wget" in cmd):
                url_match = re.search(r'https?://[^\s"\']+', cmd)
                if url_match:
                    return url_match.group(0)

        # Fallback: find URL anywhere in args
        url_match = re.search(r'https?://[^\s"\'<>]+', args_str)
        if url_match:
            return url_match.group(0)

        return None

    def _extract_title_from_args(self, args: dict, tool_name: str) -> str | None:
        """Try to extract a title from tool call arguments."""
        for key in ("title", "name", "query", "search_query"):
            if key in args and isinstance(args[key], str):
                return args[key]
        return None

    def _platform_from_url(self, url: str) -> str:
        """Map URL domain to platform name."""
        try:
            hostname = urlparse(url).hostname or ""
            hostname = hostname.lstrip("www.")
            for domain, platform in DOMAIN_PLATFORM_MAP.items():
                if domain in hostname:
                    return platform
        except Exception:
            pass
        return "other"

    # ------------------------------------------------------------------
    # Per-agent cost aggregation (called after JSONL parse)
    # ------------------------------------------------------------------
    async def _aggregate_agent_costs(self):
        """Sum tokens+cost from agent_actions per agent for today, UPSERT into cost_entries."""
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        try:
            resp = self.supabase.table("agent_actions") \
                .select("agent_id, tokens_used, cost, model_used") \
                .gte("created_at", f"{today}T00:00:00Z") \
                .execute()
        except Exception:
            log.exception("Failed to query agent_actions for cost aggregation")
            return

        rows = resp.data or []
        if not rows:
            return

        # Aggregate per agent
        agg: dict[str, dict] = {}
        for r in rows:
            aid = r.get("agent_id")
            if not aid:
                continue
            if aid not in agg:
                agg[aid] = {"tokens": 0, "cost": 0.0, "model": None}
            agg[aid]["tokens"] += r.get("tokens_used", 0) or 0
            agg[aid]["cost"] += r.get("cost", 0) or 0
            if r.get("model_used"):
                agg[aid]["model"] = r["model_used"]

        upserted = 0
        for aid, data in agg.items():
            try:
                det_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"agent-cost-{aid}-{today}"))
                self.supabase.table("cost_entries").upsert({
                    "id": det_id,
                    "agent_id": aid,
                    "cost_type": "variable",
                    "category": "api_tokens",
                    "amount": round(data["cost"], 6),
                    "currency": "USD",
                    "tokens_used": data["tokens"],
                    "model_used": data["model"],
                    "description": f"Agent {aid} daily usage",
                    "date": today,
                }, on_conflict="id").execute()
                upserted += 1
            except Exception:
                log.exception("Failed to upsert cost entry for agent %s", aid)

        if upserted:
            log.info("Aggregated costs for %d agent(s) on %s", upserted, today)

    # ------------------------------------------------------------------
    # Loop D: usage-cost → cost_entries (5min)
    # ------------------------------------------------------------------
    async def _push_usage_cost_loop(self):
        while self.running:
            try:
                await self._push_usage_cost()
            except Exception:
                log.exception("Error in push_usage_cost")
            await asyncio.sleep(USAGE_COST_INTERVAL)

    async def _push_usage_cost(self):
        if self.dry_run:
            log.info("[DRY-RUN] Would run: openclaw gateway usage-cost --json")
            return

        try:
            proc = await asyncio.create_subprocess_exec(
                "openclaw", "gateway", "usage-cost", "--json",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(), timeout=COMMAND_TIMEOUT
            )
        except asyncio.TimeoutError:
            log.warning("usage-cost command timed out")
            return
        except FileNotFoundError:
            log.warning("openclaw CLI not found — skipping usage-cost sync")
            return

        if proc.returncode != 0:
            log.warning("usage-cost failed (exit %d): %s",
                        proc.returncode, stderr.decode().strip())
            return

        try:
            data = json.loads(stdout.decode())
        except (json.JSONDecodeError, ValueError):
            log.warning("Could not parse usage-cost output as JSON")
            return

        daily = data.get("daily", [])
        if not daily:
            log.debug("No daily usage data")
            return

        upserted = 0
        for day in daily:
            date_str = day.get("date")
            if not date_str:
                continue

            try:
                # Deterministic UUID from date string
                det_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"openclaw-usage-{date_str}"))
                self.supabase.table("cost_entries").upsert({
                    "id": det_id,
                    "agent_id": None,
                    "cost_type": "variable",
                    "category": "api_tokens",
                    "amount": round(day.get("totalCost", 0), 4),
                    "currency": "USD",
                    "tokens_used": day.get("totalTokens", 0),
                    "description": "OpenClaw global usage",
                    "date": date_str,
                }, on_conflict="id").execute()
                upserted += 1
            except Exception:
                log.exception("Failed to upsert cost entry for %s", date_str)

        if upserted:
            log.info("Upserted %d cost entries", upserted)


    # ------------------------------------------------------------------
    # Loop E: sync crons → cron_schedule (5min)
    # ------------------------------------------------------------------
    async def _sync_crons_loop(self):
        while self.running:
            try:
                await self._sync_crons()
            except Exception:
                log.exception("Error in sync_crons")
            await asyncio.sleep(CRON_SYNC_INTERVAL)

    async def _sync_crons(self):
        if self.dry_run:
            log.info("[DRY-RUN] Would run: openclaw cron list --json")
            return

        try:
            proc = await asyncio.create_subprocess_exec(
                "openclaw", "cron", "list", "--json",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(), timeout=COMMAND_TIMEOUT
            )
        except asyncio.TimeoutError:
            log.warning("cron list timed out")
            return
        except FileNotFoundError:
            log.warning("openclaw CLI not found — skipping cron sync")
            return

        if proc.returncode != 0:
            log.warning("cron list failed (exit %d): %s",
                        proc.returncode, stderr.decode().strip())
            return

        try:
            data = json.loads(stdout.decode())
        except (json.JSONDecodeError, ValueError):
            log.warning("Could not parse cron list output as JSON")
            return

        crons = data if isinstance(data, list) else (data.get("crons") or data.get("jobs") or [])
        if not crons:
            log.debug("No crons in list output")
            return

        upserted = 0
        seen_ids = set()
        for cron in crons:
            cron_id = cron.get("id") or cron.get("cronId")
            if not cron_id:
                continue

            seen_ids.add(cron_id)
            agent_id = cron.get("agentId") or cron.get("agent_id")
            schedule = cron.get("schedule", {})
            state = cron.get("state", {})

            det_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"openclaw-cron-{cron_id}"))

            # Validate period against DB CHECK constraint
            VALID_PERIODS = {"morning", "day", "evening", "night", "every_15min", "daily", "weekly"}
            raw_period = schedule.get("kind") if isinstance(schedule, dict) else None
            period = raw_period if raw_period in VALID_PERIODS else None

            # Validate wake_mode against DB CHECK constraint
            VALID_WAKE_MODES = {"now", "next-heartbeat", "isolated"}
            raw_wake = cron.get("wakeMode")
            wake_mode = raw_wake if raw_wake in VALID_WAKE_MODES else None

            row = {
                "id": det_id,
                "agent_id": agent_id or None,
                "cron_expression": schedule.get("expr", "") if isinstance(schedule, dict) else str(schedule),
                "time_label": cron.get("name", cron_id),
                "period": period,
                "task_description": cron.get("description"),
                "gateway_message": cron.get("gatewayMessage"),
                "wake_mode": wake_mode,
                "deliver_telegram": cron.get("deliverTelegram", False),
                "enabled": cron.get("enabled", True),
                "last_run_at": (
                    datetime.fromtimestamp(state["lastRunAtMs"] / 1000, tz=timezone.utc).isoformat()
                    if state.get("lastRunAtMs") else None
                ),
                "last_result": state.get("lastRunStatus") or state.get("lastStatus"),
            }

            try:
                self.supabase.table("cron_schedule").upsert(row, on_conflict="id").execute()
                upserted += 1
            except Exception:
                log.exception("Failed to upsert cron %s", cron_id)

        if upserted:
            log.info("Synced %d cron(s) to cron_schedule", upserted)

    # ------------------------------------------------------------------
    # Loop F: auto-classify raw signals (5min)
    # ------------------------------------------------------------------
    async def _process_signals_loop(self):
        while self.running:
            try:
                await self._process_raw_signals()
            except Exception:
                log.exception("Error in process_signals")
            await asyncio.sleep(SIGNAL_PROCESS_INTERVAL)

    async def _process_raw_signals(self):
        if self.dry_run:
            log.info("[DRY-RUN] Would process raw signals")
            return

        try:
            resp = self.supabase.table("signal_items") \
                .select("*") \
                .eq("status", "raw") \
                .order("created_at") \
                .limit(20) \
                .execute()
        except Exception:
            log.exception("Failed to query raw signals")
            return

        signals = resp.data or []
        if not signals:
            return

        rules = SIGNAL_CLASSIFICATION_RULES
        updated = 0

        for sig in signals:
            text = f"{sig.get('title', '')} {sig.get('summary', '')}".lower()

            # Classify by keyword matching → internal tag → DB subcategory
            tag = None
            for t, keywords in rules["tags"].items():
                if any(kw in text for kw in keywords):
                    tag = t
                    break

            subcategory = SIGNAL_TAG_TO_SUBCATEGORY.get(tag, "knowledge") if tag else "knowledge"
            impact_level = rules["impact_for_tag"].get(tag, "faible") if tag else "faible"
            relevance_score = rules["score_for_tag"].get(tag, 40) if tag else 40

            try:
                self.supabase.table("signal_items").update({
                    "status": "tagged",
                    "subcategory": subcategory,
                    "impact_level": impact_level,
                    "relevance_score": relevance_score,
                }).eq("id", sig["id"]).execute()
                updated += 1
            except Exception:
                log.exception("Failed to update signal %s", sig["id"])

        if updated:
            log.info("Classified %d raw signals → tagged", updated)

    # ------------------------------------------------------------------
    # Loop H: auto-dispatch tagged signals → handover_messages + wake
    # ------------------------------------------------------------------

    async def _auto_dispatch_loop(self):
        while self.running:
            try:
                await self._auto_dispatch_signals()
            except Exception:
                log.exception("Error in auto_dispatch")
            await asyncio.sleep(AUTO_DISPATCH_INTERVAL)

    async def _auto_dispatch_signals(self):
        if self.dry_run:
            log.info("[DRY-RUN] Would auto-dispatch signals")
            return

        # Fetch tagged signals with high relevance score, not yet dispatched
        try:
            resp = self.supabase.table("signal_items") \
                .select("*") \
                .eq("status", "tagged") \
                .gte("relevance_score", AUTO_DISPATCH_MIN_SCORE) \
                .order("relevance_score", desc=True) \
                .limit(10) \
                .execute()
        except Exception:
            log.exception("Failed to query tagged signals for dispatch")
            return

        signals = resp.data or []
        if not signals:
            return

        dispatched = 0
        for sig in signals:
            subcategory = sig.get("subcategory", "knowledge")
            routing = DISPATCH_ROUTING.get(subcategory, ("research", "architect"))
            target_agent = routing[0]
            priority = IMPACT_TO_PRIORITY.get(sig.get("impact_level", "moyen"), "normal")

            # Build handover brief
            brief = (
                f"Signal détecté — {sig.get('impact_level', 'moyen').upper()} impact\n\n"
                f"**{sig.get('title', 'Sans titre')}**\n\n"
                f"{sig.get('summary', '')}\n\n"
                f"Source: {sig.get('source_url', 'N/A')} ({sig.get('source_platform', 'unknown')})\n"
                f"Catégorie: {subcategory} | Score: {sig.get('relevance_score', 0)}"
            )

            try:
                # 1. INSERT handover_message (return id)
                ho_resp = self.supabase.table("handover_messages").insert({
                    "from_agent": "monitor",
                    "to_agent": target_agent,
                    "content": brief,
                    "priority": priority,
                    "status": "sent",
                    "related_signal_id": sig["id"],
                    "data": {
                        "signal": {
                            "id": sig["id"],
                            "title": sig.get("title"),
                            "summary": sig.get("summary"),
                            "source_url": sig.get("source_url"),
                            "source_platform": sig.get("source_platform"),
                            "subcategory": subcategory,
                            "impact_level": sig.get("impact_level"),
                            "relevance_score": sig.get("relevance_score"),
                        },
                        "routing": {
                            "primary": routing[0],
                            "fallback": routing[1],
                        },
                    },
                }).execute()
                ho_id = ho_resp.data[0]["id"] if ho_resp.data else "UNKNOWN"

                # 2. UPDATE signal → dispatched
                self.supabase.table("signal_items").update({
                    "status": "dispatched",
                    "dispatched_to": target_agent,
                    "dispatched_at": datetime.now(timezone.utc).isoformat(),
                }).eq("id", sig["id"]).execute()

                # 3. INSERT gateway_command → wake target agent with handover context
                wake_message = (
                    f"[HANDOVER {ho_id}] Tu as reçu un signal à traiter.\n\n"
                    f"Titre: {sig.get('title', 'Sans titre')}\n"
                    f"Résumé: {sig.get('summary', '')[:500]}\n"
                    f"Source: {sig.get('source_url', 'N/A')}\n"
                    f"Impact: {sig.get('impact_level', 'moyen')} | Catégorie: {subcategory}\n\n"
                    f"Instructions:\n"
                    f"1. Lis le fichier HANDOVER.md dans ton workspace pour le protocole complet\n"
                    f"2. Consulte la source URL si disponible\n"
                    f"3. Produis un livrable adapté à ton rôle\n"
                    f"4. Quand terminé, exécute:\n"
                    f"   /root/sync-daemon/venv/bin/python3 /root/sync-daemon/handover-cli.py complete {ho_id} \"<ton résumé du travail effectué>\""
                )
                self.supabase.table("gateway_commands").insert({
                    "command": "wake",
                    "agent_id": target_agent,
                    "payload": {
                        "signal_id": sig["id"],
                        "title": sig.get("title"),
                        "summary": sig.get("summary"),
                        "source_url": sig.get("source_url"),
                        "handover_id": ho_id,
                        "message": wake_message,
                    },
                }).execute()

                dispatched += 1
            except Exception:
                log.exception("Failed to dispatch signal %s", sig["id"])

        if dispatched:
            log.info("Auto-dispatched %d signal(s) → agents", dispatched)

    # ------------------------------------------------------------------
    # Loop G: fetch signal_sources → signal_items (10min)
    # ------------------------------------------------------------------
    async def _fetch_signal_sources_loop(self):
        while self.running:
            try:
                await self._fetch_signal_sources()
            except Exception:
                log.exception("Error in fetch_signal_sources")
            await asyncio.sleep(SOURCE_FETCH_INTERVAL)

    async def _fetch_signal_sources(self):
        if self.dry_run:
            log.info("[DRY-RUN] Would fetch signal sources")
            return

        try:
            resp = self.supabase.table("signal_sources") \
                .select("*") \
                .eq("enabled", True) \
                .execute()
        except Exception:
            log.exception("Failed to query signal_sources")
            return

        sources = resp.data or []
        if not sources:
            return

        cursors = self._load_source_cursors()
        total = 0

        for source in sources:
            source_id = source.get("id", "")
            source_type = source.get("source_type", "")
            identifier = source.get("source_identifier", "")
            subcategory = source.get("subcategory", "knowledge")
            settings = source.get("settings") or {}
            # Merge table-level filter columns into settings dict
            for col in ("min_views", "min_likes", "min_comments", "min_impressions"):
                val = source.get(col)
                if val and col not in settings:
                    settings[col] = val
            name = source.get("name", identifier)

            if not identifier:
                continue

            try:
                items = self._fetch_source(source_type, identifier, subcategory, settings)
            except Exception:
                log.exception("Failed to fetch source %s (%s: %s)", name, source_type, identifier)
                continue

            if not items:
                continue

            try:
                self.supabase.table("signal_items").upsert(
                    items, on_conflict="id"
                ).execute()
                total += len(items)
                cursors[source_id] = datetime.now(timezone.utc).isoformat()
            except Exception:
                log.exception("Failed to upsert %d items from source %s", len(items), name)

        self._save_source_cursors(cursors)
        if total:
            log.info("Loop G: fetched %d signal_items from %d source(s)", total, len(sources))

    def _fetch_source(self, source_type: str, identifier: str, subcategory: str,
                      settings: dict | None = None) -> list[dict]:
        """Dispatch to the right fetcher based on source_type."""
        settings = settings or {}
        # Twitter accepts settings for engagement filters
        if source_type == "twitter_handle":
            return self._fetch_twitter(identifier, subcategory, settings)

        fetchers = {
            "rss_feed": self._fetch_rss,
            "reddit_subreddit": self._fetch_reddit,
            "youtube_channel": self._fetch_youtube,
            "bodacc_filter": self._fetch_bodacc,
            "custom_api": self._fetch_custom_api,
            "linkedin_company": self._fetch_linkedin,
            "crunchbase_company": self._fetch_crunchbase,
        }
        fetcher = fetchers.get(source_type)
        if not fetcher:
            log.warning("Unknown source_type: %s", source_type)
            return []
        return fetcher(identifier, subcategory)

    # -- Source cursor persistence ------------------------------------------

    def _load_source_cursors(self) -> dict:
        try:
            with open(SOURCE_CURSOR_FILE, "r") as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {}

    def _save_source_cursors(self, cursors: dict):
        with open(SOURCE_CURSOR_FILE, "w") as f:
            json.dump(cursors, f)

    # -- Direct fetchers (0€) -----------------------------------------------

    @staticmethod
    def _strip_html(text: str) -> str:
        """Remove HTML tags and decode common entities."""
        text = re.sub(r"<[^>]+>", " ", text)
        text = text.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"').replace("&#39;", "'")
        return re.sub(r"\s+", " ", text).strip()

    def _curl_get(self, url: str, *, timeout: int = 15, user_agent: str = "sync-daemon/1.0") -> str | None:
        """Run curl and return stdout, or None on failure."""
        try:
            result = subprocess.run(
                ["curl", "-s", "-L", "--max-time", str(timeout),
                 "-A", user_agent, url],
                capture_output=True, text=True, timeout=timeout + 5,
            )
            if result.returncode != 0:
                log.warning("curl failed for %s (exit %d)", url, result.returncode)
                return None
            return result.stdout
        except subprocess.TimeoutExpired:
            log.warning("curl timed out for %s", url)
            return None
        except Exception:
            log.exception("curl error for %s", url)
            return None

    def _fetch_rss(self, identifier: str, subcategory: str) -> list[dict]:
        """Fetch RSS/Atom feed via curl + xml.etree."""
        body = self._curl_get(identifier)
        if not body:
            return []

        items = []
        try:
            root = ET.fromstring(body)
        except ET.ParseError:
            log.warning("Invalid XML from RSS feed: %s", identifier)
            return []

        # RSS 2.0: <channel><item>
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        rss_items = root.findall(".//item")
        if rss_items:
            for item in rss_items[:3]:
                title = (item.findtext("title") or "").strip()
                link = (item.findtext("link") or "").strip()
                desc = self._strip_html((item.findtext("description") or ""))
                if not title:
                    continue
                det_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"rss-{identifier}-{link or title}"))
                items.append(self._make_signal(det_id, title, desc, link, "rss", subcategory))
        else:
            # Atom: <entry>
            entries = root.findall("atom:entry", ns) or root.findall("{http://www.w3.org/2005/Atom}entry")
            for entry in entries[:3]:
                title = (entry.findtext("atom:title", namespaces=ns)
                         or entry.findtext("{http://www.w3.org/2005/Atom}title") or "").strip()
                link_el = (entry.find("atom:link", ns)
                           or entry.find("{http://www.w3.org/2005/Atom}link"))
                link = link_el.get("href", "") if link_el is not None else ""
                summary = self._strip_html(entry.findtext("atom:summary", namespaces=ns)
                           or entry.findtext("{http://www.w3.org/2005/Atom}summary") or "")
                if not title:
                    continue
                det_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"rss-{identifier}-{link or title}"))
                items.append(self._make_signal(det_id, title, summary, link, "rss", subcategory))

        log.info("RSS %s: %d items", identifier[:60], len(items))
        return items

    def _fetch_reddit(self, identifier: str, subcategory: str) -> list[dict]:
        """Fetch Reddit subreddit new posts via public JSON API."""
        sub = identifier.strip("/").split("/")[-1]  # handle "r/startups" or just "startups"
        url = f"https://www.reddit.com/r/{sub}/new.json?limit=3"
        body = self._curl_get(url, user_agent="sync-daemon/1.0 (signal monitoring)")
        if not body:
            return []

        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            log.warning("Invalid JSON from Reddit: %s", sub)
            return []

        items = []
        children = data.get("data", {}).get("children", [])
        for child in children:
            post = child.get("data", {})
            post_id = post.get("id", "")
            title = post.get("title", "").strip()
            selftext = post.get("selftext", "")[:500]
            permalink = post.get("permalink", "")
            link = f"https://www.reddit.com{permalink}" if permalink else post.get("url", "")
            if not title:
                continue
            det_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"reddit-{sub}-{post_id}"))
            items.append(self._make_signal(det_id, title, selftext, link, "reddit", subcategory))

        log.info("Reddit r/%s: %d items", sub, len(items))
        return items

    def _fetch_youtube(self, identifier: str, subcategory: str) -> list[dict]:
        """Fetch YouTube channel RSS feed (native Atom)."""
        channel_id = identifier.strip()
        url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
        body = self._curl_get(url)
        if not body:
            return []

        try:
            root = ET.fromstring(body)
        except ET.ParseError:
            log.warning("Invalid XML from YouTube feed: %s", channel_id)
            return []

        ns = {"atom": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015"}
        items = []
        entries = root.findall("atom:entry", ns)
        for entry in entries[:3]:
            title = (entry.findtext("atom:title", namespaces=ns) or "").strip()
            video_id = (entry.findtext("yt:videoId", namespaces=ns) or "").strip()
            link_el = entry.find("atom:link", ns)
            link = link_el.get("href", "") if link_el is not None else ""
            summary = (entry.findtext("atom:summary", namespaces=ns)
                       or entry.findtext("{http://search.yahoo.com/mrss/}group/{http://search.yahoo.com/mrss/}description")
                       or "").strip()
            if not title:
                continue
            det_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"youtube-{channel_id}-{video_id or title}"))
            items.append(self._make_signal(det_id, title, summary, link, "youtube", subcategory))

        log.info("YouTube %s: %d items", channel_id[:20], len(items))
        return items

    def _fetch_bodacc(self, identifier: str, subcategory: str) -> list[dict]:
        """Fetch BODACC announcements via OpenDataSoft API."""
        from urllib.parse import quote
        q = quote(identifier)
        url = (f"https://bodacc-datadila.opendatasoft.com/api/records/1.0/search/"
               f"?dataset=annonces-commerciales&q={q}&rows=25&sort=dateparution")
        body = self._curl_get(url)
        if not body:
            return []

        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            log.warning("Invalid JSON from BODACC: %s", identifier)
            return []

        items = []
        for record in data.get("records", []):
            rec_id = record.get("recordid", "")
            fields = record.get("fields", {})
            title = fields.get("commercant", fields.get("denomination", ""))
            if not title:
                title = fields.get("registre", rec_id)
            desc = fields.get("descriptif", "")
            date_pub = fields.get("dateparution", "")
            link = f"https://www.bodacc.fr/annonce/detail/{rec_id}" if rec_id else ""
            summary = f"{desc} (publié le {date_pub})" if date_pub else desc

            det_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"bodacc-{rec_id}"))
            items.append(self._make_signal(det_id, title[:255], summary[:2000], link, "bodacc", subcategory))

        log.info("BODACC '%s': %d items", identifier[:40], len(items))
        return items

    def _fetch_custom_api(self, identifier: str, subcategory: str) -> list[dict]:
        """Fetch a custom JSON API endpoint."""
        body = self._curl_get(identifier)
        if not body:
            return []

        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            log.warning("Invalid JSON from custom API: %s", identifier[:60])
            return []

        # Find the array: root array, or common keys
        arr = None
        if isinstance(data, list):
            arr = data
        elif isinstance(data, dict):
            for key in ("items", "results", "data", "entries", "records"):
                if key in data and isinstance(data[key], list):
                    arr = data[key]
                    break
        if not arr:
            log.warning("No array found in custom API response: %s", identifier[:60])
            return []

        items = []
        for entry in arr[:3]:
            if not isinstance(entry, dict):
                continue
            title = str(entry.get("title") or entry.get("name") or entry.get("headline") or "")
            if not title:
                continue
            summary = str(entry.get("summary") or entry.get("description") or entry.get("body", ""))
            link = str(entry.get("url") or entry.get("link") or entry.get("href") or "")
            item_id = str(entry.get("id") or entry.get("_id") or title)
            det_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"custom-{identifier[:80]}-{item_id}"))
            items.append(self._make_signal(det_id, title[:255], summary[:2000], link[:2000], "other", subcategory))

        log.info("Custom API %s: %d items", identifier[:60], len(items))
        return items

    # -- Apify fetchers (free tier) ------------------------------------------

    def _run_apify_actor(self, actor_id: str, run_input: dict) -> list[dict]:
        """Run an Apify actor synchronously and return dataset items."""
        if not APIFY_TOKEN:
            log.warning("APIFY_TOKEN not set, skipping %s", actor_id)
            return []

        # Apify API uses ~ separator for username/actor-name in URLs
        actor_id_url = actor_id.replace("/", "~")
        url = (f"https://api.apify.com/v2/acts/{actor_id_url}/run-sync-get-dataset-items"
               f"?token={APIFY_TOKEN}")
        input_json = json.dumps(run_input)
        try:
            result = subprocess.run(
                ["curl", "-s", "-X", "POST", url,
                 "-H", "Content-Type: application/json",
                 "-d", input_json,
                 "--max-time", "90"],
                capture_output=True, text=True, timeout=100,
            )
            if result.returncode != 0:
                log.warning("Apify actor %s curl failed (exit %d)", actor_id, result.returncode)
                return []
            data = json.loads(result.stdout) if result.stdout.strip() else []
            if isinstance(data, dict) and "error" in data:
                log.warning("Apify actor %s returned error: %s", actor_id, str(data["error"])[:200])
                return []
            return data
        except subprocess.TimeoutExpired:
            log.warning("Apify actor %s timed out", actor_id)
            return []
        except json.JSONDecodeError:
            log.warning("Apify actor %s returned invalid JSON", actor_id)
            return []
        except Exception:
            log.exception("Apify actor %s error", actor_id)
            return []

    def _fetch_twitter(self, identifier: str, subcategory: str, settings: dict | None = None) -> list[dict]:
        """Fetch tweets via Apify kaitoeasyapi scraper (includes viewCount)."""
        handle = identifier.lstrip("@")
        settings = settings or {}

        raw = self._run_apify_actor(
            "kaitoeasyapi/twitter-x-data-tweet-scraper-pay-per-result-cheapest",
            {"user_names": [handle], "maxItems": 20},
        )
        if not raw:
            return []

        # Handle dict response (some actors wrap results)
        if isinstance(raw, dict):
            for k in ("items", "results", "data", "tweets"):
                if k in raw and isinstance(raw[k], list):
                    raw = raw[k]
                    break
            else:
                raw = [raw]

        # Post-fetch filters from signal_sources.settings
        min_views = settings.get("min_views", 0)
        min_likes = settings.get("min_likes", 0)
        min_retweets = settings.get("min_retweets", 0)

        items = []
        for tweet in raw:
            if not isinstance(tweet, dict):
                continue
            # Skip mock/padding tweets from pay-per-result actors
            if tweet.get("type") == "mock_tweet":
                continue
            tweet_id = str(tweet.get("id") or tweet.get("tweetId") or "")
            text = tweet.get("text") or tweet.get("full_text") or ""
            if not text:
                continue

            # Apply engagement filters
            if (tweet.get("viewCount") or 0) < min_views:
                continue
            if (tweet.get("likeCount") or 0) < min_likes:
                continue
            if (tweet.get("retweetCount") or 0) < min_retweets:
                continue

            title = text[:255]
            link = f"https://x.com/{handle}/status/{tweet_id}" if tweet_id else ""

            # Enrich summary with engagement metrics
            metrics = (f"👁 {tweet.get('viewCount', 0)} · "
                       f"♥ {tweet.get('likeCount', 0)} · "
                       f"🔁 {tweet.get('retweetCount', 0)} · "
                       f"💬 {tweet.get('replyCount', 0)}")
            summary = f"{metrics}\n{text[:1900]}"

            det_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"twitter-{handle}-{tweet_id or text[:50]}"))
            items.append(self._make_signal(det_id, title, summary, link, "twitter", subcategory))

        filtered = len(raw) - len(items)
        items = items[:3]  # Limit to 3 for testing
        log.info("Twitter @%s: %d items (%d filtered)", handle, len(items), filtered)
        return items

    def _fetch_linkedin(self, identifier: str, subcategory: str) -> list[dict]:
        """Fetch LinkedIn company posts via Apify scraper."""
        slug = identifier.strip("/").split("/")[-1]  # handle full URL or slug
        raw = self._run_apify_actor("get-leads/linkedin-scraper", {
            "urls": [f"https://linkedin.com/company/{slug}/posts/"],
            "maxResults": 3,
        })
        if not raw:
            return []

        items = []
        for post in raw:
            if not isinstance(post, dict):
                continue
            post_id = str(post.get("id") or post.get("postId") or post.get("urn") or "")
            text = post.get("text") or post.get("commentary") or post.get("title") or ""
            if not text:
                continue
            title = text[:255]
            link = post.get("url") or post.get("postUrl") or ""
            det_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"linkedin-{slug}-{post_id or text[:50]}"))
            items.append(self._make_signal(det_id, title, text[:2000], link[:2000], "linkedin", subcategory))

        log.info("LinkedIn %s: %d items", slug, len(items))
        return items

    def _fetch_crunchbase(self, identifier: str, subcategory: str) -> list[dict]:
        """Fetch Crunchbase company info via Apify scraper."""
        name = identifier.strip()
        raw = self._run_apify_actor("curious_coder/crunchbase-scraper", {
            "query": name,
            "maxResults": 3,
        })
        if not raw:
            return []

        items = []
        for entry in raw:
            if not isinstance(entry, dict):
                continue
            item_id = str(entry.get("id") or entry.get("uuid") or entry.get("permalink") or "")
            title = entry.get("name") or entry.get("organization_name") or ""
            if not title:
                continue
            desc = entry.get("short_description") or entry.get("description") or ""
            link = entry.get("url") or entry.get("crunchbase_url") or ""
            if not link and entry.get("permalink"):
                link = f"https://www.crunchbase.com/organization/{entry['permalink']}"
            det_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"crunchbase-{name}-{item_id or title}"))
            items.append(self._make_signal(det_id, title[:255], desc[:2000], link[:2000], "other", subcategory))

        log.info("Crunchbase '%s': %d items", name, len(items))
        return items

    # -- Signal item factory ------------------------------------------------

    @staticmethod
    def _make_signal(det_id: str, title: str, summary: str, source_url: str,
                     platform: str, subcategory: str) -> dict:
        return {
            "id": det_id,
            "title": title[:255],
            "summary": summary[:2000],
            "source_url": source_url[:2000],
            "source_platform": platform,
            "subcategory": subcategory,
            "impact_level": "moyen",
            "relevance_score": 50,
            "status": "raw",
            "collected_by": "monitor",
        }


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="Sync daemon: Supabase ↔ OpenClaw")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print CLI commands instead of executing them",
    )
    args = parser.parse_args()

    daemon = SyncDaemon(dry_run=args.dry_run)
    asyncio.run(daemon.run())


if __name__ == "__main__":
    main()
