# Complete Local Deployment Guide
## ProcessGPT with Gemma-2B-IT Local AI Integration

This guide shows you exactly how to run ProcessGPT on your local machine using your Gemma-2B-IT .task model for complete data privacy.

## Prerequisites Checklist

### System Requirements
- Windows 10/11, macOS 10.15+, or Linux Ubuntu 18.04+
- 8GB+ RAM (16GB recommended for smooth operation)
- 15GB+ free disk space
- Node.js 18 or higher
- Python 3.8 or higher
- PostgreSQL database

### Required Files
- Your Gemma-2B-IT .task file (the one you successfully created)
- ProcessGPT application files (copy from this Replit)
- Sample manufacturing data: `sample_data.csv`

## Step 1: Install System Dependencies

### Node.js Installation
```bash
# Download from: https://nodejs.org
# Verify installation:
node --version
npm --version
```

### Python Installation
```bash
# Download from: https://python.org
# Verify installation:
python --version
pip --version
```

### PostgreSQL Setup (Choose One Option)

**Option A: Docker (Recommended - Easier)**
```bash
# Install Docker Desktop first: https://docker.com
# Start PostgreSQL container:
docker run --name processgpt-db \
  -e POSTGRES_DB=processgpt \
  -e POSTGRES_USER=processgpt \
  -e POSTGRES_PASSWORD=processgpt123 \
  -p 5432:5432 \
  -d postgres:16

# Verify it's running:
docker ps
```

**Option B: Local PostgreSQL Installation**
```bash
# Download from: https://postgresql.org
# After installation, create database:
psql -U postgres -c "CREATE DATABASE processgpt;"
psql -U postgres -c "CREATE USER processgpt WITH PASSWORD 'processgpt123';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE processgpt TO processgpt;"
```

## Step 2: Download ProcessGPT Application

### Copy Files from Replit
1. Download all files from this Replit project
2. Create local directory: `mkdir processgpt-local`
3. Copy all files to this directory
4. Navigate to directory: `cd processgpt-local`

### Verify File Structure
```
processgpt-local/
├── client/
├── server/
├── shared/
├── models/           ← Create this directory
├── package.json
├── sample_data.csv
└── other files...
```

## Step 3: Install Application Dependencies

### Node.js Dependencies
```bash
# In your processgpt-local directory:
npm install

# Verify installation completed without errors
```

### Python AI Dependencies
```bash
# Install required packages for local AI:
pip install torch>=2.0.0
pip install transformers>=4.35.0
pip install mediapipe>=0.10.0
pip install numpy
pip install accelerate

# Verify MediaPipe installation:
python -c "import mediapipe; print('MediaPipe version:', mediapipe.__version__)"
```

## Step 4: Setup Your Gemma-2B-IT Model

### Create Model Directory
```bash
mkdir -p models/gemma
```

### Place Your .task File
```bash
# Copy your gemma-2b-it.task file to:
# models/gemma/gemma-2b-it.task

# Verify file placement:
ls -la models/gemma/gemma-2b-it.task
```

### Test Model File
```bash
# Create test script:
cat > test-gemma.py << 'EOF'
import os
from pathlib import Path

task_file = "./models/gemma/gemma-2b-it.task"
if os.path.exists(task_file):
    size_mb = os.path.getsize(task_file) / (1024 * 1024)
    print(f"✓ Found Gemma-2B-IT .task file ({size_mb:.1f} MB)")
    
    try:
        import mediapipe as mp
        print(f"✓ MediaPipe {mp.__version__} available")
        print("✓ Ready for local AI integration")
    except ImportError:
        print("✗ MediaPipe not available")
else:
    print(f"✗ Model file not found: {task_file}")
EOF

python test-gemma.py
```

## Step 5: Configure Environment

### Create Environment File
```bash
cat > .env << 'EOF'
# Database Configuration
DATABASE_URL=postgresql://processgpt:processgpt123@localhost:5432/processgpt

# Local AI Configuration
USE_LOCAL_AI=true
GEMMA_MODEL_PATH=./models/gemma/gemma-2b-it.task
AI_SERVICE=gemma-mediapipe

# OpenAI Fallback (optional)
OPENAI_API_KEY=your-openai-key-here

# Application Settings
NODE_ENV=development
PORT=5000
EOF
```

### Verify Environment
```bash
# Check environment variables:
cat .env
```

## Step 6: Initialize Database

### Push Database Schema
```bash
# Create database tables:
npm run db:push

# You should see output like:
# ✓ Database schema pushed successfully
```

### Import Manufacturing Data
```bash
# Import your manufacturing dataset:
npm run import-data

# Expected output:
# ✓ Inserted 301 process cases
# ✓ Inserted 9471 process events  
# ✓ Inserted 3157 process activities
# ✓ Manufacturing data import completed
```

### Verify Data Import
```bash
# Test database connection:
psql postgresql://processgpt:processgpt123@localhost:5432/processgpt -c "
SELECT 
  (SELECT count(*) FROM process_cases) as cases,
  (SELECT count(*) FROM process_events) as events,
  (SELECT count(*) FROM process_activities) as activities;
"

# Should show: cases: 301, events: 9471, activities: 3157
```

## Step 7: Start ProcessGPT Application

### Launch Application
```bash
# Start the development server:
npm run dev

# Wait for these messages:
# - ProcessGPT ready
# - Server running on port 5000
# - Database connection established
```

### Verify Application
```bash
# Open browser to: http://localhost:5000
# You should see the ProcessGPT dashboard with manufacturing data
```

## Step 8: Enable Gemma-2B-IT Local AI

### Access ProcessGPT Interface
1. Open browser: `http://localhost:5000`
2. Navigate to "ProcessGPT" tab (AI Assistant)
3. Look for AI service controls in the interface

### Switch to Local AI
1. Find "AI Service" controls in ProcessGPT interface
2. Click "Use Gemma-2B-IT Local AI" button
3. Wait for connection test (may take 30-60 seconds)
4. Verify status shows: "Gemma-2B-IT (Google) - Local MediaPipe Integration"

### Test Local AI
```bash
# In ProcessGPT interface, ask a test question:
"What is the failure rate in our manufacturing data?"

# Expected behavior:
# - Response generated using your local Gemma-2B-IT model
# - Real manufacturing data analysis (not synthetic)
# - Visualization charts auto-generated
# - No external API calls to OpenAI/Google
```

## Step 9: Verification Checklist

### System Health Checks
- [ ] Database shows 301 cases, 9471 events, 3157 activities
- [ ] ProcessGPT dashboard displays real manufacturing metrics
- [ ] All tabs load without errors (Dashboard, Process Maps, Anomalies, etc.)
- [ ] AI service status shows "Gemma-2B-IT Local Integration"

### AI Functionality Tests
- [ ] Ask: "What causes the most failures?" → Response uses real failure data
- [ ] Ask: "Which activity fails most often?" → Shows actual activity failure rates
- [ ] Ask: "Show me anomaly patterns" → Displays real anomaly detection results
- [ ] Ask: "What are the bottlenecks?" → Identifies actual processing delays

### Privacy Verification
- [ ] No network calls to external AI services (check browser network tab)
- [ ] All AI processing happens locally
- [ ] Manufacturing data never leaves your machine
- [ ] Can disconnect from internet and still use ProcessGPT

## Step 10: Performance Optimization

### Memory Management
```bash
# Check memory usage:
# Windows: Task Manager → Performance → Memory
# macOS: Activity Monitor → Memory
# Linux: htop or free -h

# Expected usage: 4-8GB RAM during AI queries
```

### Storage Cleanup
```bash
# Optional: Remove unnecessary files after setup:
rm test-gemma.py
```

## Troubleshooting Common Issues

### Database Connection Failed
```bash
# Check if PostgreSQL is running:
docker ps  # For Docker users
# OR
sudo systemctl status postgresql  # For Linux local install

# Restart if needed:
docker restart processgpt-db
```

### Gemma-2B-IT Model Not Loading
```bash
# Verify file exists and is readable:
ls -la models/gemma/gemma-2b-it.task
file models/gemma/gemma-2b-it.task

# Check MediaPipe installation:
pip list | grep mediapipe
python -c "from mediapipe.tasks import python; print('MediaPipe tasks available')"
```

### Out of Memory Errors
```bash
# Increase system swap space:
# Windows: Control Panel → System → Advanced → Performance → Virtual Memory
# macOS: No action needed (automatic)
# Linux: sudo fallocate -l 8G /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
```

### Import Errors During AI Processing
```bash
# Reinstall Python dependencies:
pip uninstall mediapipe transformers torch
pip install torch>=2.0.0 transformers>=4.35.0 mediapipe>=0.10.0
```

## Success Indicators

You'll know everything is working correctly when:

1. **Dashboard shows real data**: 301 manufacturing cases with actual metrics
2. **Local AI responds**: Gemma-2B-IT generates responses to manufacturing questions
3. **Authentic analysis**: All statistics come from your real dataset
4. **Complete privacy**: No external network calls during AI processing
5. **Full functionality**: All 25+ ProcessGPT analysis types working locally

## What You've Achieved

- ✅ Complete local ProcessGPT deployment
- ✅ Gemma-2B-IT AI integration with .task format
- ✅ Full manufacturing analytics with real data
- ✅ Complete data privacy and offline operation
- ✅ All ProcessGPT capabilities preserved locally
- ✅ No dependency on external AI services

Your ProcessGPT is now running completely locally with your custom Gemma-2B-IT model and maintains all sophisticated manufacturing analytics capabilities while ensuring complete data privacy.