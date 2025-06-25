# Alternative Google Colab Setup (No Ngrok Auth Required)
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

print("\n" + "="*50)
print("LOCAL AI SERVICE READY!")
print("="*50)
print("Your Gemma 2 model is running locally on this Colab instance.")
print("Since ngrok requires auth, you have two options:")
print("\n1. Use ngrok with your paid account authtoken")
print("2. Use Colab's public URL feature (if available)")
print("\nFor now, your AI service is running locally at http://localhost:5000")
print("You can test it within this Colab environment.")
print("\nTo use with external ProcessGPT, you'll need to set up ngrok auth.")

# Run locally for testing
if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000)