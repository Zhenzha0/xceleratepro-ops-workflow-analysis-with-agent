# Android Emulator Local AI Setup for ProcessGPT

## Overview
Use Android Emulator with Google AI Edge Gallery to host Gemini Nano locally and provide API endpoint for ProcessGPT web app.

## Architecture
```
ProcessGPT (Web App) → Android Emulator (Local API) → Gemini Nano (On-Device)
```

## Step-by-Step Setup

### Step 1: Install Android Studio & Emulator
1. Download Android Studio from https://developer.android.com/studio
2. Install Android Studio with SDK tools
3. Create a new Android Virtual Device (AVD):
   - Choose Pixel 7 or newer device
   - Select Android API 34+ (Android 14+)
   - Allocate 8GB+ RAM to emulator
   - Enable hardware acceleration

### Step 2: Download Google AI Edge Gallery
1. Open Android Emulator
2. Open Chrome browser in emulator
3. Go to: https://developer.android.com/ai/edge
4. Download AI Edge Gallery APK
5. Install APK in emulator: `adb install ai-edge-gallery.apk`

### Step 3: Setup Gemini Nano in Emulator
1. Open AI Edge Gallery app
2. Download Gemini Nano model (1-2GB download)
3. Test model inference in gallery
4. Note the local API endpoint (typically `http://10.0.2.2:8080`)

### Step 4: Create Bridge Service
Create a simple HTTP server in the emulator that exposes Gemini Nano:

```javascript
// android-ai-bridge.js (runs in emulator)
const express = require('express');
const { GoogleAI } = require('@google/generative-ai');

const app = express();
app.use(express.json());

// Initialize local Gemini Nano
const genAI = new GoogleAI({ 
  apiKey: 'local', // Not needed for on-device
  baseURL: 'http://localhost:8080' // Local emulator endpoint
});

app.post('/api/generate', async (req, res) => {
  try {
    const { prompt } = req.body;
    const model = genAI.getGenerativeModel({ model: 'gemini-nano' });
    const result = await model.generateContent(prompt);
    res.json({ response: result.response.text() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(8080, '0.0.0.0', () => {
  console.log('Android AI Bridge running on port 8080');
});
```

### Step 5: Configure ProcessGPT
Update ProcessGPT to connect to emulator endpoint:
- Local emulator IP: `http://10.0.2.2:8080` (from host machine)
- Bridge service provides OpenAI-compatible API
- All ProcessGPT analysis functions work unchanged

## Benefits
- **True Local AI**: Gemini Nano runs entirely on emulator
- **No Internet Required**: Complete offline operation after setup
- **API Compatible**: Works with existing ProcessGPT code
- **Cost Free**: No API usage costs
- **Private**: Manufacturing data never leaves local machine

## System Requirements
- 16GB+ RAM (8GB for emulator + 8GB for host)
- 10GB+ free disk space
- Modern CPU with virtualization support
- Android Studio and emulator tools

## Alternative: Physical Android Device
Instead of emulator, use a physical Android tablet:
1. Install AI Edge Gallery on tablet
2. Download Gemini Nano model
3. Run bridge service on tablet
4. Connect ProcessGPT to tablet's IP address
5. Deploy tablet on manufacturing floor

This approach gives you true Google AI Edge functionality while keeping ProcessGPT as a web application!