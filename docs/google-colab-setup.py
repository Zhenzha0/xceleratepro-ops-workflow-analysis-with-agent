# Google Colab Setup for ProcessGPT Local AI
# Copy this entire code into a Google Colab notebook and run it

# Step 1: Install all required dependencies
print("🔧 Installing dependencies...")
!pip install flask pyngrok requests psutil

# Step 2: Install Ollama
print("📦 Installing Ollama...")
!curl -fsSL https://ollama.ai/install.sh | sh

# Step 3: Start Ollama service in background
print("🚀 Starting Ollama service...")
import subprocess
import threading
import time
import os

def run_ollama():
    """Run Ollama server in background"""
    try:
        subprocess.run(["/usr/local/bin/ollama", "serve"], check=True)
    except Exception as e:
        print(f"Ollama server error: {e}")

# Start Ollama in background thread
ollama_thread = threading.Thread(target=run_ollama, daemon=True)
ollama_thread.start()

# Wait for Ollama to start
print("⏳ Waiting for Ollama to start...")
time.sleep(15)

# Step 4: Download Gemma 2 model
print("📥 Downloading Gemma 2 model (this takes 5-10 minutes)...")
!ollama pull gemma2:9b

# Step 5: Test the model
print("🧪 Testing Gemma 2 model...")
test_result = !ollama run gemma2:9b "What is process mining in manufacturing?" --verbose
print("✅ Model test completed")

# Step 6: Create API endpoint compatible with your ProcessGPT
print("🌐 Creating API endpoint...")
from flask import Flask, request, jsonify
import requests
import json
from pyngrok import ngrok

app = Flask(__name__)

@app.route('/api/generate', methods=['POST'])
def generate():
    """API endpoint that forwards requests to local Ollama"""
    try:
        data = request.json
        print(f"Received request: {data.get('prompt', '')[:100]}...")
        
        # Forward to local Ollama
        response = requests.post(
            'http://localhost:11434/api/generate',
            json=data,
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"Generated response: {len(result.get('response', ''))} characters")
            return jsonify(result)
        else:
            return jsonify({"error": f"Ollama error: {response.status_code}"}), 500
            
    except Exception as e:
        print(f"API error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    try:
        # Test Ollama connection
        test_response = requests.get('http://localhost:11434/api/tags', timeout=5)
        if test_response.status_code == 200:
            models = test_response.json().get('models', [])
            return jsonify({
                "status": "healthy",
                "service": "Google Colab + Ollama + Gemma 2",
                "models": [m['name'] for m in models]
            })
        else:
            return jsonify({"status": "unhealthy", "error": "Ollama not responding"}), 500
    except Exception as e:
        return jsonify({"status": "unhealthy", "error": str(e)}), 500

# Step 7: Start ngrok tunnel to make it publicly accessible
print("🔗 Creating public tunnel with ngrok...")
try:
    # Set ngrok auth token if you have one (optional but recommended)
    # ngrok.set_auth_token("your_token_here")
    
    public_url = ngrok.connect(5000)
    print(f"\n🎉 SUCCESS! Your AI service is running at:")
    print(f"🌐 Public URL: {public_url}")
    print(f"📋 Use this URL in your ProcessGPT settings:")
    print(f"   OLLAMA_HOST={public_url}")
    print(f"   USE_LOCAL_AI=true")
    
except Exception as e:
    print(f"❌ ngrok error: {e}")
    print("💡 Try running without ngrok for local testing")

# Step 8: Start Flask server
print("\n🚀 Starting API server...")
print("📝 Keep this notebook running to maintain the AI service")
print("🔄 The service will stay active as long as this cell is running")

# Run the Flask app
app.run(host='0.0.0.0', port=5000, debug=False)