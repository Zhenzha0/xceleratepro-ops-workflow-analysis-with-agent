# Essential Files for Local Deployment

## Core Application Files (Required)

### Root Configuration
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `vite.config.ts` - Build system
- `tailwind.config.ts` - Styling
- `drizzle.config.ts` - Database configuration
- `.env.example` - Environment template
- `sample_data.csv` - Your manufacturing dataset (9,471 events)

### Client (React Frontend)
- `client/` folder - Complete React application
  - All components, pages, hooks, utilities
  - Dashboard, visualizations, ProcessGPT interface

### Server (Express Backend) - Essential Files Only
- `server/index.ts` - Main server entry point
- `server/db.ts` - Database connection
- `server/routes.ts` - API endpoints  
- `server/storage.ts` - Data storage interface
- `server/vite.ts` - Development server

### Server Services (Core Only)
- `server/services/ai-service-factory.ts` - AI service management
- `server/services/intelligent-analyst.ts` - Main AI analysis
- `server/services/failure-analyzer.ts` - Failure analysis
- `server/services/anomaly-detector.ts` - Anomaly detection
- `server/services/timing-analyzer.ts` - Performance analysis
- `server/services/trend-analyzer.ts` - Pattern analysis
- `server/services/case-analyzer.ts` - Case comparison
- `server/services/xes-parser.ts` - Data parsing

### Shared Code
- `shared/` folder - TypeScript types and schemas

## Optional AI Service Files (Choose One)

**For OpenAI Integration:**
- `server/services/ai-analyst.ts` - OpenAI service

**For Local Gemma-2B Integration:**
- `server/services/gemma2-service.ts` - Local Gemma service
- `scripts/gemma-inference.py` - Python bridge

**For Google Gemini:**
- `server/services/gemini-service.ts` - Gemini service

## Files NOT Needed for Local Deployment

### Experimental AI Services (Remove These)
- `android-bridge-server.js` - Android emulator integration
- `server/services/android-*.ts` - Android-specific services
- `server/services/emulator-*.ts` - Emulator bridge services
- `server/services/mediapipe-*.ts` - MediaPipe experiments
- `server/services/phi2-*.ts` - Phi-2 experiments
- `server/services/true-local-*.ts` - Alternative local AI
- `server/services/tinyllama-*.ts` - TinyLlama experiments
- `server/services/google-ai-edge-*.ts` - Google Edge experiments

### Backup Files
- `server/services/xes-parser-backup.ts` - Old parser version
- `server/services/failure-analyzer-enhanced.ts` - Enhanced version (use regular one)

## Recommended Local Setup

### Minimal Setup (OpenAI)
1. Core application files
2. OpenAI AI service
3. Your manufacturing dataset
4. Standard configuration

### Privacy Setup (Local AI)
1. Core application files  
2. Gemma-2B service + Python bridge
3. Your manufacturing dataset
4. Local AI configuration

### Clean File Structure
```
processgpt/
├── package.json
├── sample_data.csv
├── client/           (complete folder)
├── server/
│   ├── index.ts
│   ├── db.ts
│   ├── routes.ts
│   ├── storage.ts
│   └── services/     (core services only)
├── shared/           (complete folder)
└── config files
```

This gives you a clean, functional ProcessGPT deployment without experimental code.