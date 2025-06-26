# ProcessGPT Local Setup - Quick Start

## What You Need
1. Your Gemma-2B-IT .task file (the one you created)
2. Node.js 18+ and Python 3.8+
3. PostgreSQL database (Docker recommended)

## 5-Minute Setup

### 1. Install Dependencies
```bash
# Install Node.js packages
npm install

# Install Python AI packages
pip install torch>=2.0.0 transformers>=4.35.0 mediapipe>=0.10.0 numpy accelerate
```

### 2. Start Database
```bash
# Using Docker (easiest):
docker run --name processgpt-db \
  -e POSTGRES_DB=processgpt \
  -e POSTGRES_USER=processgpt \
  -e POSTGRES_PASSWORD=processgpt123 \
  -p 5432:5432 \
  -d postgres:16
```

### 3. Place Your Gemma Model
```bash
# Create model directory
mkdir -p models/gemma

# Copy your gemma-2b-it.task file to:
# models/gemma/gemma-2b-it.task
```

### 4. Configure Environment
```bash
# Create .env file:
cat > .env << 'EOF'
DATABASE_URL=postgresql://processgpt:processgpt123@localhost:5432/processgpt
USE_LOCAL_AI=true
GEMMA_MODEL_PATH=./models/gemma/gemma-2b-it.task
AI_SERVICE=gemma-mediapipe
OPENAI_API_KEY=your-fallback-key-here
NODE_ENV=development
PORT=5000
EOF
```

### 5. Initialize Database
```bash
# Setup database schema
npm run db:push

# Import manufacturing data (301 cases, 9471 events)
npm run import-data
```

### 6. Test Gemma Model
```bash
# Verify your .task file works
python scripts/test-gemma-task.py ./models/gemma/gemma-2b-it.task
```

### 7. Start ProcessGPT
```bash
# Launch application
npm run dev

# Open browser: http://localhost:5000
# Go to ProcessGPT tab
# Click "Use Gemma-2B-IT Local AI"
```

## Success Indicators
- Dashboard shows 301 manufacturing cases
- ProcessGPT responds using your local Gemma model
- No external API calls (complete privacy)
- All 25+ analysis types work with real data

## Test Questions
Try these to verify everything works:
- "What is our failure rate?"
- "Which activity fails most often?"
- "Show anomaly patterns"
- "What are the bottlenecks?"

Your ProcessGPT now runs completely locally with full data privacy!