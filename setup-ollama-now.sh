#!/bin/bash

echo "=== Quick Ollama Setup for ProcessGPT ==="
echo ""

# Check if Ollama is installed
if command -v ollama &> /dev/null; then
    echo "✓ Ollama is already installed"
else
    echo "Installing Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
    echo "✓ Ollama installed"
fi

echo ""
echo "Starting Ollama service..."
ollama serve &
OLLAMA_PID=$!

echo "Waiting for Ollama to start..."
sleep 5

echo ""
echo "Available models for ProcessGPT:"
echo "1. gemma2:9b (2.9GB) - Recommended for manufacturing analysis"
echo "2. llama3.1:8b (4.7GB) - Very capable alternative"
echo "3. phi3:mini (2.3GB) - Fastest, good for testing"

echo ""
echo "To download a model, run:"
echo "  ollama pull gemma2:9b"
echo ""
echo "Then in ProcessGPT:"
echo "1. Go to AI Configuration (sidebar)"
echo "2. Find 'True Local AI' section"
echo "3. Set host: http://localhost:11434"
echo "4. Click 'Use True Local AI'"

echo ""
echo "Ollama is now running in background (PID: $OLLAMA_PID)"