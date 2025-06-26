#!/usr/bin/env python3
"""
Direct Phi-2 inference script for ProcessGPT local AI integration
Runs Phi-2 model using transformers library without MediaPipe dependencies
"""

import sys
import os
import json
from pathlib import Path

def run_phi2_inference(model_path, prompt):
    try:
        # Import required libraries
        from transformers import AutoTokenizer, AutoModelForCausalLM
        import torch
        
        print(f"Loading Phi-2 model from: {model_path}", file=sys.stderr)
        
        # Load tokenizer and model
        tokenizer = AutoTokenizer.from_pretrained(model_path, trust_remote_code=True)
        model = AutoModelForCausalLM.from_pretrained(
            model_path, 
            trust_remote_code=True,
            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
            device_map="auto" if torch.cuda.is_available() else None
        )
        
        # Format prompt for Phi-2
        formatted_prompt = f"Instruct: {prompt}\nOutput:"
        
        # Tokenize input
        inputs = tokenizer(formatted_prompt, return_tensors="pt")
        
        # Generate response
        with torch.no_grad():
            outputs = model.generate(
                inputs.input_ids,
                max_new_tokens=512,
                temperature=0.7,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id,
                eos_token_id=tokenizer.eos_token_id
            )
        
        # Decode response
        response = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # Extract only the generated part (after "Output:")
        if "Output:" in response:
            response = response.split("Output:")[-1].strip()
        
        return response
        
    except ImportError as e:
        return f"Error: Missing required libraries. Please install: pip install transformers torch. Details: {str(e)}"
    except Exception as e:
        return f"Error running Phi-2 inference: {str(e)}"

def main():
    if len(sys.argv) != 3:
        print("Usage: python run-phi2.py <model_path> <prompt>")
        sys.exit(1)
    
    model_path = sys.argv[1]
    prompt = sys.argv[2]
    
    # Check if model path exists
    if not os.path.exists(model_path):
        print(f"Error: Model path does not exist: {model_path}")
        sys.exit(1)
    
    # Run inference
    response = run_phi2_inference(model_path, prompt)
    print(response)

if __name__ == "__main__":
    main()