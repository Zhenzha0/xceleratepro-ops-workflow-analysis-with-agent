# Quick Local Deployment Instructions

## 1. Download Complete ProcessGPT Project

**From Replit:**
- Click the menu (hamburger icon) in your Replit
- Select "Download as zip"
- Extract to a folder like `C:\ProcessGPT\` or `~/ProcessGPT/`

**What you're downloading:**
- Complete web application (6,000+ lines of analysis code)
- All manufacturing analysis functions
- Your actual sample_data.csv with 301 cases
- Database schemas and migration scripts
- Frontend dashboard with all visualizations

## 2. Run Deployment Script

**Windows:**
```cmd
cd C:\ProcessGPT
deploy-local.bat
```

**Mac/Linux:**
```bash
cd ~/ProcessGPT
chmod +x deploy-local.sh
./deploy-local.sh
```

## 3. Configure Database

**Install PostgreSQL** (if not already installed):
- Windows: https://www.postgresql.org/download/windows/
- Mac: `brew install postgresql`
- Linux: `sudo apt install postgresql`

**Create database:**
```bash
psql -U postgres -c "CREATE DATABASE processgpt;"
```

**Edit .env file** with your PostgreSQL password:
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/processgpt
PGPASSWORD=YOUR_PASSWORD
```

## 4. Setup and Import Data

```bash
# Create database tables
npm run db:push

# Import your manufacturing data (301 cases, 9,471 events)
npm run import-data

# Start the complete ProcessGPT application
npm run dev
```

## 5. Access Local ProcessGPT

Open your browser to: **http://localhost:5173**

You'll have:
- Complete dashboard with your manufacturing data
- All analysis tabs (Process Maps, Anomaly Detection, etc.)
- ProcessGPT chat interface using your local Gemma 2B
- All 25+ question types working offline

## Verification

**Check data import:**
- Dashboard should show: 301 cases, 342 anomalies
- Process Maps should display actual manufacturing stations

**Test ProcessGPT with Gemma 2B:**
- Go to AI Assistant tab
- Ask: "What are the main failure patterns?"
- Should see response from your local Gemma 2B model
- Check browser console: should show "Using local Gemma 2B model..."

## What Runs Locally

- **Frontend**: React dashboard at localhost:5173
- **Backend**: Express API at localhost:5000  
- **Database**: PostgreSQL with your manufacturing data
- **AI**: Your Gemma 2B model at localhost:8080
- **Analysis**: All manufacturing analysis functions

## Complete Privacy

Everything runs on your machine:
- No external API calls
- Your data never leaves your computer
- Gemma 2B processes all AI requests locally
- Works completely offline

This gives you the identical ProcessGPT experience with complete data privacy and local control.