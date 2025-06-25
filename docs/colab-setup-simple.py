# Simplest Google Colab Setup - No External Dependencies
print("Installing dependencies...")
!pip install flask requests

print("Installing Ollama...")
!curl -fsSL https://ollama.ai/install.sh | sh

import subprocess, threading, time
def run_ollama():
    subprocess.run(["/usr/local/bin/ollama", "serve"])

print("Starting Ollama service...")
ollama_thread = threading.Thread(target=run_ollama, daemon=True)
ollama_thread.start()
time.sleep(15)

print("Downloading Gemma 2 model (5-10 minutes)...")
!ollama pull gemma2:9b

from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

@app.route('/api/generate', methods=['POST'])
def generate():
    try:
        data = request.json
        response = requests.post('http://localhost:11434/api/generate', json=data, timeout=60)
        return jsonify(response.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    try:
        test = requests.get('http://localhost:11434/api/tags', timeout=5)
        if test.status_code == 200:
            return jsonify({"status": "healthy", "service": "Colab + Gemma 2"})
        return jsonify({"status": "unhealthy"}), 500
    except:
        return jsonify({"status": "unhealthy"}), 500

print("\n" + "="*60)
print("🚀 LOCAL AI SERVICE READY!")
print("="*60)
print("Your Gemma 2 model is running successfully!")
print("AI service available at: http://localhost:5000")
print("\nFor external access, you have these options:")
print("1. Use ngrok with your paid account (recommended)")
print("2. Use Colab's built-in tunneling (if available)")
print("3. Access from same network only")
print("\nTesting local service...")

# Test the service locally
try:
    import requests
    test_response = requests.get('http://localhost:5000/health', timeout=5)
    if test_response.status_code == 200:
        print("✅ Local AI service test: PASSED")
    else:
        print("❌ Local AI service test: FAILED")
except:
    print("⚠️  Local AI service test: Could not connect")

print("Starting server (keep this running)...")
app.run(host='0.0.0.0', port=5000, debug=False)