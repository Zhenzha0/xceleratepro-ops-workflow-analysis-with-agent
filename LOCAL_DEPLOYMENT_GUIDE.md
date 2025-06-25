# Complete Local ProcessGPT Deployment Guide

## Overview
Run the entire ProcessGPT web application locally on your computer with your Gemma 2B model for complete data privacy and offline operation. This includes all manufacturing analysis functions, database schemas, and your actual data.

## Prerequisites
- Node.js 20+ installed
- PostgreSQL installed locally
- Your Gemma 2B model running on localhost:8080
- Git for cloning the repository

## Step 1: Download Complete ProcessGPT Application

### Download Everything from Replit
You need to download the ENTIRE application including all analysis functions:

1. Go to your Replit project
2. Click "Download as zip" from the menu (or use git clone if available)
3. Extract to your desired folder (e.g., `C:\ProcessGPT\`)

**Critical**: Make sure you get ALL these folders and files:
```
ProcessGPT/
├── client/                    # Frontend React app
│   ├── src/
│   │   ├── components/        # UI components including ProcessGPT
│   │   ├── pages/            # Dashboard, Analysis tabs
│   │   └── lib/              # Client utilities
├── server/                   # Backend Express app
│   ├── services/             # ALL ANALYSIS FUNCTIONS (critical!)
│   │   ├── ai-analyst.ts     # ProcessGPT core
│   │   ├── failure-analyzer-enhanced.ts
│   │   ├── timing-analyzer.ts
│   │   ├── trend-analyzer.ts
│   │   ├── case-analyzer.ts
│   │   └── gemma2-service.ts
│   ├── storage.ts            # Database functions
│   └── routes.ts             # API endpoints
├── shared/                   # Database schema
│   └── schema.ts             # Manufacturing data models
├── sample_data.csv           # Your actual manufacturing data
├── package.json              # All dependencies
├── drizzle.config.ts         # Database configuration
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.ts
```

## Step 2: Set Up Local Database

### Install PostgreSQL
1. Download PostgreSQL from https://www.postgresql.org/download/
2. Install with default settings
3. Remember your postgres password

### Create ProcessGPT Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE processgpt;

# Create user (optional)
CREATE USER processgpt_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE processgpt TO processgpt_user;

# Exit
\q
```

## Step 3: Configure Environment Variables

Create `.env` file in your ProcessGPT root directory:
```env
# Database Configuration
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/processgpt
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your_password
PGDATABASE=processgpt

# AI Configuration
USE_LOCAL_AI=true
GEMMA2_URL=http://localhost:8080

# Optional: Keep OpenAI as fallback
OPENAI_API_KEY=your_openai_key_if_desired
```

## Step 4: Install Dependencies and Setup

```bash
# Navigate to your ProcessGPT folder
cd C:\ProcessGPT

# Install all dependencies (includes all analysis libraries)
npm install

# Set up database schema with manufacturing tables
npm run db:push

# Import your actual manufacturing data (301 cases, 9,471 events)
# Place sample_data.csv in root directory first
npm run import-data
```

**Critical Dependencies**: The local installation includes:
- All 25+ ProcessGPT analysis functions
- Manufacturing database schemas (process_events, process_activities, process_cases)
- Failure analysis, timing analysis, trend analysis capabilities
- Anomaly detection algorithms
- Case clustering functionality
- Your actual manufacturing dataset

## Step 5: Verify Gemma 2B Connection

Test your local Gemma 2B server:
```bash
# Test Gemma 2B is responding
curl http://localhost:8080/v1/chat/completions -H "Content-Type: application/json" -d "{\"model\":\"gemma-2b-it\",\"messages\":[{\"role\":\"user\",\"content\":\"Hello\"}]}"
```

## Step 6: Modify AI Service Configuration

Update `server/services/ai-service-factory.ts`:
```typescript
export class AIServiceFactory {
  private static useGemma2 = true; // Enable Gemma 2B by default
  
  static async analyzeQuery(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      if (this.useGemma2) {
        console.log('Using local Gemma 2B model...');
        return await this.gemma2Service.analyzeQuery(request);
      } else {
        // Fallback to ProcessGPT
        console.log('Using ProcessGPT for analysis...');
        const { AIAnalyst } = await import('./ai-analyst');
        return await AIAnalyst.analyzeQuery(request);
      }
    } catch (error) {
      console.error('Gemma 2B error, falling back to ProcessGPT:', error);
      const { AIAnalyst } = await import('./ai-analyst');
      return await AIAnalyst.analyzeQuery(request);
    }
  }
}
```

## Step 7: Run ProcessGPT Locally

```bash
# Start the application
npm run dev
```

Your ProcessGPT will now be running at:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:5000

## Step 8: Verify Local Operation

1. Open http://localhost:5173 in your browser
2. Verify data import: Dashboard should show 301 cases, 342 anomalies
3. Navigate to ProcessGPT (AI Assistant tab)
4. Ask "What are the main failure patterns?" or "show me bottlenecks"
5. Check console logs - should see "Using local Gemma 2B model..."
6. Verify authentic analysis: Should see real data like "HBW Unload 15% failure rate"

**What Should Work Locally**:
- All dashboard visualizations with your real data
- Process Maps showing actual manufacturing stations
- Anomaly Detection with 342 detected anomalies
- Case Comparison between actual workflow instances
- ProcessGPT answering all 25+ question types using Gemma 2B
- Timeline Analysis with real timestamps
- Semantic Search through actual failure descriptions

## Benefits of Local Deployment

✅ **Complete Data Privacy**: Your manufacturing data never leaves your computer
✅ **Offline Operation**: Works without internet connection
✅ **Full Control**: Customize and modify as needed
✅ **Cost Savings**: No external API costs
✅ **Performance**: Direct local access to your data and model

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
pg_ctl status

# Restart PostgreSQL service
net start postgresql-x64-14  # Windows
brew services restart postgresql  # Mac
sudo systemctl restart postgresql  # Linux
```

### Gemma 2B Connection Issues
```bash
# Verify Gemma 2B is running on correct port
netstat -an | findstr 8080

# Test direct connection
telnet localhost 8080
```

### Port Conflicts
If port 5000 or 5173 are in use, modify:
- Backend port in `server/index.ts`
- Frontend port in `vite.config.ts`

## Data Import
Place your `sample_data.csv` in the root directory and run:
```bash
npm run import-data
```

## Additional Security
For enhanced security in industrial environments:
- Run on an isolated network
- Use firewall rules to block external access
- Regular backups of your local database
- Monitor system resources

Your ProcessGPT will now run entirely locally with your Gemma 2B model, providing complete data privacy and offline manufacturing analytics capability.