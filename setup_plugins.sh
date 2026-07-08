#!/bin/bash

# List of plugins to process
PLUGINS=("file-preview" "tool-approval")

echo "Starting plugin compilation and installation..."

for plugin in "${PLUGINS[@]}"; do
    echo "----------------------------------------"
    echo "Processing plugin: $plugin"
    
    # Navigate to plugin folder
    cd "plugins/$plugin" || { echo "Failed to enter directory plugins/$plugin"; exit 1; }
    
    # Compile
    echo "Compiling..."
    npx tsc
    # Install
    echo "Installing..."
    # If the local directory has the structure for local install, we might need a different command
    # Based on the error, openclaw tried to download from npm.
    # Let's try installing from the current folder if possible,
    # but based on the docs link provided in the error, let's look at the project folder structure.
    # Actually, try:
    cd ..
    openclaw plugins install --force $plugin 
    
    # Return to project root
    cd ..
done

echo "----------------------------------------"
echo "All plugins processed successfully."

echo "Restarting OpenClaw to apply changes..."
openclaw gateway restart
echo "OpenClaw restarted successfully."

