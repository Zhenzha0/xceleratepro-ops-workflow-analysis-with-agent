# GitHub Upload Solution for ProcessGPT

## The Problem
Git lock preventing push + Large files (51MB+ tar.gz, 1.9GB AI models) exceeding GitHub's 100MB limit.

## Simple Manual Upload Solution

### Step 1: Essential Files Only
Download these files from Replit file browser for GitHub upload:

**Core Configuration (9 files)**
- `package.json`
- `tsconfig.json` 
- `vite.config.ts`
- `tailwind.config.ts`
- `drizzle.config.ts`
- `.env.example`
- `components.json`
- `postcss.config.js`
- `.gitignore` (updated to exclude large files)

**Your Data**
- `sample_data.csv` (your 9,471 manufacturing events)

**Complete Folders (download as ZIP)**
- `client/` folder (React frontend)
- `shared/` folder (TypeScript schemas)

**Server Files (select these only)**
- `server/index.ts`
- `server/db.ts`
- `server/routes.ts` 
- `server/storage.ts`
- `server/vite.ts`

**Essential AI Services (from server/services/)**
- `ai-service-factory.ts`
- `intelligent-analyst.ts`
- `ai-analyst.ts`
- `failure-analyzer.ts`
- `anomaly-detector.ts`
- `timing-analyzer.ts`
- `trend-analyzer.ts`
- `case-analyzer.ts`
- `semantic-search.ts`
- `xes-parser.ts`
- `gemini-service.ts` (for Google AI)

**Documentation**
- `README.md`
- `LOCAL_DEPLOYMENT_FILES.md`
- `QUICK_DEPLOYMENT_GUIDE.md`

### Step 2: GitHub Upload
1. Go to: https://github.com/Zhenzha0/xceleratepro-ops-workflow-analysis-with-agent
2. Click "Add file" → "Upload files"
3. Upload the essential files listed above
4. Create folders manually (client/, server/, shared/)
5. Upload folder contents
6. Commit: "ProcessGPT manufacturing analytics - essential files"

### Step 3: What You Get
Complete ProcessGPT platform with:
- Manufacturing dashboard (301 cases, 9,471 events)
- ProcessGPT AI assistant (25+ analysis types)
- Anomaly detection (170 detected anomalies)
- Interactive visualizations
- Local deployment capability

### Files Intentionally Excluded
- `models/` (1.9GB AI model files - too large for GitHub)
- `*.tar.gz` (51MB deployment packages)
- `processgpt-deployment/` (duplicate large files)
- `node_modules/` (automatically excluded)
- Experimental AI services (android, mediapipe, etc.)

## Local Setup After Upload
1. Clone repository
2. Run `npm install`
3. Set up PostgreSQL database
4. Add environment variables
5. Import your manufacturing data
6. Choose AI service (OpenAI, Gemini, or local)

This approach gives you a clean, working ProcessGPT repository without large file issues.