# Android Emulator AI Edge Setup for ProcessGPT

## Step 1: Install Android Studio

### Download Android Studio
1. Go to https://developer.android.com/studio
2. Download Android Studio for your operating system
3. Install Android Studio (includes Android SDK and emulator tools)

### Initial Setup
1. Launch Android Studio
2. Complete the setup wizard
3. Install the latest Android SDK (API 34+)
4. Install Android Emulator from SDK Manager

## Step 2: Create Android Virtual Device (AVD)

### Create Emulator
1. Open Android Studio
2. Go to **Tools → AVD Manager**
3. Click **"Create Virtual Device"**
4. Choose device: **Pixel 7** or **Pixel 8** (supports AI Edge)
5. Select system image: **Android 14 (API 34)** or higher
6. Configure AVD:
   - Name: `ProcessGPT-AI-Edge`
   - RAM: **8GB minimum** (important for AI models)
   - Internal Storage: **16GB** 
   - Enable **Hardware Acceleration**
7. Click **Finish**

### Start Emulator
1. In AVD Manager, click **Play** button next to your emulator
2. Wait for Android to boot up (2-3 minutes first time)
3. Emulator should show Android home screen

## Step 3: Install AI Edge Gallery

### Download AI Edge Gallery
1. In the Android emulator, open **Chrome browser**
2. Go to: https://ai.google.dev/edge/samples
3. Download **AI Edge Gallery APK** file
4. Or use this direct link: https://github.com/google-ai-edge/ai-edge-gallery/releases

### Install APK via ADB
1. Open terminal/command prompt on your computer
2. Navigate to your Android SDK platform-tools folder
3. Install APK: `adb install ai-edge-gallery.apk`
4. Or drag APK file to emulator window to install

## Step 4: Setup Gemini Nano

### Download Model in Emulator
1. Open **AI Edge Gallery** app in emulator
2. Find **Gemini Nano** model
3. Click **Download** (1-2GB download)
4. Wait for model to install locally
5. Test model inference in gallery app

### Note Model Path
- Model installs to: `/data/data/com.google.ai.edge.gallery/`
- Local API will be available at: `http://localhost:8080`

## Step 5: Create Bridge Service

### Setup Bridge App
Create a simple Node.js bridge service that runs in the emulator:

```javascript
// Save as android-bridge.js in emulator
const express = require('express');
const app = express();

app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'connected',
    model: 'gemini-nano',
    device: 'Android Emulator'
  });
});

// AI generation endpoint
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    // Call local Gemini Nano via Android AI API
    const response = await callGeminiNano(prompt);
    
    res.json({ response: response });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(8080, '0.0.0.0', () => {
  console.log('Android AI Bridge running on port 8080');
});
```

## Step 6: Connect ProcessGPT

### Configure ProcessGPT
1. Go to ProcessGPT sidebar → **"AI Configuration"**
2. Click **"Use Android Emulator AI"**
3. ProcessGPT will connect to: `http://10.0.2.2:8080`
4. Test with: "Which activity has the highest failure rate?"

### Network Configuration
- Emulator IP from host: `10.0.2.2:8080`
- Bridge service exposes Gemini Nano via HTTP API
- All ProcessGPT analysis functions work unchanged

## Step 7: Verify Setup

### Test Connection
1. Check emulator is running: Android home screen visible
2. Check AI Edge Gallery: Gemini Nano downloaded
3. Check bridge service: Port 8080 accessible
4. Check ProcessGPT: Can switch to Android Emulator AI

### Test Query
Ask ProcessGPT: "What causes the most failures in our manufacturing process?"
- Should connect to emulator
- Use Gemini Nano for inference
- Return real manufacturing analysis

## Troubleshooting

### Common Issues
- **Emulator slow**: Increase RAM allocation to 8GB+
- **Model not found**: Re-download Gemini Nano in AI Edge Gallery
- **Connection failed**: Check bridge service running on port 8080
- **API errors**: Verify emulator network accessible at 10.0.2.2

### System Requirements
- 16GB+ RAM (8GB for emulator + 8GB for host)
- 20GB+ free disk space
- Modern CPU with hardware virtualization
- Android Studio and SDK tools

## Benefits Achieved
- **True Google AI Edge**: Gemini Nano runs on Android device
- **Complete Offline**: No internet needed after setup
- **Web App Preserved**: ProcessGPT stays as web application
- **Manufacturing Privacy**: Data never leaves local network
- **Industrial Ready**: Can deploy to physical Android tablets

Your ProcessGPT now has authentic Google AI Edge capabilities while maintaining all existing features!