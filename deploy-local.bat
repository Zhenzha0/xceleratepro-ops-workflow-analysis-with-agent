@echo off
echo ===== ProcessGPT Local Deployment Script =====
echo This will deploy the complete ProcessGPT environment locally with Gemma 2B integration
echo.

REM Check if we're in the correct directory
if not exist "package.json" (
    echo ERROR: Please run this script from the ProcessGPT root directory
    echo Make sure you've downloaded the complete project from Replit first
    pause
    exit /b 1
)

REM Check Node.js
echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed. Please install Node.js 20+ first
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)
echo Node.js version: 
node --version

REM Check PostgreSQL
echo Checking PostgreSQL...
psql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: PostgreSQL not found. Please install PostgreSQL first
    echo Download from: https://www.postgresql.org/download/windows/
    set /p continue="Continue anyway? (y/n): "
    if /i not "%continue%"=="y" exit /b 1
)

REM Install dependencies
echo Installing all ProcessGPT dependencies...
npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

REM Create environment file
echo Setting up environment configuration...
if not exist ".env" (
    echo # ProcessGPT Local Configuration > .env
    echo NODE_ENV=development >> .env
    echo. >> .env
    echo # Database Configuration (Update with your PostgreSQL credentials) >> .env
    echo DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/processgpt >> .env
    echo PGHOST=localhost >> .env
    echo PGPORT=5432 >> .env
    echo PGUSER=postgres >> .env
    echo PGPASSWORD=yourpassword >> .env
    echo PGDATABASE=processgpt >> .env
    echo. >> .env
    echo # AI Configuration >> .env
    echo USE_LOCAL_AI=true >> .env
    echo GEMMA2_URL=http://localhost:8080 >> .env
    echo. >> .env
    echo # Optional: OpenAI fallback (remove if not needed) >> .env
    echo # OPENAI_API_KEY=your_openai_key_here >> .env
    echo Created .env file - PLEASE EDIT IT with your PostgreSQL password
) else (
    echo .env file already exists
)

REM Check sample data
if not exist "sample_data.csv" (
    echo WARNING: sample_data.csv not found
    echo Make sure to copy your manufacturing data file to the root directory
    echo This contains your 301 cases and 9,471 events
)

REM Test Gemma 2B connection
echo Testing Gemma 2B connection...
curl -s --connect-timeout 3 http://localhost:8080/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Gemma 2B server is running on localhost:8080
) else (
    echo ⚠ WARNING: Gemma 2B server not responding on localhost:8080
    echo Make sure your Gemma 2B server is running before starting ProcessGPT
)

echo.
echo ===== Deployment Complete =====
echo.
echo Next steps:
echo 1. Edit .env file with your PostgreSQL password
echo 2. Create PostgreSQL database:
echo    psql -U postgres -c "CREATE DATABASE processgpt;"
echo 3. Set up database schema:
echo    npm run db:push
echo 4. Import your manufacturing data:
echo    npm run import-data
echo 5. Start ProcessGPT:
echo    npm run dev
echo 6. Open: http://localhost:5173
echo.
echo ProcessGPT will then run completely locally with your Gemma 2B model!
echo.
pause