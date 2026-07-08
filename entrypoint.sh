#!/bin/bash
set -e

OPENCLAW_HOME="$HOME/.openclaw"

if [ ! -f "$OPENCLAW_HOME/openclaw.json" ]; then
    echo "First startup..."

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

CONFIG="$HOME/.openclaw/openclaw.json"

export OPENCLAW_GATEWAY_TOKEN="34e4d57af2be264ad2f405c588ba4d26c79a1cd5ea7ebece"
echo "Gateway token is: $OPENCLAW_GATEWAY_TOKEN"

jq '
.plugins.allow = ["file-preview","tool-approval"]| 
.gateway.auth.token = env.OPENCLAW_GATEWAY_TOKEN |
.agents.defaults.workspace = "/workspace/agent"
' "$CONFIG" > "$CONFIG.tmp" && mv "$CONFIG.tmp" "$CONFIG"  


echo "Starting gateway..."
openclaw gateway run &
sleep 5

echo "Starting servers..."
exec ./start_servers.sh