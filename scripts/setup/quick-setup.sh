#!/bin/bash
# Quick setup script for ProcessGPT local deployment

echo "Setting up ProcessGPT Local Deployment..."

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Create models directory
echo "Creating models directory..."
python scripts/create-models-directory.py

# Setup environment
echo "Creating environment file..."
cp .env.example .env

echo "Setup complete!"
echo "Next steps:"
echo "1. Download Gemma-2B-IT model to models/gemma/"
echo "2. Start PostgreSQL database with Docker"
echo "3. Edit .env file with your settings"
echo "4. Run: npm run db:push"
echo "5. Run: npm run import-data"
echo "6. Run: npm run dev"
