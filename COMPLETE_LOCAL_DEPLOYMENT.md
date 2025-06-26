# Complete Local Deployment Guide
## Run ProcessGPT Locally with Phi-2 AI Model

This guide shows you how to run the entire ProcessGPT manufacturing analytics platform on your local computer with complete data privacy using the Phi-2 .task model.

## Prerequisites

1. **Node.js 18 or higher**
   - Download from: https://nodejs.org
   - Check version: `node --version`

2. **Python 3.8 or higher**
   - Download from: https://python.org
   - Check version: `python --version`

3. **PostgreSQL Database**
   - Download from: https://postgresql.org
   - Or use Docker: `docker run --name postgres -e POSTGRES_PASSWORD=mypassword -p 5432:5432 -d postgres`

4. **Phi-2 Model (.task file)**
   - You'll get this from ChatGPT or other source
   - Should be named: `phi-2-instruct-int4.task`
   - Size: approximately 1.5-2GB

## Step 1: Download ProcessGPT Application

```bash
# Clone or download the application files
# (You'll need to copy all files from this Replit to your local machine)

# Create project directory
mkdir processgpt-local
cd processgpt-local

# Copy all project files here
```

## Step 2: Install Node.js Dependencies

```bash
npm install
```

## Step 3: Install Python Dependencies

```bash
pip install torch transformers mediapipe numpy accelerate
```

## Step 4: Setup Local Database

### Option A: Using Docker (Recommended)
```bash
# Start PostgreSQL in Docker
docker run --name processgpt-db \
  -e POSTGRES_DB=processgpt \
  -e POSTGRES_USER=processgpt \
  -e POSTGRES_PASSWORD=processgpt123 \
  -p 5432:5432 \
  -d postgres:16

# Wait 10 seconds for database to start
```

### Option B: Using Local PostgreSQL
```bash
# Create database and user
psql -U postgres -c "CREATE DATABASE processgpt;"
psql -U postgres -c "CREATE USER processgpt WITH PASSWORD 'processgpt123';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE processgpt TO processgpt;"
```

## Step 5: Setup Environment Configuration

Create `.env` file:
```bash
echo 'DATABASE_URL=postgresql://processgpt:processgpt123@localhost:5432/processgpt
USE_LOCAL_AI=true
PHI2_MODEL_PATH=./models/phi2/phi-2-instruct-int4.task
OPENAI_API_KEY=your-openai-key-as-fallback' > .env
```

## Step 6: Place Your Phi-2 Model

```bash
# Create model directory
mkdir -p models/phi2

# Place your .task file here
# Copy phi-2-instruct-int4.task to models/phi2/phi-2-instruct-int4.task
```

## Step 7: Initialize Database

```bash
# Push database schema
npm run db:push

# Import sample manufacturing data
npm run import-data
```

## Step 8: Test Phi-2 Connection

```bash
python scripts/test-phi2-task.py ./models/phi2/phi-2-instruct-int4.task
```

You should see:
```
✓ Found .task file: ./models/phi2/phi-2-instruct-int4.task (1500.0 MB)
✓ MediaPipe 0.10.x available
✓ Phi-2 response: Manufacturing process mining is...
✓ Phi-2 .task integration successful!
```

## Step 9: Start ProcessGPT Locally

```bash
npm run dev
```

The application will start on: `http://localhost:5000`

## Step 10: Switch to Local AI

1. Open ProcessGPT in browser: `http://localhost:5000`
2. Go to ProcessGPT tab (AI Assistant)
3. Click "Use Phi-2 Local AI" button
4. Verify connection shows: "✓ Phi-2 (Microsoft) - Local Integration"

## Verification Checklist

- [ ] Database connection working
- [ ] Manufacturing data imported (301 cases)
- [ ] Phi-2 model responds to test queries
- [ ] ProcessGPT interface loads
- [ ] Local AI mode active
- [ ] All analysis functions working (anomalies, failures, timing)

## Troubleshooting

### Database Issues
```bash
# Check database connection
psql postgresql://processgpt:processgpt123@localhost:5432/processgpt -c "SELECT count(*) FROM process_cases;"
```

### Phi-2 Model Issues
```bash
# Verify .task file
ls -la models/phi2/
file models/phi2/phi-2-instruct-int4.task

# Test MediaPipe
python -c "import mediapipe; print('MediaPipe version:', mediapipe.__version__)"
```

### Memory Issues
If Phi-2 runs out of memory:
```bash
# Use smaller model or increase swap space
# On Windows: System Properties > Advanced > Virtual Memory
# On Linux: sudo fallocate -l 4G /swapfile && sudo mkswap /swapfile
```

## Complete Data Privacy

Once running locally:
- ✓ No external API calls to OpenAI/Google
- ✓ All AI processing happens on your machine
- ✓ Manufacturing data stays on your computer
- ✓ Full offline operation capability
- ✓ All 25+ ProcessGPT analysis functions preserved

## Performance Expectations

- **Startup time**: 30-60 seconds (loading Phi-2 model)
- **Query response**: 3-10 seconds per question
- **Memory usage**: 4-8GB RAM (depending on model size)
- **Storage**: 5-10GB total (including model and data)

Your ProcessGPT is now running completely locally with full manufacturing analytics capabilities and complete data privacy!