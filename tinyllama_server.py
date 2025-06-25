from flask import Flask, request, jsonify
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch

app = Flask(__name__)

print("Starting TinyLlama server...")
print("Loading TinyLlama model from local files...")

# Load the model you just downloaded
try:
    model_path = "./models/tinyllama-chat"
    print(f"Loading model from: {model_path}")
    
    tokenizer = AutoTokenizer.from_pretrained(model_path)
    model = AutoModelForCausalLM.from_pretrained(
        model_path,
        torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
        device_map="auto" if torch.cuda.is_available() else None
    )
    
    print("✅ TinyLlama model loaded successfully!")
    print("🚀 Ready to serve ProcessGPT!")
    MODEL_READY = True
    
except Exception as e:
    print(f"❌ Failed to load model: {e}")
    MODEL_READY = False

@app.route('/v1/models', methods=['GET'])
def models():
    if MODEL_READY:
        return jsonify({
            "data": [{
                "id": "tinyllama-chat",
                "object": "model", 
                "created": 1234567890,
                "owned_by": "tinyllama"
            }]
        })
    else:
        return jsonify({"error": "Model not ready"}), 500

@app.route('/v1/chat/completions', methods=['POST'])
def chat():
    if not MODEL_READY:
        return jsonify({"error": "TinyLlama model not ready"}), 500
    
    try:
        data = request.json
        messages = data.get('messages', [])
        max_tokens = data.get('max_tokens', 300)
        temperature = data.get('temperature', 0.7)
        
        # Build TinyLlama prompt format
        prompt = ""
        for msg in messages:
            role = msg['role']
            content = msg['content']
            if role == 'system':
                prompt += f"<|system|>\n{content}</s>\n"
            elif role == 'user':
                prompt += f"<|user|>\n{content}</s>\n"
            elif role == 'assistant':
                prompt += f"<|assistant|>\n{content}</s>\n"
        
        prompt += "<|assistant|>\n"
        
        # Generate response
        inputs = tokenizer(prompt, return_tensors="pt")
        
        with torch.no_grad():
            outputs = model.generate(
                inputs.input_ids,
                max_new_tokens=max_tokens,
                temperature=temperature,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id,
                repetition_penalty=1.1
            )
        
        # Decode response
        response = tokenizer.decode(outputs[0], skip_special_tokens=True)
        # Extract only the new generated text
        response = response[len(prompt):].strip()
        
        return jsonify({
            "choices": [{
                "message": {
                    "role": "assistant",
                    "content": response
                },
                "finish_reason": "stop"
            }],
            "model": "tinyllama-chat"
        })
        
    except Exception as e:
        print(f"Generation error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "healthy" if MODEL_READY else "loading",
        "model": "TinyLlama-1.1B-Chat",
        "model_loaded": MODEL_READY
    })

if __name__ == '__main__':
    print("\n" + "="*50)
    print("🤖 TinyLlama Local AI Server")
    print("📍 Running on: http://localhost:8080")
    print("🔗 ProcessGPT will connect here automatically")
    print("⚠️  Keep this terminal window open!")
    print("="*50 + "\n")
    
    app.run(host='0.0.0.0', port=8080, debug=False)