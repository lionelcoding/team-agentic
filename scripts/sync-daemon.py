#!/usr/bin/env python3
"""sync-daemon.py — Bridge between Supabase gateway_commands and OpenClaw CLI.

Runs two concurrent loops:
  A) poll_commands  — every 5s, picks up pending commands and executes them
  B) sync_agent_status — every 30s, reads OpenClaw health and updates agents table

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
from datetime import datetime, timezone

from dotenv import load_dotenv
from supabase import create_client, Client

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
COMMAND_POLL_INTERVAL = 5     # seconds
STATUS_SYNC_INTERVAL = 30    # seconds
COMMAND_TIMEOUT = 60          # seconds

# Command map: name → callable(agent_id, payload) → list of CLI args
COMMANDS: dict[str, callable] = {
    "wake":      lambda aid, _: ["openclaw", "agent", "--agent", aid, "--message", "wake up — resume your current tasks", "--json"],
    "sleep":     lambda aid, _: ["openclaw", "agent", "--agent", aid, "--message", "go to sleep — save state and stop", "--json"],
    "heartbeat": lambda _, __: ["openclaw", "system", "heartbeat", "enable"],
    "health":    lambda _, __: ["openclaw", "health", "--json"],
    "list_crons": lambda _, __: ["openclaw", "cron", "list", "--json"],
    "run_cron":   lambda _, p: ["openclaw", "cron", "run", p.get("cron_id", ""), "--json"],
    "toggle_cron": lambda _, p: ["openclaw", "cron", "enable" if p.get("enabled") else "disable", p.get("cron_id", "")],
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
