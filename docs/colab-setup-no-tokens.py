# ProcessGPT Local AI Setup - No Authentication Required
print("Installing dependencies...")
!pip install flask requests
!npm install -g localtunnel

print("Installing Ollama...")
!curl -fsSL https://ollama.ai/install.sh | sh

import subprocess, threading, time, os
def run_ollama():
    subprocess.run(["/usr/local/bin/ollama", "serve"])

print("Starting Ollama service...")
ollama_thread = threading.Thread(target=run_ollama, daemon=True)
ollama_thread.start()
time.sleep(15)

print("Downloading Gemma 2 model (5-10 minutes)...")
!ollama pull gemma2:9b

print("Testing model...")
!ollama run gemma2:9b "Test manufacturing analysis" --verbose

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

def start_localtunnel():
    """Start LocalTunnel in background to create public URL"""
    try:
        # Start LocalTunnel - no authentication required
        result = subprocess.run(['lt', '--port', '5000'], 
                              capture_output=True, text=True, timeout=10)
        if result.stdout:
            url = result.stdout.strip()
            print(f"\n🎉 SUCCESS! Your AI endpoint: {url}")
            print(f"Use this in ProcessGPT: OLLAMA_HOST={url}")
            print("Set: USE_LOCAL_AI=true")
            return url
    except Exception as e:
        print(f"LocalTunnel setup error: {e}")
        print("Manual setup: Your AI runs on http://localhost:5000")
        return None

# Start LocalTunnel in background
print("Creating public tunnel (no authentication required)...")
tunnel_thread = threading.Thread(target=start_localtunnel, daemon=True)
tunnel_thread.start()

print("Starting Flask server...")
print("Your Gemma 2 AI service is ready!")

app.run(host='0.0.0.0', port=5000)