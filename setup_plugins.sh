#!/bin/bash

PLUGINS=("file-preview" "tool-approval")

echo "Starting plugin compilation and installation..."

for plugin in "${PLUGINS[@]}"; do
    echo "----------------------------------------"
    echo "Processing plugin: $plugin"
    
    cd "plugins/$plugin" || { echo "Failed to enter directory plugins/$plugin"; exit 1; }
    
    echo "Compiling..."
    npx tsc
    
    echo "Installing..."

    cd ..
    openclaw plugins install --force $plugin 
    
    cd ..
done

echo "----------------------------------------"
echo "All plugins processed successfully."

echo "Restarting OpenClaw to apply changes..."
openclaw gateway restart
echo "OpenClaw restarted successfully."

