#!/bin/bash
# run.sh - Runs the local environment with OpenClaw and the FastAPI backend
set -e

if [ -z "$GEMINI_API_KEY" ]; then
    echo "ERROR: GEMINI_API_KEY is not set. Please set it in your environment first:"
    echo "  export GEMINI_API_KEY='your-key-here'"
    exit 1
fi

PROJECT_ROOT="$(pwd)"
OPENCLAW_HOME="$HOME/.openclaw"
CONFIG="$OPENCLAW_HOME/openclaw.json"
export PATH="$PATH:$HOME/.bin"

# Activate the Python virtual environment (run setup if not present)
if [ ! -f "venv/bin/activate" ]; then
    echo "Virtual environment not found. Running setup.sh first..."
    ./setup.sh
fi
source venv/bin/activate

# Initialize OpenClaw configuration if not already onboarded
if [ ! -f "$CONFIG" ]; then
    echo "First startup: onboarding OpenClaw..."
    openclaw onboard \
        --non-interactive \
        --auth-choice custom-api-key \
        --custom-base-url "https://generativelanguage.googleapis.com/v1beta/openai/" \
        --custom-model-id "gemini-3.1-flash-lite" \
        --custom-api-key "$GEMINI_API_KEY" \
        --custom-compatibility openai \
        --accept-risk \
        --skip-health
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
  .tools.alsoAllow = ["file-open"] |
  .gateway.auth.token = env.OPENCLAW_GATEWAY_TOKEN |
  .gateway.mode = "local" |
  .gateway.bind = "loopback" |
  .agents.defaults.workspace = $ws |
  .agents.defaults.memorySearch = {"provider": "gemini"}
' "$CONFIG" > "$CONFIG.tmp" && mv "$CONFIG.tmp" "$CONFIG"

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
wait "$GATEWAY_PID" "$BACKEND_PID"
