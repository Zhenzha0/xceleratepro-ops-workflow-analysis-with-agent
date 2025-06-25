@echo off
echo ===== ProcessGPT Local Setup Script =====
echo.

echo Step 1: Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed. Please install Node.js 20+ first.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)
echo Node.js found: 
node --version

echo.
echo Step 2: Checking PostgreSQL installation...
psql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: PostgreSQL not found in PATH. Make sure it's installed.
    echo Download from: https://www.postgresql.org/download/windows/
    echo.
    set /p continue="Continue anyway? (y/n): "
    if /i not "%continue%"=="y" exit /b 1
)

echo.
echo Step 3: Installing ProcessGPT dependencies...
npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Step 4: Creating environment file...
if not exist .env (
    echo # ProcessGPT Local Configuration > .env
    echo DATABASE_URL=postgresql://postgres:password@localhost:5432/processgpt >> .env
    echo USE_LOCAL_AI=true >> .env
    echo GEMMA2_URL=http://localhost:8080 >> .env
    echo.
    echo Created .env file. Please edit it with your PostgreSQL password.
    echo Then run: npm run db:push
) else (
    echo .env file already exists
)

echo.
echo Step 5: Testing Gemma 2B connection...
curl -s http://localhost:8080/health >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Gemma 2B server not responding on localhost:8080
    echo Make sure your Gemma 2B server is running first
) else (
    echo Gemma 2B server is running!
)

echo.
echo ===== Setup Complete =====
echo.
echo Next steps:
echo 1. Edit .env file with your PostgreSQL password
echo 2. Run: npm run db:push
echo 3. Run: npm run dev
echo 4. Open: http://localhost:5173
echo.
pause