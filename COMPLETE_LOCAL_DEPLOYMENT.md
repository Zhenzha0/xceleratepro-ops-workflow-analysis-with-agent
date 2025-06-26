# Complete ProcessGPT Local Deployment with Phi-2 Integration

## Overview
This guide deploys the entire ProcessGPT application on your local machine with Phi-2 MediaPipe integration for complete data privacy and offline operation.

## Prerequisites Checklist

✅ **Node.js 20+** installed  
✅ **PostgreSQL** installed locally  
✅ **Phi-2 model** downloaded from MediaPipe (see PHI2_DOWNLOAD_GUIDE.md)  
✅ **Git** installed  
✅ **8GB+ RAM** available  
✅ **10GB+ disk space** available  

## Step 1: Download Complete ProcessGPT Application

### Download from Replit
```bash
# Method 1: Direct download
# Go to your Replit project
# Click menu → "Download as zip"
# Extract to desired location
unzip ProcessGPT.zip -d /path/to/your/folder/

# Method 2: Git clone (if available)
git clone https://replit.com/@yourusername/ProcessGPT.git
cd ProcessGPT
```

### Verify Complete Download
```bash
# Check essential directories exist
ls -la
# Should see:
# client/          (React frontend)
# server/          (Express backend)
# shared/          (Database schemas)
# sample_data.csv  (Your manufacturing data)
# package.json     (Dependencies)

# Check critical files
ls server/services/
# Should see all analysis services:
# ai-analyst.ts
# failure-analyzer-enhanced.ts
# timing-analyzer.ts
# trend-analyzer.ts
# phi2-mediapipe-service.ts
```

## Step 2: Set Up Local PostgreSQL Database

### Install PostgreSQL
```bash
# Windows (using chocolatey)
choco install postgresql

# Mac (using homebrew)
brew install postgresql
brew services start postgresql

# Linux (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Create ProcessGPT Database
```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE processgpt;
CREATE USER processgpt_user WITH PASSWORD 'secure_password_123';
GRANT ALL PRIVILEGES ON DATABASE processgpt TO processgpt_user;

# Exit PostgreSQL
\q
```

### Test Database Connection
```bash
# Test connection
psql -h localhost -U processgpt_user -d processgpt
# Enter password when prompted
# If successful, you'll see: processgpt=>
\q
```

## Step 3: Configure Phi-2 Model Integration

### Copy Model Files
```bash
# Create models directory in ProcessGPT
mkdir -p models/phi2

# Copy your downloaded Phi-2 model (.task bundle)
cp /path/to/phi-2-instruct-int4.task models/phi2/

# Verify model file
ls -la models/phi2/
# Should show: phi-2-instruct-int4.task (1.5-2GB bundled file)
```

### Update Phi-2 Service Configuration
```bash
# Edit the Phi-2 service file
nano server/services/phi2-mediapipe-service.ts
```

Replace the placeholder MediaPipe initialization:
```typescript
// Replace the initializeMediaPipe method with:
private async initializeMediaPipe() {
  try {
    // Import MediaPipe text generation
    const { TextGeneration } = await import('@mediapipe/tasks-genai');
    
    // Initialize with your Phi-2 model (.task bundle)
    this.mediapipeTask = await TextGeneration.createFromOptions({
      baseOptions: {
        modelAssetPath: './models/phi2/phi-2-instruct-int4.task'
      }
    });
    
    this.isInitialized = true;
    console.log('✓ Phi-2 MediaPipe initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Phi-2 MediaPipe:', error);
    this.isInitialized = false;
  }
}

// Replace the callPhi2 method with:
private async callPhi2(prompt: string): Promise<string> {
  if (!this.mediapipeTask) {
    throw new Error('Phi-2 MediaPipe not initialized');
  }

  try {
    const result = await this.mediapipeTask.generate(prompt, {
      maxTokens: 512,
      temperature: 0.7,
      topK: 40
    });
    return result.generatedText || 'No response generated';
  } catch (error: any) {
    console.error('Phi-2 generation failed:', error);
    throw error;
  }
}
```

## Step 4: Install Dependencies and Configure Environment

### Install All Dependencies
```bash
# Navigate to ProcessGPT directory
cd ProcessGPT

# Install Node.js dependencies
npm install

# Install MediaPipe tasks for text generation
npm install @mediapipe/tasks-genai @mediapipe/tasks-text
```

### Create Environment Configuration
```bash
# Create .env file
cat > .env << EOF
# ProcessGPT Local Configuration
NODE_ENV=development
PORT=5000

# Database Configuration
DATABASE_URL=postgresql://processgpt_user:secure_password_123@localhost:5432/processgpt
PGHOST=localhost
PGPORT=5432
PGUSER=processgpt_user
PGPASSWORD=secure_password_123
PGDATABASE=processgpt

# AI Configuration - Use Phi-2 by default
USE_PHI2_MEDIAPIPE=true
PHI2_MODEL_PATH=./models/phi2/phi-2-instruct-int4.task

# Optional: OpenAI fallback (remove if not needed)
# OPENAI_API_KEY=your_openai_key_if_desired

# Development settings
VITE_API_URL=http://localhost:5000
EOF
```

### Update Package.json Scripts
```bash
# Add model download script to package.json
cat > package.json << EOF
{
  "name": "processgpt-local",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx server/index.ts",
    "build": "npm run build:client && npm run build:server",
    "build:client": "vite build --outDir dist/public",
    "build:server": "esbuild server/index.ts --bundle --platform=node --outfile=dist/index.js --external:sharp",
    "start": "node dist/index.js",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "import-data": "tsx scripts/import-sample-data.ts",
    "setup-local": "tsx scripts/setup-local-environment.ts",
    "test-phi2": "tsx scripts/test-phi2-connection.ts"
  }
}
EOF
```

## Step 5: Set Up Database Schema and Import Data

### Initialize Database Schema
```bash
# Push database schema to PostgreSQL
npm run db:push

# Verify tables created
psql -h localhost -U processgpt_user -d processgpt -c "\dt"
# Should show tables: process_events, process_activities, process_cases, etc.
```

### Import Manufacturing Data
```bash
# Ensure sample_data.csv is in root directory
ls -la sample_data.csv

# Import your manufacturing data
npm run import-data

# Verify data import
psql -h localhost -U processgpt_user -d processgpt -c "SELECT COUNT(*) FROM process_cases;"
# Should show: 301

psql -h localhost -U processgpt_user -d processgpt -c "SELECT COUNT(*) FROM process_events;"
# Should show: 9471
```

## Step 6: Configure Phi-2 as Default AI Service

### Update AI Service Factory Default
```bash
# Edit server/services/ai-service-factory.ts
nano server/services/ai-service-factory.ts
```

Change the default service:
```typescript
export class AIServiceFactory {
  private static useGemma2 = false;
  private static usePhi2MediaPipe = true; // Set Phi-2 as default
  private static gemma2Service = new Gemma2Service();
```

### Create Phi-2 Test Script
```bash
# Create test script
cat > scripts/test-phi2-connection.ts << EOF
import { phi2MediaPipeService } from '../server/services/phi2-mediapipe-service';

async function testPhi2Connection() {
  console.log('Testing Phi-2 MediaPipe connection...');
  
  try {
    const status = await phi2MediaPipeService.testConnection();
    console.log('Connection status:', status);
    
    if (status.status === 'connected') {
      console.log('✓ Phi-2 MediaPipe is working correctly!');
    } else {
      console.log('✗ Phi-2 MediaPipe connection failed:', status.version);
    }
  } catch (error) {
    console.error('✗ Phi-2 test failed:', error);
  }
}

testPhi2Connection();
EOF
```

## Step 7: Start Complete Local ProcessGPT System

### Start Development Server
```bash
# Start the complete ProcessGPT application
npm run dev

# You should see:
# ✓ Phi-2 MediaPipe initialized successfully
# ProcessGPT ready with local AI
# [express] serving on port 5000
```

### Test Phi-2 Integration
```bash
# In another terminal, test Phi-2
npm run test-phi2

# Expected output:
# ✓ Phi-2 MediaPipe is working correctly!
```

### Access Local ProcessGPT
```bash
# Open your browser to:
http://localhost:5173

# You should see:
# - Complete ProcessGPT dashboard
# - All your manufacturing data (301 cases)
# - All analysis tabs working
# - ProcessGPT chat interface ready
```

## Step 8: Verify Complete System Operation

### Test Dashboard Functionality
1. **Navigate to Dashboard tab**
   - Should show 301 cases, 342 anomalies
   - All metrics should display correctly
   - Charts should render with your data

2. **Test Process Maps**
   - Should show actual manufacturing stations
   - Sankey diagrams should render properly
   - Bottleneck analysis should work

3. **Test ProcessGPT with Phi-2**
   - Go to AI Assistant tab
   - Click "Use Phi-2 Edge" button
   - Ask: "What are the main failure patterns?"
   - Should get response from local Phi-2 model

### Verify Offline Operation
```bash
# Disconnect internet
# ProcessGPT should continue working fully
# All analysis functions should work
# Phi-2 should respond normally
```

## Step 9: Performance Optimization

### Monitor System Resources
```bash
# Check memory usage
htop
# ProcessGPT + Phi-2 should use ~4-6GB RAM

# Check disk usage
df -h
# Should show ~8-10GB used for complete system
```

### Optimize Phi-2 Performance
```bash
# Edit .env for performance tuning
echo "PHI2_MAX_TOKENS=256" >> .env
echo "PHI2_TEMPERATURE=0.5" >> .env
echo "PHI2_BATCH_SIZE=1" >> .env
```

## Step 10: Create Startup Scripts

### Windows Startup Script
```batch
REM create start_processgpt.bat
@echo off
echo Starting ProcessGPT with Phi-2 MediaPipe...
cd /d C:\path\to\ProcessGPT
npm run dev
pause
```

### Mac/Linux Startup Script
```bash
# create start_processgpt.sh
#!/bin/bash
echo "Starting ProcessGPT with Phi-2 MediaPipe..."
cd /path/to/ProcessGPT
npm run dev
```

```bash
# Make executable
chmod +x start_processgpt.sh
```

## Final Verification Checklist

✅ **PostgreSQL** running with ProcessGPT database  
✅ **Manufacturing data** imported (301 cases, 9,471 events)  
✅ **Phi-2 model** loaded and responding  
✅ **ProcessGPT dashboard** displaying real data  
✅ **All analysis tabs** working correctly  
✅ **AI Assistant** using Phi-2 for responses  
✅ **Offline operation** confirmed  
✅ **Performance** acceptable (<6GB RAM usage)  

## Troubleshooting Common Issues

### Issue 1: Phi-2 Model Not Loading
```bash
# Check model file exists and permissions
ls -la models/phi2/phi-2-instruct-int4.tflite
chmod 644 models/phi2/phi-2-instruct-int4.tflite

# Check MediaPipe installation
npm list @mediapipe/tasks-genai
```

### Issue 2: Database Connection Failed
```bash
# Check PostgreSQL status
sudo systemctl status postgresql  # Linux
brew services list | grep postgresql  # Mac

# Test connection manually
psql -h localhost -U processgpt_user -d processgpt
```

### Issue 3: Out of Memory Errors
```bash
# Use smaller model variant
curl -O https://storage.googleapis.com/ai-edge-models/phi-2-instruct-int8.task

# Reduce batch size
echo "PHI2_BATCH_SIZE=1" >> .env
```

### Issue 4: Port Already in Use
```bash
# Change port in .env
echo "PORT=5001" >> .env
echo "VITE_API_URL=http://localhost:5001" >> .env
```

## Success Confirmation

When everything is working correctly, you should have:

🎯 **Complete Data Privacy** - All data processing happens locally  
🎯 **Offline Operation** - Works without internet connection  
🎯 **Fast Performance** - Phi-2 responses in <1 second  
🎯 **Full Functionality** - All 25+ ProcessGPT analysis types working  
🎯 **Real Manufacturing Data** - Your authentic dataset (301 cases)  
🎯 **Professional Interface** - Complete dashboard and visualization system  

Your ProcessGPT system now runs entirely on your local machine with Phi-2 providing intelligent analysis while maintaining complete data privacy and control.