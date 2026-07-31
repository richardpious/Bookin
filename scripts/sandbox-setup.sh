#!/bin/bash
set -e

# Change to the project root directory
cd "$(dirname "$0")/.."

echo "Building OpenClaw Sandbox image with BookSim..."
docker build --load -t openclaw-sandbox:bookworm-slim -f scripts/Dockerfile.sandbox .

echo "Build complete! The openclaw-sandbox:bookworm-slim image is now ready."
