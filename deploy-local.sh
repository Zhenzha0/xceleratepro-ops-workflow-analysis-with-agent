#!/bin/bash

echo "===== ProcessGPT Local Deployment Script ====="
echo "This will deploy the complete ProcessGPT environment locally with Gemma 2B integration"
echo

# Check if we're running from the correct directory
if [ ! -f "package.json" ]; then
    echo "ERROR: Please run this script from the ProcessGPT root directory"
    echo "Make sure you've downloaded the complete project from Replit first"
    exit 1
fi

# Check Node.js
echo "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed. Please install Node.js 20+ first"
    echo "Download from: https://nodejs.org/"
    exit 1
fi
echo "Node.js version: $(node --version)"

# Check PostgreSQL
echo "Checking PostgreSQL..."
if ! command -v psql &> /dev/null; then
    echo "WARNING: PostgreSQL not found. Please install PostgreSQL first"
    echo "Download from: https://www.postgresql.org/download/"
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Install dependencies
echo "Installing all ProcessGPT dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies"
    exit 1
fi

# Create environment file
echo "Setting up environment configuration..."
if [ ! -f ".env" ]; then
    cat > .env << EOF
# ProcessGPT Local Configuration
NODE_ENV=development

# Database Configuration (Update with your PostgreSQL credentials)
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/processgpt
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=yourpassword
PGDATABASE=processgpt

# AI Configuration
USE_LOCAL_AI=true
GEMMA2_URL=http://localhost:8080

# Optional: OpenAI fallback (remove if not needed)
# OPENAI_API_KEY=your_openai_key_here
EOF
    echo "Created .env file - PLEASE EDIT IT with your PostgreSQL password"
else
    echo ".env file already exists"
fi

# Check if sample data exists
if [ ! -f "sample_data.csv" ]; then
    echo "WARNING: sample_data.csv not found"
    echo "Make sure to copy your manufacturing data file to the root directory"
    echo "This contains your 301 cases and 9,471 events"
fi

# Test Gemma 2B connection
echo "Testing Gemma 2B connection..."
if curl -s --connect-timeout 3 http://localhost:8080/health > /dev/null 2>&1; then
    echo "✓ Gemma 2B server is running on localhost:8080"
else
    echo "⚠ WARNING: Gemma 2B server not responding on localhost:8080"
    echo "Make sure your Gemma 2B server is running before starting ProcessGPT"
fi

echo
echo "===== Deployment Complete ====="
echo
echo "Next steps:"
echo "1. Edit .env file with your PostgreSQL password"
echo "2. Create PostgreSQL database:"
echo "   psql -U postgres -c 'CREATE DATABASE processgpt;'"
echo "3. Set up database schema:"
echo "   npm run db:push"
echo "4. Import your manufacturing data:"
echo "   npm run import-data"
echo "5. Start ProcessGPT:"
echo "   npm run dev"
echo "6. Open: http://localhost:5173"
echo
echo "ProcessGPT will then run completely locally with your Gemma 2B model!"