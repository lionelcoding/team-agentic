"""Tests for handover-cli.py — complete, message, and update-metrics commands."""

import json
import os
import sys
import tempfile
from unittest.mock import MagicMock, patch, call

import pytest

os.environ["SUPABASE_URL"] = "https://fake.supabase.co"
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "fake-key"

# Import module
import importlib.util
_spec = importlib.util.spec_from_file_location(
    "handover_cli",
    os.path.join(os.path.dirname(__file__), "..", "..", "scripts", "handover-cli.py"),
)
handover_cli = importlib.util.module_from_spec(_spec)

with patch("supabase.create_client") as _mock_cc:
    _mock_cc.return_value = MagicMock()
    _spec.loader.exec_module(handover_cli)


@pytest.fixture
def mock_sb():
    """Create a mock Supabase client with chainable methods."""
    sb = MagicMock()

    # handover_messages select -> returns data with signal info
    handover_single = MagicMock()
    handover_single.execute.return_value = MagicMock(data={
        "data": {"signal": {"id": "sig-abc"}}
    })

    # projects select -> returns one linked project
    projects_exec = MagicMock()
    projects_exec.execute.return_value = MagicMock(data=[{"id": "proj-123"}])

    # Track update calls
    update_mock = MagicMock()
    update_mock.return_value.eq.return_value.execute.return_value = MagicMock()

    def table_side_effect(table_name):
        mock_table = MagicMock()
        if table_name == "handover_messages":
            mock_table.select.return_value.eq.return_value.single.return_value = handover_single
            mock_table.update.return_value.eq.return_value.execute.return_value = MagicMock()
        elif table_name == "signal_items":
            mock_table.update.return_value.eq.return_value.execute.return_value = MagicMock()
        elif table_name == "projects":
            mock_table.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[{"id": "proj-123"}])
            mock_table.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(data={
                "success_metrics": [
                    {"name": "CTR", "baseline": "2%", "target": "5%", "actual": None, "type": "quanti"},
                    {"name": "Coverage", "baseline": "10", "target": "50", "actual": None, "type": "quanti"},
                ]
            })
            mock_table.update.return_value.eq.return_value.execute.return_value = MagicMock()
        elif table_name == "project_messages":
            mock_table.insert.return_value.execute.return_value = MagicMock()
        return mock_table

    sb.table.side_effect = table_side_effect
    return sb


# ─── complete tests ───────────────────────────────────────────────────────────

def test_complete_updates_linked_project(mock_sb, capsys):
    """When completing a handover, the linked project should be set to completed."""
    with patch.object(handover_cli, "get_client", return_value=mock_sb):
        handover_cli.cmd_complete("ho-456", "Analysis done. Startup X is relevant.")

    # Verify projects table was queried with the handover ID
    project_calls = [c for c in mock_sb.table.call_args_list if c[0][0] == "projects"]
    assert len(project_calls) >= 1, "Should query projects table"

    output = capsys.readouterr().out
    assert "proj-123" in output
    assert "completed" in output.lower()


def test_complete_updates_handover_status(mock_sb, capsys):
    """Handover should be marked as completed with result in data."""
    with patch.object(handover_cli, "get_client", return_value=mock_sb):
        handover_cli.cmd_complete("ho-789", "Done.")

    # Verify handover_messages was updated
    ho_calls = [c for c in mock_sb.table.call_args_list if c[0][0] == "handover_messages"]
    assert len(ho_calls) >= 2, "Should read then update handover_messages"

    output = capsys.readouterr().out
    assert "ho-789" in output


def test_complete_archives_signal(mock_sb, capsys):
    """The related signal should be archived."""
    with patch.object(handover_cli, "get_client", return_value=mock_sb):
        handover_cli.cmd_complete("ho-abc", "Result text")

    signal_calls = [c for c in mock_sb.table.call_args_list if c[0][0] == "signal_items"]
    assert len(signal_calls) >= 1, "Should update signal_items to archived"


def test_complete_no_linked_project_still_succeeds(capsys):
    """If no project is linked, complete should still succeed."""
    sb = MagicMock()

    def table_side_effect(table_name):
        mock_table = MagicMock()
        if table_name == "handover_messages":
            single = MagicMock()
            single.execute.return_value = MagicMock(data={"data": {}})
            mock_table.select.return_value.eq.return_value.single.return_value = single
            mock_table.update.return_value.eq.return_value.execute.return_value = MagicMock()
        elif table_name == "projects":
            mock_table.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
        else:
            mock_table.update.return_value.eq.return_value.execute.return_value = MagicMock()
        return mock_table

    sb.table.side_effect = table_side_effect

    with patch.object(handover_cli, "get_client", return_value=sb):
        handover_cli.cmd_complete("ho-empty", "No project linked")

    output = capsys.readouterr().out
    assert "ho-empty" in output
    assert "proj" not in output.lower() or "Warning" not in output


def test_complete_project_update_failure_non_blocking(capsys):
    """If project update fails, handover complete should still succeed."""
    sb = MagicMock()

    def table_side_effect(table_name):
        mock_table = MagicMock()
        if table_name == "handover_messages":
            single = MagicMock()
            single.execute.return_value = MagicMock(data={"data": {"signal": {"id": "s1"}}})
            mock_table.select.return_value.eq.return_value.single.return_value = single
            mock_table.update.return_value.eq.return_value.execute.return_value = MagicMock()
        elif table_name == "projects":
            mock_table.select.side_effect = Exception("DB connection lost")
        else:
            mock_table.update.return_value.eq.return_value.execute.return_value = MagicMock()
        return mock_table

    sb.table.side_effect = table_side_effect

    with patch.object(handover_cli, "get_client", return_value=sb):
        handover_cli.cmd_complete("ho-fail", "Result despite error")

    output = capsys.readouterr().out
    assert "ho-fail" in output
    assert "Warning" in output or "completed" in output.lower()


def test_complete_with_artifact(mock_sb, capsys, tmp_path):
    """Complete with --artifact reads the file and stores content."""
    artifact_file = tmp_path / "report.md"
    artifact_file.write_text("# Report\n\nAll done.", encoding="utf-8")

    with patch.object(handover_cli, "get_client", return_value=mock_sb):
        handover_cli.cmd_complete("ho-art", "Done with artifact", artifact_path=str(artifact_file))

    output = capsys.readouterr().out
    assert "Artifact read" in output
    assert "proj-123" in output


# ─── message tests ────────────────────────────────────────────────────────────

def test_message_inserts_into_project_messages(mock_sb, capsys):
    """message command should INSERT into project_messages with role agent."""
    with patch.object(handover_cli, "get_client", return_value=mock_sb):
        handover_cli.cmd_message("proj-abc", "Hello from agent", message_type="feedback")

    pm_calls = [c for c in mock_sb.table.call_args_list if c[0][0] == "project_messages"]
    assert len(pm_calls) >= 1, "Should insert into project_messages"

    output = capsys.readouterr().out
    assert "proj-abc" in output
    assert "feedback" in output


def test_message_plan_proposal_updates_project(mock_sb, capsys):
    """plan_proposal message should parse JSON and update project fields."""
    plan_json = json.dumps({
        "objective": "Analyze competitor",
        "steps": [{"label": "Research", "done": False}],
        "complexity": "moyen",
        "success_metrics": [{"name": "CTR", "baseline": "2%", "target": "5%", "actual": None, "type": "quanti"}],
    })

    with patch.object(handover_cli, "get_client", return_value=mock_sb):
        handover_cli.cmd_message("proj-plan", plan_json, message_type="plan_proposal")

    # Should have called both project_messages insert and projects update
    pm_calls = [c for c in mock_sb.table.call_args_list if c[0][0] == "project_messages"]
    proj_calls = [c for c in mock_sb.table.call_args_list if c[0][0] == "projects"]
    assert len(pm_calls) >= 1
    assert len(proj_calls) >= 1

    output = capsys.readouterr().out
    assert "plan_proposal" in output
    assert "plan fields updated" in output


def test_message_plan_proposal_invalid_json_no_crash(mock_sb, capsys):
    """plan_proposal with non-JSON content should not crash."""
    with patch.object(handover_cli, "get_client", return_value=mock_sb):
        handover_cli.cmd_message("proj-bad", "This is not JSON", message_type="plan_proposal")

    output = capsys.readouterr().out
    assert "not valid JSON" in output


# ─── update-metrics tests ─────────────────────────────────────────────────────

def test_update_metrics_patches_success_metrics(mock_sb, capsys):
    """update-metrics should patch actual values in success_metrics."""
    actuals = json.dumps({"CTR": "4.5%"})

    with patch.object(handover_cli, "get_client", return_value=mock_sb):
        handover_cli.cmd_update_metrics("proj-met", actuals)

    # Should update projects and insert metric_update message
    proj_calls = [c for c in mock_sb.table.call_args_list if c[0][0] == "projects"]
    pm_calls = [c for c in mock_sb.table.call_args_list if c[0][0] == "project_messages"]
    assert len(proj_calls) >= 1
    assert len(pm_calls) >= 1

    output = capsys.readouterr().out
    assert "proj-met" in output
    assert "CTR" in output


def test_update_metrics_invalid_json_exits(mock_sb):
    """update-metrics with invalid JSON should exit."""
    with patch.object(handover_cli, "get_client", return_value=mock_sb):
        with pytest.raises(SystemExit):
            handover_cli.cmd_update_metrics("proj-x", "not json")
