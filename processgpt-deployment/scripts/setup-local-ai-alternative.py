#!/usr/bin/env python3
"""
Alternative setup script for local AI when Ollama can't be installed directly
This script helps set up local AI using various methods
"""

import os
import sys
import subprocess
import platform
import requests
import time

def check_system():
    """Check system requirements"""
    print("🔍 Checking system requirements...")
    
    # Check Python version
    if sys.version_info < (3, 8):
        print("❌ Python 3.8+ required")
        return False
    
    # Check available RAM (basic check)
    try:
        import psutil
        ram_gb = psutil.virtual_memory().total / (1024**3)
        print(f"💾 Available RAM: {ram_gb:.1f} GB")
        if ram_gb < 8:
            print("⚠️  Warning: Less than 8GB RAM detected. Performance may be limited.")
    except ImportError:
        print("📊 Install psutil for detailed system info: pip install psutil")
    
    print("✅ System check completed")
    return True

def setup_method_1_local():
    """Setup Method 1: Local Ollama installation"""
    print("\n🚀 Method 1: Local Ollama Setup")
    print("This method requires running on your own machine (not in Replit)")
    
    system = platform.system().lower()
    
    if system == "darwin":  # macOS
        print("📱 macOS detected")
        print("Run: brew install ollama")
    elif system == "linux":
        print("🐧 Linux detected")
        print("Run: curl -fsSL https://ollama.ai/install.sh | sh")
    elif system == "windows":
        print("🪟 Windows detected")
        print("Download from: https://ollama.ai/download/windows")
    
    print("\nAfter installation:")
    print("1. ollama serve")
    print("2. ollama pull gemma2:9b")
    print("3. Set USE_LOCAL_AI=true in your environment")

def setup_method_2_colab():
    """Setup Method 2: Google Colab"""
    print("\n☁️  Method 2: Google Colab Setup")
    
    colab_code = '''
# Copy this code to a new Google Colab notebook

# Install dependencies
!pip install flask pyngrok transformers torch

# Install Ollama
!curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama service
import subprocess
import threading
import time

def run_ollama():
    subprocess.run(["/usr/local/bin/ollama", "serve"])

ollama_thread = threading.Thread(target=run_ollama)
ollama_thread.daemon = True
ollama_thread.start()
time.sleep(10)

# Pull model
!ollama pull gemma2:9b

# Create API endpoint
from flask import Flask, request, jsonify
import requests
from pyngrok import ngrok

app = Flask(__name__)

@app.route('/api/generate', methods=['POST'])
def generate():
    try:
        data = request.json
        response = requests.post('http://localhost:11434/api/generate', json=data)
        return jsonify(response.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Start ngrok tunnel
public_url = ngrok.connect(5000)
print(f"🌐 Your AI endpoint: {public_url}")
print("Use this URL as OLLAMA_HOST in your ProcessGPT settings")

# Run server
app.run(host='0.0.0.0', port=5000)
'''
    
    # Save to file
    with open('colab_setup.py', 'w') as f:
        f.write(colab_code)
    
    print("✅ Colab setup code saved to: colab_setup.py")
    print("📋 Copy this code to Google Colab and run it")
    print("🔗 The notebook will provide a public URL for your AI service")

def setup_method_3_docker():
    """Setup Method 3: Docker container"""
    print("\n🐳 Method 3: Docker Setup")
    
    dockerfile = '''
FROM ollama/ollama:latest

# Set environment variables
ENV OLLAMA_HOST=0.0.0.0

# Expose port
EXPOSE 11434

# Start Ollama and pull model
RUN ollama serve & sleep 10 && ollama pull gemma2:9b

CMD ["ollama", "serve"]
'''
    
    docker_compose = '''
version: '3.8'
services:
  ollama:
    build: .
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    environment:
      - OLLAMA_HOST=0.0.0.0

volumes:
  ollama_data:
'''
    
    # Save Docker files
    with open('Dockerfile.ollama', 'w') as f:
        f.write(dockerfile)
    
    with open('docker-compose.ollama.yml', 'w') as f:
        f.write(docker_compose)
    
    print("✅ Docker files created")
    print("🚀 Run: docker-compose -f docker-compose.ollama.yml up")

def test_connection(host="http://localhost:11434"):
    """Test connection to Ollama service"""
    print(f"\n🔌 Testing connection to {host}...")
    
    try:
        response = requests.get(f"{host}/api/tags", timeout=5)
        if response.status_code == 200:
            print("✅ Connection successful!")
            models = response.json().get('models', [])
            print(f"📋 Available models: {[m['name'] for m in models]}")
            return True
        else:
            print(f"❌ Connection failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Connection error: {e}")
        return False

def create_env_file():
    """Create environment configuration file"""
    env_content = '''# Local AI Configuration
USE_LOCAL_AI=true
OLLAMA_HOST=http://localhost:11434

# Fallback to OpenAI if local AI fails
OPENAI_API_KEY=your_openai_key_here

# Model configuration
LOCAL_AI_MODEL=gemma2:9b
LOCAL_AI_TIMEOUT=30000
'''
    
    with open('.env.local-ai', 'w') as f:
        f.write(env_content)
    
    print("✅ Environment file created: .env.local-ai")
    print("📝 Update with your actual values")

def main():
    print("🤖 ProcessGPT Local AI Setup Assistant")
    print("=" * 50)
    
    if not check_system():
        return
    
    print("\nChoose your setup method:")
    print("1. Local Machine (recommended for development)")
    print("2. Google Colab (cloud-based, free)")
    print("3. Docker Container")
    print("4. Test existing connection")
    print("5. Create environment file")
    
    choice = input("\nEnter your choice (1-5): ").strip()
    
    if choice == "1":
        setup_method_1_local()
    elif choice == "2":
        setup_method_2_colab()
    elif choice == "3":
        setup_method_3_docker()
    elif choice == "4":
        host = input("Enter Ollama host URL (default: http://localhost:11434): ").strip()
        if not host:
            host = "http://localhost:11434"
        test_connection(host)
    elif choice == "5":
        create_env_file()
    else:
        print("❌ Invalid choice")
        return
    
    print("\n🎉 Setup assistance completed!")
    print("📚 See docs/local-ai-setup-guide.md for detailed instructions")

if __name__ == "__main__":
    main()