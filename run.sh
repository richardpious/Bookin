#!/bin/bash
# run.sh - Runs the local environment with OpenClaw and the FastAPI backend
set -e

if [ -z "$GEMINI_API_KEY" ]; then
    echo "ERROR: GEMINI_API_KEY is not set. Please set it in your environment first:"
    echo "  export GEMINI_API_KEY='your-key-here'"
    exit 1
fi

PROJECT_ROOT="$(pwd)"
export OPENCLAW_HOME="$PROJECT_ROOT"
OPENCLAW_PREFIX="$PROJECT_ROOT/.openclaw"
CONFIG="$OPENCLAW_PREFIX/openclaw.json"
export PATH="$OPENCLAW_PREFIX/bin:$OPENCLAW_PREFIX/tools/node/bin:$PATH"

# Activate the Python virtual environment (run setup if not present)
if [ ! -f ".venv/bin/activate" ]; then
    echo "Virtual environment not found. Running setup.sh first..."
    ./setup.sh
fi
source .venv/bin/activate

# Reinstall OpenClaw CLI if missing (e.g. corrupted install)
if [ ! -x "$OPENCLAW_PREFIX/bin/openclaw" ]; then
    echo "OpenClaw CLI not found. Reinstalling..."
    npm install -g --prefix "$OPENCLAW_PREFIX" openclaw
fi

# Initialize OpenClaw configuration if not already onboarded
if [ ! -f "$OPENCLAW_PREFIX/.onboarded" ]; then
    echo "First startup: onboarding OpenClaw..."
    openclaw onboard \
        --non-interactive \
        --auth-choice gemini-api-key \
        --gemini-api-key "$GEMINI_API_KEY" \
        --accept-risk \
        --skip-health
    touch "$OPENCLAW_PREFIX/.onboarded"
fi

if [ ! -f "$CONFIG" ]; then
    echo "ERROR: Config file not found at expected path: $CONFIG"
    echo "OpenClaw onboarding may have failed or written to the wrong location."
    exit 1
fi

# Configure gateway parameters, allowed plugins, and local workspace paths
export BACKEND_PORT=10000
export OPENCLAW_GATEWAY_TOKEN="34e4d57af2be264ad2f405c588ba4d26c79a1cd5ea7ebece"
echo "Gateway token is: $OPENCLAW_GATEWAY_TOKEN"

jq --arg ws "$PROJECT_ROOT/agent" '
  .plugins.entries = {
    "google": {"enabled": true},
    "tool-approval": {"enabled": true},
    "file-preview": {"enabled": true} }|
  .plugins.allow = ["tool-approval", "file-preview"] |
  .tools.alsoAllow = ["file-open"] |
  .tools.profile = "coding" |
  .tools.exec = {"host": "gateway", "security": "full", "ask": "off"} |
  .gateway.auth.token = env.OPENCLAW_GATEWAY_TOKEN |
  .gateway.mode = "local" |
  .gateway.bind = "loopback" |
  .agents.defaults.workspace = $ws |
  .agents.defaults.model.primary = "google/gemini-3.1-flash-lite" |
  .agents.defaults.memorySearch = {"provider": "gemini"} |
  .hooks.internal.enabled = true |
  .hooks.internal.entries["boot-md"].enabled = true |
  .hooks.internal.entries["bootstrap-extra-files"].enabled = true |
  .hooks.internal.entries["bootstrap-extra-files"].config.files = ["RUNNING_SIMULATIONS.md", "FILE_ORGANIZATION.md"]
' "$CONFIG" > "$CONFIG.tmp"

mv "$CONFIG.tmp" "$CONFIG"

cleanup() {
    echo "Shutting down servers..."
    kill "$GATEWAY_PID" 2>/dev/null || true
    kill "$BACKEND_PID" 2>/dev/null || true
    exit
}
trap cleanup SIGINT SIGTERM

echo "Starting OpenClaw Gateway..."
openclaw gateway run &
GATEWAY_PID=$!

sleep 2
if ! ps -p "$GATEWAY_PID" > /dev/null; then
    echo "OpenClaw Gateway failed to start!"
    exit 1
fi

echo "Starting FastAPI backend..."
cd "$PROJECT_ROOT/platform/backend"
PORT=$BACKEND_PORT uvicorn main:app --host 0.0.0.0 --port $BACKEND_PORT &
BACKEND_PID=$!

# Wait for both processes to complete
wait "$GATEWAY_PID" "$BACKEND_PID" || true
