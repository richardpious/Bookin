#!/bin/bash
# setup.sh - Installs system dependencies, node modules, compiles plugins & backend, and installs OpenClaw
set -e

PROJECT_ROOT="$(pwd)"

echo "=== 1. Installing System Dependencies ==="
sudo apt-get update
sudo apt-get install -y jq python3 python3-pip python3-venv curl ripgrep build-essential flex bison

# Install Node.js if not already present
if ! command -v node &> /dev/null; then
    echo "Installing Node.js (v22)..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "Node.js is already installed: $(node -v)"
fi

echo "=== 2. Creating Python Virtual Environment ==="
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo "=== 3. Installing Root Node Dependencies ==="
npm install

echo "=== 4. Compiling Booksim ==="
cd "$PROJECT_ROOT/booksim/src"
make clean && make
cd "$PROJECT_ROOT"

echo "=== 5. Building Plugins ==="
cd "$PROJECT_ROOT/plugins/tool-approval"
npm install
npx tsc

cd "$PROJECT_ROOT/plugins/file-preview"
npm install
npx tsc

cd "$PROJECT_ROOT"

echo "=== 6. Building Frontend ==="
cd "$PROJECT_ROOT/platform/frontend/bookin"
npm install
npm run build
cd "$PROJECT_ROOT"

echo "=== 7. Installing OpenClaw CLI ==="
if ! command -v openclaw &> /dev/null; then
    echo "Installing OpenClaw CLI..."
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --no-onboard
    export PATH="$PATH:$HOME/.bin"
fi

# Ensure bin path is available
export PATH="$PATH:$HOME/.bin"

echo "=== 8. Registering Plugins with OpenClaw ==="
openclaw plugins install "$PROJECT_ROOT/plugins/file-preview" --force
openclaw plugins install "$PROJECT_ROOT/plugins/tool-approval" --force

echo "=== Setup Complete! ==="
echo "Make sure to set your GEMINI_API_KEY environment variable before running the app:"
echo "  export GEMINI_API_KEY='your-api-key'"
echo "Then start the servers using: ./run.sh"
