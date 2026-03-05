#!/usr/bin/env python3
"""sync-daemon.py — Bridge between Supabase gateway_commands and OpenClaw CLI.

Runs five concurrent loops:
  A) poll_commands      — every 5s, picks up pending commands and executes them
  B) sync_agent_status  — every 30s, reads OpenClaw health and updates agents table
  C) parse_sessions     — every 60s, parses JSONL session files → agent_actions
  D) push_usage_cost    — every 5min, reads openclaw usage-cost → cost_entries
  E) sync_crons         — every 5min, reads openclaw cron list → cron_schedule

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
from datetime import datetime, timezone

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

# Session JSONL parsing
SESSIONS_BASE = "/root/.openclaw/agents"
CURSOR_FILE = "/tmp/sync-daemon-cursors.json"

# Command map: name → callable(agent_id, payload) → list of CLI args
COMMANDS: dict[str, callable] = {
    "wake":      lambda aid, _: ["openclaw", "agent", "--agent", aid, "--message", "wake up — resume your current tasks", "--json"],
    "sleep":     lambda aid, _: ["openclaw", "agent", "--agent", aid, "--message", "go to sleep — save state and stop", "--json"],
    "heartbeat": lambda _, __: ["openclaw", "system", "heartbeat", "enable"],
    "health":    lambda _, __: ["openclaw", "health", "--json"],
    "list_crons": lambda _, __: ["openclaw", "cron", "list", "--json"],
    "run_cron":   lambda _, p: ["openclaw", "cron", "run", p.get("cron_id", ""), "--json"],
    "toggle_cron": lambda _, p: ["openclaw", "cron", "enable" if p.get("enabled") else "disable", p.get("cron_id", "")],
    "create_cron": lambda aid, p: ["openclaw", "cron", "add", "--agent", aid or p.get("agent_id", ""), "--name", p.get("name", ""), "--schedule", p.get("schedule_expr", ""), "--json"],
    "update_cron": lambda _, p: ["openclaw", "cron", "update", p.get("cron_id", "")] + (["--name", p["name"]] if p.get("name") else []) + (["--schedule", p["schedule_expr"]] if p.get("schedule_expr") else []) + ["--json"],
    "delete_cron": lambda _, p: ["openclaw", "cron", "remove", p.get("cron_id", ""), "--json"],
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
        total_inserted = 0

        for agent_id in sorted(KNOWN_AGENTS):
            sessions_dir = os.path.join(SESSIONS_BASE, agent_id, "sessions")
            if not os.path.isdir(sessions_dir):
                continue

            agent_cursors = cursors.get(agent_id, {})
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

                if not actions:
                    continue

                # Batch insert
                try:
                    self.supabase.table("agent_actions").insert(actions).execute()
                    new_cursor = last_line + len(actions)
                    agent_cursors[session_id] = new_cursor
                    agent_inserted += len(actions)
                except Exception:
                    log.exception("Failed to insert %d actions for %s/%s",
                                  len(actions), agent_id, session_id)

            if agent_inserted:
                log.info("Parsed %d actions from agent %s", agent_inserted, agent_id)

            cursors[agent_id] = agent_cursors
            total_inserted += agent_inserted

        self._save_cursors(cursors)
        if total_inserted:
            log.info("Total: inserted %d agent_actions", total_inserted)
            # Aggregate costs per agent after new actions
            await self._aggregate_agent_costs()

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

            row = {
                "id": det_id,
                "name": cron.get("name", cron_id),
                "description": cron.get("description"),
                "cron_expression": schedule.get("expr", "") if isinstance(schedule, dict) else str(schedule),
                "agent_id": agent_id,
                "action_type": cron.get("action") or "cron_job",
                "enabled": cron.get("enabled", True),
                "payload": {"openclaw_cron_id": cron_id, "schedule": schedule, "state": state},
                "last_run_at": (
                    datetime.fromtimestamp(state["lastRunAtMs"] / 1000, tz=timezone.utc).isoformat()
                    if state.get("lastRunAtMs") else None
                ),
                "last_run_status": state.get("lastRunStatus") or state.get("lastStatus"),
                "next_run_at": (
                    datetime.fromtimestamp(state["nextRunAtMs"] / 1000, tz=timezone.utc).isoformat()
                    if state.get("nextRunAtMs") else None
                ),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }

            try:
                self.supabase.table("cron_schedule").upsert(row, on_conflict="id").execute()
                upserted += 1
            except Exception:
                log.exception("Failed to upsert cron %s", cron_id)

        if upserted:
            log.info("Synced %d cron(s) to cron_schedule", upserted)


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
