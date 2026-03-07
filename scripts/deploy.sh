#!/bin/bash
# deploy.sh — Deploy sync-daemon to VPS
# Usage: ./scripts/deploy.sh [--setup]
#   --setup : First-time setup (venv, env file, systemd)
#   No flag : Update files only (redeploy)

set -e

VPS="root@72.60.214.74"
REMOTE_DIR="/root/sync-daemon"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Deploying sync-daemon to $VPS ==="

# Copy files
echo "[1/3] Copying files..."
scp "$SCRIPT_DIR/sync-daemon.py" \
    "$SCRIPT_DIR/requirements.txt" \
    "$SCRIPT_DIR/sync-daemon.service" \
    "$VPS:$REMOTE_DIR/"

if [[ "$1" == "--setup" ]]; then
    # Prompt for service role key if not already set
    if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
        read -sp "SUPABASE_SERVICE_ROLE_KEY: " SUPABASE_SERVICE_ROLE_KEY
        echo
    fi

    echo "[2/3] First-time setup (venv + deps + env)..."
    ssh "$VPS" bash -s -- "$SUPABASE_SERVICE_ROLE_KEY" <<'REMOTE'
        set -e
        SERVICE_KEY="$1"
        cd /root/sync-daemon
        python3 -m venv venv
        venv/bin/pip install -q supabase python-dotenv
        echo "Deps installed."

        cat > /root/.sync-daemon.env << ENVEOF
SUPABASE_URL=https://dtytnpvztyregqhwfyxc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY
ENVEOF
        chmod 600 /root/.sync-daemon.env
        echo "Env file created."

        cp /root/sync-daemon/sync-daemon.service /etc/systemd/system/
        systemctl daemon-reload
        systemctl enable sync-daemon
        echo "Systemd service installed."
REMOTE
else
    echo "[2/3] Updating deps..."
    ssh "$VPS" "/root/sync-daemon/venv/bin/pip install -q -r /root/sync-daemon/requirements.txt"
fi

echo "[3/3] Restarting service..."
ssh "$VPS" "systemctl restart sync-daemon && sleep 2 && systemctl status sync-daemon --no-pager"

echo "=== Done ==="
