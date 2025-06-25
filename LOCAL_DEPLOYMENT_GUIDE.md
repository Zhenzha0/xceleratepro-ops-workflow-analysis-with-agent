# Complete Local ProcessGPT Deployment Guide

## Overview
Run the entire ProcessGPT application locally on your computer with your Gemma 2B model for complete data privacy and offline operation.

## Prerequisites
- Node.js 20+ installed
- PostgreSQL installed locally
- Your Gemma 2B model running on localhost:8080
- Git for cloning the repository

## Step 1: Download ProcessGPT Source Code

### Option A: Download from Replit
1. Go to your Replit project
2. Click "Download as zip" from the menu
3. Extract to your desired folder (e.g., `C:\ProcessGPT\`)

### Option B: Clone Repository Structure
Create the following folder structure and copy files from your Replit:
```
ProcessGPT/
├── client/
├── server/
├── shared/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
└── sample_data.csv
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

# Install all dependencies
npm install

# Set up database schema
npm run db:push

# Import your sample data
npm run import-data
```

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
2. Navigate to ProcessGPT (AI Assistant tab)
3. Ask a question like "What are the main failure patterns?"
4. Check the console logs - you should see "Using local Gemma 2B model..."

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