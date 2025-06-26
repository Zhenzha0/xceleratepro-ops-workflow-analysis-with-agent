# ProcessGPT Local Deployment Checklist

## Pre-Deployment Requirements

### System Requirements
- [ ] **Operating System**: Windows 10+, macOS 10.15+, or Linux Ubuntu 18+
- [ ] **RAM**: Minimum 8GB (16GB recommended)
- [ ] **Storage**: 15GB available disk space
- [ ] **Internet**: Required for initial setup only

### Software Installation
- [ ] **Node.js 20+** installed and verified (`node --version`)
- [ ] **Python 3.8+** installed (`python --version`)
- [ ] **PostgreSQL 12+** installed and running
- [ ] **Git** installed (`git --version`)

## Phase 1: Phi-2 Model Download

### MediaPipe AI Edge Setup
- [ ] MediaPipe packages installed (`pip install mediapipe-model-maker ai-edge-torch`)
- [ ] Models directory created (`mkdir -p models/phi2`)
- [ ] **Phi-2 model downloaded** (1.5-2GB file): `phi-2-instruct-int4.tflite`
- [ ] Model file verified and readable
- [ ] Model loading tested successfully

### Model Verification Commands
```bash
# Verify model file
ls -la models/phi2/phi-2-instruct-int4.tflite
# Expected: ~1.5-2GB file

# Test model loading
python scripts/test_model_loading.py
# Expected: "✓ Model loaded successfully!"
```

## Phase 2: ProcessGPT Application Download

### Complete Application Download
- [ ] **Full ProcessGPT project** downloaded from Replit
- [ ] **All critical directories** present:
  - [ ] `client/` (React frontend)
  - [ ] `server/` (Express backend)
  - [ ] `shared/` (Database schemas)
  - [ ] `scripts/` (Utility scripts)
- [ ] **Essential files** present:
  - [ ] `sample_data.csv` (your manufacturing data)
  - [ ] `package.json` (dependencies)
  - [ ] `tsconfig.json` (TypeScript config)
  - [ ] `vite.config.ts` (build config)

### File Verification Commands
```bash
# Check directory structure
ls -la
# Expected: client/ server/ shared/ sample_data.csv package.json

# Check analysis services
ls server/services/
# Expected: ai-analyst.ts failure-analyzer-enhanced.ts phi2-mediapipe-service.ts

# Check sample data
wc -l sample_data.csv
# Expected: ~9472 lines (9471 events + header)
```

## Phase 3: Database Setup

### PostgreSQL Configuration
- [ ] PostgreSQL service running
- [ ] ProcessGPT database created
- [ ] Database user created with permissions
- [ ] Connection tested successfully

### Database Verification Commands
```bash
# Check PostgreSQL status
sudo systemctl status postgresql    # Linux
brew services list | grep postgresql # Mac

# Test database connection
psql -h localhost -U processgpt_user -d processgpt -c "SELECT version();"
# Expected: PostgreSQL version information
```

## Phase 4: Environment Configuration

### Environment Variables
- [ ] `.env` file created in root directory
- [ ] Database connection string configured
- [ ] Phi-2 model path specified
- [ ] AI service settings configured

### Environment File Template
```env
# Database
DATABASE_URL=postgresql://processgpt_user:your_password@localhost:5432/processgpt

# AI Configuration
USE_PHI2_MEDIAPIPE=true
PHI2_MODEL_PATH=./models/phi2/phi-2-instruct-int4.tflite

# Server
NODE_ENV=development
PORT=5000
```

## Phase 5: Dependencies Installation

### Node.js Packages
- [ ] Core dependencies installed (`npm install`)
- [ ] MediaPipe packages added (`npm install @mediapipe/tasks-genai`)
- [ ] TypeScript support verified
- [ ] No critical dependency errors

### Installation Verification Commands
```bash
# Install dependencies
npm install

# Check for MediaPipe
npm list @mediapipe/tasks-genai
# Expected: @mediapipe/tasks-genai@x.x.x

# Check for critical dependencies
npm list react express drizzle-orm
# Expected: All packages listed without errors
```

## Phase 6: Database Schema & Data Import

### Schema Setup
- [ ] Database schema pushed to PostgreSQL (`npm run db:push`)
- [ ] All required tables created
- [ ] Manufacturing data imported (`npm run import-data`)
- [ ] Data verification completed

### Data Verification Commands
```bash
# Push schema
npm run db:push
# Expected: "✓ Schema pushed successfully"

# Import data
npm run import-data
# Expected: "✓ 301 cases, 9471 events imported"

# Verify data
psql -h localhost -U processgpt_user -d processgpt -c "
SELECT 
  (SELECT COUNT(*) FROM process_cases) as cases,
  (SELECT COUNT(*) FROM process_events) as events,
  (SELECT COUNT(*) FROM process_activities) as activities;
"
# Expected: cases: 301, events: 9471, activities: 3157
```

## Phase 7: Phi-2 Integration

### MediaPipe Service Configuration
- [ ] Phi2MediaPipeService updated with real MediaPipe integration
- [ ] Model path configured correctly
- [ ] Service initialization tested
- [ ] AI Service Factory configured to use Phi-2 by default

### Integration Verification Commands
```bash
# Test Phi-2 connection
npm run test-phi2
# Expected: "✅ ALL TESTS PASSED! Phi-2 MediaPipe is ready"

# Check service configuration
grep -n "usePhi2MediaPipe = true" server/services/ai-service-factory.ts
# Expected: Line showing Phi-2 enabled by default
```

## Phase 8: System Launch

### Application Startup
- [ ] Development server starts without errors (`npm run dev`)
- [ ] Phi-2 model initializes successfully
- [ ] Database connections established
- [ ] Frontend accessible at http://localhost:5173
- [ ] Backend API responding at http://localhost:5000

### Launch Verification Commands
```bash
# Start application
npm run dev
# Expected output:
# ✓ Phi-2 MediaPipe initialized successfully
# [express] serving on port 5000

# Test API health
curl http://localhost:5000/api/health
# Expected: {"status":"healthy","dataImported":true}

# Test frontend
curl http://localhost:5173
# Expected: HTML content returned
```

## Phase 9: Functionality Testing

### Core Features Testing
- [ ] **Dashboard**: Shows 301 cases, 342 anomalies, correct metrics
- [ ] **Process Maps**: Displays manufacturing stations and workflows
- [ ] **Anomaly Detection**: Shows detected anomalies with details
- [ ] **Timeline Analysis**: Renders time-based charts correctly
- [ ] **Case Comparison**: Compares workflow instances properly

### ProcessGPT AI Testing
- [ ] **AI Assistant tab** accessible
- [ ] **"Use Phi-2 Edge" button** works
- [ ] **AI responses** generated from Phi-2 model
- [ ] **Analysis accuracy** maintained (real manufacturing insights)
- [ ] **Automatic visualizations** generated correctly

### AI Testing Commands
```bash
# Test AI endpoint
curl -X POST http://localhost:5000/api/ai/analyze \
  -H "Content-Type: application/json" \
  -d '{"query":"What are the main failure patterns?","sessionId":"test"}'
# Expected: Detailed analysis response from Phi-2

# Switch to Phi-2
curl -X POST http://localhost:5000/api/ai/switch-to-phi2-mediapipe
# Expected: {"success":true,"service":"phi2-mediapipe"}
```

## Phase 10: Performance & Privacy Verification

### Performance Metrics
- [ ] **Response time**: AI responses under 2 seconds
- [ ] **Memory usage**: System under 6GB RAM
- [ ] **CPU usage**: Stable during normal operation
- [ ] **Disk usage**: Reasonable storage consumption

### Privacy Confirmation
- [ ] **No external API calls** (network monitoring confirmed)
- [ ] **Offline operation** tested and verified
- [ ] **Data remains local** (no cloud uploads)
- [ ] **Complete privacy** achieved

### Performance Testing Commands
```bash
# Monitor memory usage
htop
# Expected: ProcessGPT using 4-6GB total

# Test offline operation
# Disconnect internet, verify ProcessGPT still works

# Check for external calls
netstat -an | grep ESTABLISHED
# Expected: Only local connections (localhost, 127.0.0.1)
```

## Final Success Criteria

### ✅ Complete System Verification
- [ ] **Phi-2 model** loaded and responding correctly
- [ ] **Manufacturing data** imported and analyzed accurately
- [ ] **All dashboard features** working with real data
- [ ] **ProcessGPT chat** using local Phi-2 for responses
- [ ] **Complete privacy** ensured (no external connections)
- [ ] **Offline capability** confirmed
- [ ] **Performance** acceptable (responses < 2 seconds)

### ✅ User Experience Confirmation
- [ ] Dashboard loads quickly and shows correct metrics
- [ ] All analysis tabs function properly
- [ ] ProcessGPT provides intelligent manufacturing insights
- [ ] Visualizations render correctly
- [ ] System remains responsive during use

## Troubleshooting Quick Reference

### Common Issues & Solutions
1. **Model not loading**: Check file path and permissions
2. **Database connection failed**: Verify PostgreSQL running and credentials
3. **Out of memory**: Use int8 model variant or increase system RAM
4. **Slow responses**: Check CPU usage and consider model optimization
5. **Missing data**: Re-run import script and verify CSV file

### Emergency Fallback
If Phi-2 fails, ProcessGPT automatically falls back to OpenAI while maintaining all analysis capabilities with your authentic manufacturing data.

## Success Confirmation

When all checkboxes are complete, you have successfully deployed ProcessGPT locally with Phi-2 integration, achieving:

🎯 **Complete Data Privacy** - All processing happens on your machine  
🎯 **Offline Operation** - No internet dependency after setup  
🎯 **Full Functionality** - All 25+ analysis types working  
🎯 **Real Data Analysis** - Authentic manufacturing insights  
🎯 **Professional Interface** - Complete dashboard and AI assistant  
🎯 **Local AI Intelligence** - Phi-2 providing smart responses  

Your ProcessGPT system is now ready for production use with complete privacy and control!