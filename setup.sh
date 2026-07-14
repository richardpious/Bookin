#!/bin/bash
# setup.sh - Installs system dependencies, node modules, compiles plugins & backend, and installs OpenClaw
set -e

PROJECT_ROOT="$(pwd)"

echo "=== 1. Checking / Installing System Dependencies ==="

check_cmd() {
    command -v "$1" &>/dev/null
}

MISSING_DEPS=()
check_cmd jq || MISSING_DEPS+=("jq")
check_cmd python3 || MISSING_DEPS+=("python3")
check_cmd curl || MISSING_DEPS+=("curl")
check_cmd rg || MISSING_DEPS+=("ripgrep")
check_cmd make || MISSING_DEPS+=("build-essential")
check_cmd flex || MISSING_DEPS+=("flex")
check_cmd bison || MISSING_DEPS+=("bison")

if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
    echo "Missing dependencies: ${MISSING_DEPS[*]}"
    if command -v apt-get &>/dev/null; then
        echo "Installing missing dependencies via apt-get..."
        SUDO=""
        if [ "$EUID" -ne 0 ] && command -v sudo &>/dev/null; then
            SUDO="sudo"
        fi
        $SUDO apt-get update
        $SUDO apt-get install -y jq python3 python3-pip python3-venv curl ripgrep build-essential flex bison
    else
        echo "WARNING: apt-get not found. Please install the missing dependencies manually: ${MISSING_DEPS[*]}"
    fi
else
    echo "All system dependencies are already installed."
fi

# Install Node.js if not already present
if ! command -v node &> /dev/null; then
    echo "Installing Node.js (v22)..."
    if command -v apt-get &>/dev/null; then
        SUDO=""
        if [ "$EUID" -ne 0 ] && command -v sudo &>/dev/null; then
            SUDO="sudo"
        fi
        curl -fsSL https://deb.nodesource.com/setup_22.x | $SUDO bash -
        $SUDO apt-get install -y nodejs
    else
        echo "WARNING: apt-get not found. Please install Node.js (v22) manually."
    fi
else
    echo "Node.js is already installed: $(node -v)"
fi

echo "=== 2. Creating Python Virtual Environment ==="
python3 -m venv .venv
source .venv/bin/activate
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
# Install OpenClaw into the project directory so it persists on Replit
export OPENCLAW_HOME="$PROJECT_ROOT/.openclaw"
OPENCLAW_PREFIX="$PROJECT_ROOT/.openclaw"
export PATH="$OPENCLAW_PREFIX/bin:$OPENCLAW_PREFIX/tools/node/bin:$PATH"

if [ ! -x "$OPENCLAW_PREFIX/bin/openclaw" ]; then
    echo "Installing OpenClaw CLI to $OPENCLAW_PREFIX..."
    curl -fsSL https://openclaw.ai/install-cli.sh | bash -s -- --no-onboard --prefix "$OPENCLAW_PREFIX"
fi

echo "=== 8. Registering Plugins with OpenClaw ==="
openclaw plugins install "$PROJECT_ROOT/plugins/file-preview" --force
openclaw plugins install "$PROJECT_ROOT/plugins/tool-approval" --force

echo "=== Setup Complete ==="
echo "Make sure to set your GEMINI_API_KEY environment variable before running the app:"
echo "  export GEMINI_API_KEY='your-api-key'"
echo "Then start the servers using: ./run.sh"
