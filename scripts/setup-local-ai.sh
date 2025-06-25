#!/bin/bash

# Setup script for local AI with Gemma 2
echo "Setting up local AI environment..."

# Install Ollama
if ! command -v ollama &> /dev/null; then
    echo "Installing Ollama..."
    curl -fsSL https://ollama.ai/install.sh | sh
else
    echo "Ollama already installed"
fi

# Pull Gemma 2 model
echo "Downloading Gemma 2 model (this may take a while)..."
ollama pull gemma2:9b

# Test the model
echo "Testing Gemma 2 model..."
ollama run gemma2:9b "What is manufacturing process mining?" --verbose

echo "Local AI setup complete!"
echo ""
echo "To use local AI:"
echo "1. Start Ollama service: ollama serve"
echo "2. Update your .env to set: USE_LOCAL_AI=true"
echo "3. Restart your application"