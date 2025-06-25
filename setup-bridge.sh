#!/bin/bash

echo "Setting up Android Emulator AI Bridge..."

# Check if emulator is accessible
if ! adb devices | grep -q "emulator"; then
    echo "No Android emulator detected. Please start your emulator first."
    exit 1
fi

echo "Android emulator detected ✓"

# Push bridge service to emulator
echo "Installing bridge service..."
adb push android-emulator-bridge.js /sdcard/
adb shell "mkdir -p /data/local/tmp/bridge"
adb push android-emulator-bridge.js /data/local/tmp/bridge/

echo "Bridge service installed ✓"

# Install Node.js in emulator (if needed)
echo "Setting up Node.js environment..."
adb shell "which node || echo 'Node.js not found - manual installation required'"

echo "To complete setup:"
echo "1. Download Gemma-3n-E2B-it-int4 in AI Edge Gallery"
echo "2. Start bridge service: node /data/local/tmp/bridge/android-emulator-bridge.js"
echo "3. Connect ProcessGPT to Android Emulator AI"

echo "Bridge setup complete!"