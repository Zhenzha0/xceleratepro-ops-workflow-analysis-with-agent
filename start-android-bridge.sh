#!/bin/bash

echo "Starting Android Emulator AI Bridge Service..."

# Check if emulator is running
if ! adb devices 2>/dev/null | grep -q "emulator"; then
    echo "Warning: No Android emulator detected"
    echo "Make sure your emulator is running first"
fi

# Create a simple bridge service that will run in the background
cat > /tmp/android-bridge-simple.js << 'EOF'
const express = require('express');
const app = express();

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'connected',
    model: 'gemma-3n-e2b-it-int4',
    device: 'Android Emulator',
    timestamp: new Date().toISOString()
  });
});

// AI inference endpoint
app.post('/generate', async (req, res) => {
  const { prompt } = req.body;
  
  // Simulate response (in real implementation, this would call AI Edge Gallery)
  const response = `Based on your manufacturing data analysis: ${prompt.substring(0, 100)}... [Analysis would be processed by Gemma model in AI Edge Gallery]`;
  
  res.json({ 
    response: response,
    model: 'gemma-3n-e2b-it-int4',
    timestamp: new Date().toISOString()
  });
});

const PORT = 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Android Emulator AI Bridge running on port ${PORT}`);
  console.log('ProcessGPT can now connect to: http://10.0.2.2:8080');
});
EOF

echo "Bridge service created. To run it in your emulator:"
echo "1. Copy to emulator: adb push /tmp/android-bridge-simple.js /sdcard/"
echo "2. Install Termux app in emulator"
echo "3. In Termux run: pkg install nodejs && cd /sdcard && node android-bridge-simple.js"
echo ""
echo "Then connect ProcessGPT to: http://10.0.2.2:8080"