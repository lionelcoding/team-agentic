"""Tests for sync-daemon.py provision/deprovision and dynamic agent loading."""

import os
import sys
import tempfile
import shutil
from unittest.mock import MagicMock, patch

import pytest

# We need to patch env vars before importing
os.environ["SUPABASE_URL"] = "https://fake.supabase.co"
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "fake-key"

# Import module with hyphen in name
import importlib.util
_spec = importlib.util.spec_from_file_location(
    "sync_daemon",
    os.path.join(os.path.dirname(__file__), "..", "..", "scripts", "sync-daemon.py"),
)
sync_daemon = importlib.util.module_from_spec(_spec)

# Patch create_client before exec_module to prevent real connection
with patch("supabase.create_client") as _mock_cc:
    _mock_cc.return_value = MagicMock()
    _mock_cc.return_value.table.return_value.select.return_value.execute.return_value = MagicMock(data=[])
    _spec.loader.exec_module(sync_daemon)

KNOWN_AGENTS = sync_daemon.KNOWN_AGENTS
AGENT_WORKSPACES = sync_daemon.AGENT_WORKSPACES
PROTECTED_AGENTS = sync_daemon.PROTECTED_AGENTS
AGENT_ID_RE = sync_daemon.AGENT_ID_RE
AGENT_FILE_TEMPLATES = sync_daemon.AGENT_FILE_TEMPLATES


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
@pytest.fixture(autouse=True)
def reset_agents():
    """Reset KNOWN_AGENTS and AGENT_WORKSPACES to original state after each test."""
    original_known = set(KNOWN_AGENTS)
    original_workspaces = dict(AGENT_WORKSPACES)
    yield
    KNOWN_AGENTS.clear()
    KNOWN_AGENTS.update(original_known)
    AGENT_WORKSPACES.clear()
    AGENT_WORKSPACES.update(original_workspaces)


@pytest.fixture
def tmp_workspace(tmp_path):
    """Provide a temporary base directory for agent workspaces."""
    return str(tmp_path)


@pytest.fixture
def daemon(tmp_workspace):
    """Create a SyncDaemon in dry_run mode with mocked Supabase."""
    mock_client = MagicMock()
    mock_client.table.return_value.select.return_value.execute.return_value = MagicMock(data=[])
    original_create = sync_daemon.create_client
    sync_daemon.create_client = lambda *a, **kw: mock_client
    try:
        d = sync_daemon.SyncDaemon(dry_run=True)
        d.supabase = mock_client
        # Override EAGLE_BASE for tests
        sync_daemon.EAGLE_BASE = tmp_workspace
        yield d
    finally:
        sync_daemon.create_client = original_create


# ---------------------------------------------------------------------------
# AGENT_ID_RE validation
# ---------------------------------------------------------------------------
class TestAgentIdRegex:
    def test_valid_ids(self):
        assert AGENT_ID_RE.match("content-writer")
        assert AGENT_ID_RE.match("a1")
        assert AGENT_ID_RE.match("my-agent-123")

    def test_invalid_starts_with_number(self):
        assert AGENT_ID_RE.match("1agent") is None

    def test_invalid_uppercase(self):
        assert AGENT_ID_RE.match("Agent") is None

    def test_invalid_too_short(self):
        assert AGENT_ID_RE.match("a") is None

    def test_invalid_spaces(self):
        assert AGENT_ID_RE.match("my agent") is None

    def test_invalid_special_chars(self):
        assert AGENT_ID_RE.match("agent_test") is None


# ---------------------------------------------------------------------------
# _load_dynamic_agents
# ---------------------------------------------------------------------------
class TestLoadDynamicAgents:
    def test_loads_new_agents_from_db(self, daemon):
        daemon.supabase.table.return_value.select.return_value.execute.return_value = MagicMock(
            data=[
                {"id": "new-agent", "workspace_path": "/root/clawd-eagle/new-agent"},
                {"id": "main", "workspace_path": "/root/clawd"},  # already exists
            ]
        )
        daemon._load_dynamic_agents()

        assert "new-agent" in KNOWN_AGENTS
        assert AGENT_WORKSPACES["new-agent"] == "/root/clawd-eagle/new-agent"

    def test_skips_agents_without_workspace(self, daemon):
        daemon.supabase.table.return_value.select.return_value.execute.return_value = MagicMock(
            data=[{"id": "no-ws", "workspace_path": None}]
        )
        daemon._load_dynamic_agents()

        assert "no-ws" not in KNOWN_AGENTS

    def test_does_not_override_existing(self, daemon):
        original_main_path = AGENT_WORKSPACES["main"]
        daemon.supabase.table.return_value.select.return_value.execute.return_value = MagicMock(
            data=[{"id": "main", "workspace_path": "/other/path"}]
        )
        daemon._load_dynamic_agents()

        assert AGENT_WORKSPACES["main"] == original_main_path

    def test_handles_db_error_gracefully(self, daemon):
        daemon.supabase.table.return_value.select.return_value.execute.side_effect = Exception("DB down")
        # Should not raise
        daemon._load_dynamic_agents()
        # Original agents still present
        assert "main" in KNOWN_AGENTS


# ---------------------------------------------------------------------------
# _provision_agent
# ---------------------------------------------------------------------------
class TestProvisionAgent:
    def test_creates_workspace_and_files(self, daemon, tmp_workspace):
        # Disable dry_run for this test
        daemon.dry_run = False

        result = daemon._provision_agent("test-agent", {
            "name": "Test Agent",
            "role": "Testing",
            "description": "A test agent",
            "model": "anthropic/claude-sonnet-4-20250514",
        })

        workspace = os.path.join(tmp_workspace, "test-agent")
        assert os.path.isdir(workspace)
        assert "test-agent" in KNOWN_AGENTS
        assert AGENT_WORKSPACES["test-agent"] == workspace
        assert set(result["files_created"]) == set(AGENT_FILE_TEMPLATES.keys())

        # Check file contents
        soul = open(os.path.join(workspace, "SOUL.md")).read()
        assert "Test Agent" in soul
        assert "Testing" in soul

        identity = open(os.path.join(workspace, "IDENTITY.md")).read()
        assert "test-agent" in identity
        assert "Testing" in identity

        heartbeat = open(os.path.join(workspace, "HEARTBEAT.md")).read()
        assert "No activity yet" in heartbeat

    def test_rejects_invalid_id_format(self, daemon):
        with pytest.raises(ValueError, match="Invalid agent_id format"):
            daemon._provision_agent("INVALID", {"name": "X"})

    def test_rejects_existing_agent(self, daemon):
        with pytest.raises(ValueError, match="Agent already exists"):
            daemon._provision_agent("main", {"name": "X"})

    def test_dry_run_does_not_create_files(self, daemon, tmp_workspace):
        result = daemon._provision_agent("dry-agent", {"name": "Dry"})
        assert result["dry_run"] is True
        assert not os.path.isdir(os.path.join(tmp_workspace, "dry-agent"))
        assert "dry-agent" not in KNOWN_AGENTS

    def test_registers_agent_dynamically(self, daemon, tmp_workspace):
        daemon.dry_run = False
        daemon._provision_agent("dynamic-1", {"name": "Dynamic One", "role": "Test"})

        assert "dynamic-1" in KNOWN_AGENTS
        assert AGENT_WORKSPACES["dynamic-1"] == os.path.join(tmp_workspace, "dynamic-1")


# ---------------------------------------------------------------------------
# _deprovision_agent
# ---------------------------------------------------------------------------
class TestDeprovisionAgent:
    def test_removes_workspace_and_unregisters(self, daemon, tmp_workspace):
        # First provision an agent
        daemon.dry_run = False
        daemon._provision_agent("removable", {"name": "Removable", "role": "Test"})
        workspace = os.path.join(tmp_workspace, "removable")
        assert os.path.isdir(workspace)

        result = daemon._deprovision_agent("removable")

        assert result["removed"] is True
        assert not os.path.isdir(workspace)
        assert "removable" not in KNOWN_AGENTS
        assert "removable" not in AGENT_WORKSPACES

    def test_refuses_protected_agent(self, daemon):
        for agent_id in PROTECTED_AGENTS:
            with pytest.raises(ValueError, match="Cannot deprovision protected agent"):
                daemon._deprovision_agent(agent_id)

    def test_refuses_unknown_agent(self, daemon):
        with pytest.raises(ValueError, match="Unknown agent"):
            daemon._deprovision_agent("nonexistent")

    def test_dry_run_does_not_remove(self, daemon, tmp_workspace):
        daemon.dry_run = False
        daemon._provision_agent("keep-me", {"name": "Keep", "role": "Test"})
        workspace = os.path.join(tmp_workspace, "keep-me")
        assert os.path.isdir(workspace)

        daemon.dry_run = True
        result = daemon._deprovision_agent("keep-me")

        assert result["dry_run"] is True
        assert os.path.isdir(workspace)
        # Still registered (dry-run doesn't touch runtime state)


# ---------------------------------------------------------------------------
# _execute_command routing
# ---------------------------------------------------------------------------
class TestExecuteCommandRouting:
    @pytest.mark.asyncio
    async def test_routes_provision_agent(self, daemon, tmp_workspace):
        daemon.dry_run = False
        result = await daemon._execute_command("provision_agent", "routed-agent", {
            "name": "Routed",
            "role": "Test",
        })
        assert "routed-agent" in KNOWN_AGENTS
        assert result["agent_id"] == "routed-agent"

    @pytest.mark.asyncio
    async def test_routes_deprovision_agent(self, daemon, tmp_workspace):
        daemon.dry_run = False
        await daemon._execute_command("provision_agent", "temp-agent", {
            "name": "Temp",
            "role": "Test",
        })
        result = await daemon._execute_command("deprovision_agent", "temp-agent", {})
        assert result["removed"] is True
        assert "temp-agent" not in KNOWN_AGENTS

    @pytest.mark.asyncio
    async def test_provision_requires_agent_id(self, daemon):
        with pytest.raises(ValueError, match="requires agent_id"):
            await daemon._execute_command("provision_agent", None, {})

    @pytest.mark.asyncio
    async def test_deprovision_requires_agent_id(self, daemon):
        with pytest.raises(ValueError, match="requires agent_id"):
            await daemon._execute_command("deprovision_agent", None, {})
