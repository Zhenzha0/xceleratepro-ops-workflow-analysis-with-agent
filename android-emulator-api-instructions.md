# Android Emulator AI API Connection

## Step 1: Set Up Bridge Service in Emulator

The Gemma model is downloaded! Now you need to run a bridge service in your Android emulator to connect it to ProcessGPT.

### Copy Bridge Service to Emulator
```bash
# Copy the bridge service to your emulator
adb push android-emulator-bridge.js /sdcard/bridge.js

# Or use Android Studio Device File Explorer:
# 1. Open Android Studio → View → Tool Windows → Device File Explorer
# 2. Navigate to /sdcard/
# 3. Upload android-emulator-bridge.js
```

### Run Bridge Service in Emulator
In your Android emulator:
1. Install **Termux** app from Play Store (terminal emulator)
2. Open Termux and run:
```bash
# Install Node.js in Termux
pkg install nodejs

# Navigate to the bridge file
cd /sdcard

# Run the bridge service
node bridge.js
```

The service will start on port 8080 in your emulator.

## Step 2: Connect ProcessGPT

### API URL to Use
Use this exact URL in your ProcessGPT AI Configuration:
```
http://10.0.2.2:8080
```

### Where to Put It
1. Go to ProcessGPT sidebar → "AI Configuration"
2. Find "Android Emulator AI" section
3. Enter Host: `http://10.0.2.2:8080`
4. Click "Use Android Emulator AI"

## Step 3: Test Connection

Try asking ProcessGPT:
- "Which activity has the highest failure rate?"
- "What are the most common failure causes?"

The query will go:
ProcessGPT → Bridge Service → Gemma Model → Back to ProcessGPT

## Alternative: Try "Try it" Button First

Before setting up the bridge, try clicking the **"Try it"** button in AI Edge Gallery to test if Gemma works directly in the emulator.