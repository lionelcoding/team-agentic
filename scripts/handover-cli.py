#!/usr/bin/env python3
"""handover-cli.py — CLI for agents to read/complete handover messages via Supabase.

Usage:
  python3 /root/sync-daemon/handover-cli.py pending <agent_id>
  python3 /root/sync-daemon/handover-cli.py complete <handover_id> "<result_text>"

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


def cmd_complete(handover_id: str, result_text: str):
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

    # Update linked project → completed with results
    try:
        proj_resp = sb.table("projects") \
            .select("id") \
            .eq("related_handover_id", handover_id) \
            .execute()

        projects = proj_resp.data or []
        for proj in projects:
            sb.table("projects").update({
                "status": "completed",
                "completed_at": now,
                "results": {"summary": result_text},
                "updated_at": now,
            }).eq("id", proj["id"]).execute()
            print(f"Project {proj['id']} marked as completed.")
    except Exception as e:
        print(f"Warning: could not update linked project: {e}")

    print(f"Handover {handover_id} marked as completed.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    action = sys.argv[1]
    if action == "pending" and len(sys.argv) >= 3:
        cmd_pending(sys.argv[2])
    elif action == "complete" and len(sys.argv) >= 4:
        cmd_complete(sys.argv[2], " ".join(sys.argv[3:]))
    else:
        print(__doc__)
        sys.exit(1)
