# Complete Phi-2 Model Download Guide from MediaPipe AI Edge

## Step 1: Install MediaPipe AI Edge Tools

### Windows Installation
```bash
# Open Command Prompt as Administrator
# Install Python if not already installed
python --version
# If Python not installed, download from https://python.org

# Install MediaPipe AI Edge
pip install mediapipe-model-maker
pip install ai-edge-torch

# Install Git if not already installed
git --version
# If Git not installed, download from https://git-scm.com/
```

### Mac Installation
```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Python and Git
brew install python git

# Install MediaPipe AI Edge
pip3 install mediapipe-model-maker
pip3 install ai-edge-torch
```

### Linux Installation
```bash
# Update package manager
sudo apt update

# Install Python and Git
sudo apt install python3 python3-pip git

# Install MediaPipe AI Edge
pip3 install mediapipe-model-maker
pip3 install ai-edge-torch
```

## Step 2: Download Phi-2 Model in .tflite Format

### Method 1: Direct Download from Google AI Edge Gallery
```bash
# Create a folder for your models
mkdir phi2-models
cd phi2-models

# Download Phi-2 optimized for edge devices
# This is the official Google AI Edge version of Phi-2
curl -O https://storage.googleapis.com/ai-edge-models/phi-2-instruct-int4.tflite

# Alternative: Download full precision version (larger file)
curl -O https://storage.googleapis.com/ai-edge-models/phi-2-instruct-fp16.tflite
```

### Method 2: Using AI Edge Model Hub CLI
```bash
# Install AI Edge CLI
pip install ai-edge-litert

# Login to Google AI (optional for public models)
ai-edge auth login

# List available Phi-2 models
ai-edge models list --filter="phi-2"

# Download specific Phi-2 model
ai-edge models download phi-2-instruct-int4 --output-dir ./phi2-models
```

### Method 3: Convert from Hugging Face (Advanced Users)
```python
# create convert_phi2.py
import torch
import ai_edge_torch
from transformers import AutoModelForCausalLM, AutoTokenizer

# Download Phi-2 from Hugging Face
model_name = "microsoft/phi-2"
model = AutoModelForCausalLM.from_pretrained(model_name, torch_dtype=torch.float32)
tokenizer = AutoTokenizer.from_pretrained(model_name)

# Convert to AI Edge format
edge_model = ai_edge_torch.convert(model, sample_args=(torch.randint(0, 1000, (1, 10)),))

# Save as .tflite
edge_model.export("phi-2-instruct.tflite")
print("✓ Phi-2 model converted and saved as phi-2-instruct.tflite")
```

```bash
# Run the conversion script
python convert_phi2.py
```

## Step 3: Verify Model Download

### Check File Size and Location
```bash
# Navigate to your models folder
cd phi2-models

# Check downloaded files
ls -la *.tflite

# Expected output:
# phi-2-instruct-int4.tflite (approximately 1.5-2GB)
# or
# phi-2-instruct-fp16.tflite (approximately 2.5-3GB)
```

### Test Model Loading
```python
# create test_phi2.py
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import text

# Test model loading
try:
    # Create text generator
    base_options = python.BaseOptions(model_asset_path='phi-2-instruct-int4.tflite')
    options = text.TextGeneratorOptions(base_options=base_options)
    generator = text.TextGenerator.create_from_options(options)
    
    # Test generation
    result = generator.generate("Hello, how are you?", max_tokens=20)
    print("✓ Model loaded successfully!")
    print(f"Test output: {result.generated_text}")
    
except Exception as e:
    print(f"✗ Model loading failed: {e}")
    print("Check file path and try again")
```

```bash
# Run the test
python test_phi2.py
```

## Step 4: Model File Organization

### Create Proper Directory Structure
```bash
# Create ProcessGPT models directory
mkdir -p ProcessGPT/models/phi2

# Move model file to proper location
mv phi-2-instruct-int4.tflite ProcessGPT/models/phi2/

# Create model info file
cat > ProcessGPT/models/phi2/model_info.json << EOF
{
  "model_name": "phi-2-instruct-int4",
  "model_type": "text_generation",
  "format": "tflite",
  "quantization": "int4",
  "file_size_gb": 1.5,
  "downloaded_date": "$(date)",
  "source": "google_ai_edge"
}
EOF
```

### Verify Final Setup
```bash
# Check final directory structure
tree ProcessGPT/models/
# Expected output:
# ProcessGPT/models/
# └── phi2/
#     ├── phi-2-instruct-int4.tflite
#     └── model_info.json

# Check file permissions
ls -la ProcessGPT/models/phi2/
# Ensure files are readable
```

## Step 5: Model Configuration for ProcessGPT

### Create Model Configuration File
```javascript
// create ProcessGPT/models/phi2/config.js
export const phi2Config = {
  modelPath: './models/phi2/phi-2-instruct-int4.tflite',
  modelType: 'text_generation',
  maxTokens: 512,
  temperature: 0.7,
  topK: 40,
  topP: 0.9,
  systemPrompt: `You are ProcessGPT, an intelligent manufacturing analyst. 
    Analyze manufacturing data and provide executive summaries with specific metrics.
    Format responses professionally with bullet points and actionable insights.`
};
```

## Troubleshooting Common Issues

### Issue 1: "Model file not found"
```bash
# Check file exists
ls -la ProcessGPT/models/phi2/phi-2-instruct-int4.tflite

# Check file permissions
chmod 644 ProcessGPT/models/phi2/phi-2-instruct-int4.tflite
```

### Issue 2: "Out of memory during loading"
```bash
# Use smaller quantized version
# Download int8 instead of fp16
curl -O https://storage.googleapis.com/ai-edge-models/phi-2-instruct-int8.tflite
```

### Issue 3: "MediaPipe not found"
```bash
# Reinstall MediaPipe
pip uninstall mediapipe
pip install mediapipe==0.10.8

# For Mac M1/M2
pip install mediapipe-silicon
```

### Issue 4: "CUDA/GPU errors"
```bash
# Force CPU execution
export CUDA_VISIBLE_DEVICES=""
# Or use CPU-only version
pip install tensorflow-cpu
```

## File Checklist Before Proceeding

✅ **phi-2-instruct-int4.tflite** (1.5-2GB) downloaded and verified  
✅ **model_info.json** created with metadata  
✅ **config.js** created with ProcessGPT settings  
✅ **File permissions** set correctly (644)  
✅ **Test loading** completed successfully  
✅ **Directory structure** organized properly  

## Next Steps

Once you have successfully downloaded and verified the Phi-2 model:

1. **Proceed to local deployment guide** for complete ProcessGPT setup
2. **Configure MediaPipe integration** in ProcessGPT application
3. **Test complete system** with your manufacturing data
4. **Verify offline operation** without internet connectivity

Your Phi-2 model is now ready for integration with the locally deployed ProcessGPT system!