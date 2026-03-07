#!/usr/bin/env python3
"""handover-cli.py — CLI for agents to read/complete handover messages via Supabase.

Usage:
  python3 /root/sync-daemon/handover-cli.py pending <agent_id>
  python3 /root/sync-daemon/handover-cli.py complete <handover_id> "<result_text>" [--artifact /path/to/file.md]
  python3 /root/sync-daemon/handover-cli.py message <project_id> "<content>" [--type plan_proposal]
  python3 /root/sync-daemon/handover-cli.py update-metrics <project_id> '<json>'
  python3 /root/sync-daemon/handover-cli.py project-info <project_id>

Reads credentials from /root/.sync-daemon.env
"""

import json
import os
import sys

from dotenv import load_dotenv
from supabase import create_client

load_dotenv("/root/.sync-daemon.env")

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]


def get_client():
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def cmd_pending(agent_id: str):
    """List pending handover messages for an agent."""
    sb = get_client()
    resp = sb.table("handover_messages") \
        .select("id, from_agent, content, priority, data, created_at") \
        .eq("to_agent", agent_id) \
        .eq("status", "sent") \
        .order("created_at", desc=False) \
        .execute()

    messages = resp.data or []
    if not messages:
        print("No pending handovers.")
        return

    for msg in messages:
        print(f"--- Handover {msg['id']} (priority: {msg['priority']}) ---")
        print(f"From: {msg['from_agent']} | Date: {msg['created_at']}")
        print(msg["content"])
        signal = (msg.get("data") or {}).get("signal", {})
        if signal.get("source_url"):
            print(f"URL: {signal['source_url']}")
        print()


def cmd_complete(handover_id: str, result_text: str, artifact_path: str | None = None):
    """Mark a handover as completed with a result, update linked project."""
    sb = get_client()
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc).isoformat()

    # Get existing data to merge
    resp = sb.table("handover_messages") \
        .select("data") \
        .eq("id", handover_id) \
        .single() \
        .execute()

    existing_data = resp.data.get("data") or {}
    existing_data["result"] = result_text
    existing_data["completed_at"] = now

    sb.table("handover_messages").update({
        "status": "completed",
        "acted_at": now,
        "data": existing_data,
    }).eq("id", handover_id).execute()

    # Also get the related signal and mark it as archived
    signal_id = existing_data.get("signal", {}).get("id")
    if signal_id:
        sb.table("signal_items").update({
            "status": "archived",
        }).eq("id", signal_id).execute()

    # Read artifact file if provided
    artifact_content = None
    if artifact_path and os.path.isfile(artifact_path):
        try:
            with open(artifact_path, "r", encoding="utf-8") as f:
                artifact_content = f.read()
            print(f"Artifact read: {artifact_path} ({len(artifact_content)} chars)")
        except Exception as e:
            print(f"Warning: could not read artifact file: {e}")

    # Update linked project -> completed with results
    try:
        proj_resp = sb.table("projects") \
            .select("id") \
            .eq("related_handover_id", handover_id) \
            .execute()

        projects = proj_resp.data or []
        for proj in projects:
            update_data = {
                "status": "completed",
                "completed_at": now,
                "results": {"summary": result_text},
                "updated_at": now,
            }
            if artifact_content:
                update_data["artifact_content"] = artifact_content
                update_data["artifact_path"] = artifact_path
            sb.table("projects").update(update_data).eq("id", proj["id"]).execute()
            print(f"Project {proj['id']} marked as completed.")
    except Exception as e:
        print(f"Warning: could not update linked project: {e}")

    print(f"Handover {handover_id} marked as completed.")


def cmd_message(project_id: str, content: str, message_type: str = "feedback"):
    """Post a message to a project's discussion thread."""
    sb = get_client()

    # Insert message
    sb.table("project_messages").insert({
        "project_id": project_id,
        "role": "agent",
        "content": content,
        "message_type": message_type,
    }).execute()

    print(f"Message posted to project {project_id} (type: {message_type})")

    # If plan_proposal, try to parse JSON and update project plan fields
    if message_type == "plan_proposal":
        try:
            plan = json.loads(content)
            update_data = {}
            field_map = {
                "objective": "objective",
                "steps": "steps",
                "success_metrics": "success_metrics",
                "complexity": "complexity",
                "tools_resources": "tools_resources",
                "risks": "risks",
                "okr": "okr",
                "deadline": "deadline",
            }
            for json_key, db_key in field_map.items():
                if json_key in plan:
                    update_data[db_key] = plan[json_key]

            if update_data:
                from datetime import datetime, timezone
                update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
                sb.table("projects").update(update_data).eq("id", project_id).execute()
                print(f"Project {project_id} plan fields updated: {list(update_data.keys())}")
        except json.JSONDecodeError:
            print("Content is not valid JSON, skipping plan field update.")
        except Exception as e:
            print(f"Warning: could not update project plan fields: {e}")


def cmd_update_metrics(project_id: str, metrics_json: str):
    """Update success_metrics actuals on a project."""
    sb = get_client()
    from datetime import datetime, timezone

    try:
        actuals = json.loads(metrics_json)
    except json.JSONDecodeError:
        print("Error: metrics must be valid JSON")
        sys.exit(1)

    # Get current metrics
    resp = sb.table("projects") \
        .select("success_metrics") \
        .eq("id", project_id) \
        .single() \
        .execute()

    current_metrics = resp.data.get("success_metrics") or []

    # Update actuals: actuals is a dict {metric_name: actual_value}
    for metric in current_metrics:
        name = metric.get("name", "")
        if name in actuals:
            metric["actual"] = actuals[name]

    now = datetime.now(timezone.utc).isoformat()
    sb.table("projects").update({
        "success_metrics": current_metrics,
        "updated_at": now,
    }).eq("id", project_id).execute()

    # Post a metric_update message
    sb.table("project_messages").insert({
        "project_id": project_id,
        "role": "agent",
        "content": json.dumps(actuals, ensure_ascii=False),
        "message_type": "metric_update",
    }).execute()

    print(f"Metrics updated for project {project_id}: {actuals}")


def cmd_project_info(project_id: str):
    """Display project plan info for an agent."""
    sb = get_client()
    resp = sb.table("projects") \
        .select("id, name, status, objective, steps, success_metrics, complexity, deadline, tools_resources, risks, okr, assigned_agent") \
        .eq("id", project_id) \
        .single() \
        .execute()

    proj = resp.data
    if not proj:
        print(f"Project {project_id} not found.")
        return

    print(f"=== Project: {proj['name']} ===")
    print(f"Status: {proj['status']}")
    print(f"Agent: {proj.get('assigned_agent', 'N/A')}")
    print(f"Complexity: {proj.get('complexity', 'N/A')}")
    if proj.get("objective"):
        print(f"\nObjective: {proj['objective']}")
    if proj.get("okr"):
        print(f"OKR: {proj['okr']}")
    if proj.get("deadline"):
        print(f"Deadline: {proj['deadline']}")
    if proj.get("steps"):
        print("\nSteps:")
        for i, step in enumerate(proj["steps"], 1):
            done = "[x]" if step.get("done") else "[ ]"
            print(f"  {done} {i}. {step.get('label', '?')}")
    if proj.get("success_metrics"):
        print("\nSuccess Metrics:")
        for m in proj["success_metrics"]:
            actual = m.get("actual", "—")
            print(f"  - {m.get('name')}: baseline={m.get('baseline')} target={m.get('target')} actual={actual}")
    if proj.get("tools_resources"):
        print(f"\nTools: {', '.join(proj['tools_resources'])}")
    if proj.get("risks"):
        print("\nRisks:")
        for r in proj["risks"]:
            if isinstance(r, str):
                print(f"  - {r}")
            elif isinstance(r, dict):
                print(f"  - {r.get('description', r)}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    action = sys.argv[1]
    if action == "pending" and len(sys.argv) >= 3:
        cmd_pending(sys.argv[2])
    elif action == "complete" and len(sys.argv) >= 4:
        # Parse --artifact flag
        artifact = None
        args = sys.argv[3:]
        text_parts = []
        i = 0
        while i < len(args):
            if args[i] == "--artifact" and i + 1 < len(args):
                artifact = args[i + 1]
                i += 2
            else:
                text_parts.append(args[i])
                i += 1
        cmd_complete(sys.argv[2], " ".join(text_parts), artifact_path=artifact)
    elif action == "message" and len(sys.argv) >= 4:
        # Parse --type flag
        msg_type = "feedback"
        args = sys.argv[4:] if len(sys.argv) > 4 else []
        for idx, arg in enumerate(args):
            if arg == "--type" and idx + 1 < len(args):
                msg_type = args[idx + 1]
                break
        cmd_message(sys.argv[2], sys.argv[3], message_type=msg_type)
    elif action == "update-metrics" and len(sys.argv) >= 4:
        cmd_update_metrics(sys.argv[2], sys.argv[3])
    elif action == "project-info" and len(sys.argv) >= 3:
        cmd_project_info(sys.argv[2])
    else:
        print(__doc__)
        sys.exit(1)
