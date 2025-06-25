# ProcessGPT Local AI Configuration Guide

## Overview
After setting up Gemma 2 on Google Colab, you need to configure ProcessGPT to use your local AI service instead of OpenAI.

## Step-by-Step Configuration

### Step 1: Get Your Tunnel URL
From your Google Colab setup, you should have received a tunnel URL like:
```
https://abc123.loca.lt
```

### Step 2: Access AI Configuration
1. In ProcessGPT, click on the sidebar
2. Select "AI Configuration" (last item in the menu)
3. You'll see the AI Service Configuration panel

### Step 3: Configure Local AI
1. **Enter Tunnel URL**: Paste your Google Colab tunnel URL in the "Google Colab Tunnel URL" field
2. **Switch Service**: Click "Use Local AI (Gemma 2)" button
3. **Verify Connection**: The system will test the connection and show status

### Step 4: Verify Setup
You should see:
- Current Service: "Local Gemma 2"
- Status: "Connected" (green badge)
- Connection Test: Success with your tunnel URL

### Step 5: Test ProcessGPT
1. Go to "ProcessGPT" tab in the sidebar
2. Ask a test question: "Which hour has the highest concentration of failures?"
3. Verify you get a response with real manufacturing data

## Configuration Panel Features

### Status Indicators
- **Connected**: Green badge - Local AI is working
- **Disconnected**: Red badge - Cannot reach local AI
- **OpenAI**: Blue badge - Using OpenAI service

### Connection Testing
The system automatically tests your local AI connection every 10 seconds and shows:
- URL being tested
- Connection success/failure
- Error messages if connection fails

### Quick Switching
You can instantly switch between:
- **Local AI (Gemma 2)**: Your private Google Colab instance
- **OpenAI (GPT-4o)**: Cloud-based OpenAI service

## Troubleshooting

### "Connection Failed" Error
- Verify your Google Colab notebook is still running
- Check the tunnel URL is correct and accessible
- Try refreshing the Google Colab tunnel

### "Host Required" Error
- Make sure you entered the complete tunnel URL including https://
- URL should look like: https://something.loca.lt

### ProcessGPT Not Responding
- Check the AI Configuration shows "Connected" status
- Verify the tunnel URL is accessible in your browser
- Try switching back to OpenAI and then back to Local AI

## Success Indicators

✅ **AI Configuration shows**: "Connected" status with green badge
✅ **ProcessGPT responds**: Answers manufacturing questions normally
✅ **Function preservation**: All analysis types continue working
✅ **Data privacy**: Manufacturing data stays in your database
✅ **Performance**: 2-3 second response times

## Switching Back to OpenAI

If you need to switch back:
1. Go to AI Configuration
2. Click "Use OpenAI (GPT-4o)"
3. ProcessGPT will immediately use OpenAI again

Your local AI setup remains available for future use.