# Gemma-2B-IT Model Download Guide (.task format)

## Overview
This guide helps you download the Gemma-2B-IT model in .task format for local ProcessGPT integration with complete data privacy.

## Method 1: AI Edge Model Garden (Recommended)

### Step 1: Access AI Edge Model Garden
1. Go to [AI Edge Model Garden](https://ai.google.dev/edge/models)
2. Navigate to the "Text Generation" section
3. Find "Gemma 2B IT" model

### Step 2: Download .task Bundle
1. Click on "Gemma 2B IT" model card
2. Select "Download for MediaPipe" option
3. Choose "Quantized (4-bit)" for smaller file size (~3.1GB)
4. Download `gemma-2b-it-q4.task` file

### Step 3: Verify Download
```bash
# Check file size (should be ~3.1GB)
ls -lh gemma-2b-it-q4.task

# Verify file type
file gemma-2b-it-q4.task
```

## Method 2: Google AI Studio (Alternative)

### Step 1: Access Google AI Studio
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with Google account
3. Navigate to "Model Garden"

### Step 2: Export Model
1. Find "Gemma 2B Instruct" model
2. Click "Use in Edge Applications"
3. Select "MediaPipe Tasks" format
4. Download the generated .task file

## Method 3: MediaPipe Model Maker (Advanced)

### Prerequisites
```bash
pip install mediapipe-model-maker
```

### Download and Convert
```python
import mediapipe_model_maker as mm

# Download Gemma 2B IT model
model = mm.text_classifier.create(
    model_spec=mm.text_classifier.SupportedModels.GEMMA_2B_IT,
    train_data=None  # No training needed for inference
)

# Export as .task bundle
model.export_model("gemma-2b-it.task")
```

## What You Get

### .task File Contents
- **Model weights**: Quantized Gemma-2B-IT parameters
- **Tokenizer**: Text processing configuration
- **Metadata**: Model information and settings
- **Runtime config**: MediaPipe inference settings

### File Specifications
- **Format**: MediaPipe .task bundle
- **Size**: ~3.1GB (quantized 4-bit)
- **Compatible with**: MediaPipe Python API
- **Performance**: 2-5 seconds inference time

## Integration with ProcessGPT

### File Placement
```bash
# Create model directory in your ProcessGPT project
mkdir -p models/gemma

# Copy downloaded .task file
cp gemma-2b-it-q4.task models/gemma/gemma-2b-it.task
```

### Environment Configuration
Update your `.env` file:
```
GEMMA_MODEL_PATH=./models/gemma/gemma-2b-it.task
USE_LOCAL_AI=true
AI_SERVICE=gemma-local
```

### Verification Test
```bash
# Test model loading
python scripts/test-gemma-task.py ./models/gemma/gemma-2b-it.task
```

## Troubleshooting

### Download Issues

**Issue**: Download fails or times out
**Solution**: Use download manager or split download:
```bash
# Using wget with resume capability
wget -c https://download-url/gemma-2b-it-q4.task
```

**Issue**: File corrupted or incomplete
**Solution**: Verify checksum if provided:
```bash
# Check file integrity
md5sum gemma-2b-it-q4.task
```

### Compatibility Issues

**Issue**: MediaPipe can't load .task file
**Solution**: Check Python and MediaPipe versions:
```bash
python --version  # Should be 3.8-3.11
pip show mediapipe  # Should be >=0.10.0
```

**Issue**: "File not found" error
**Solution**: Verify file path and permissions:
```bash
ls -la models/gemma/gemma-2b-it.task
chmod 644 models/gemma/gemma-2b-it.task
```

## Performance Optimization

### Memory Management
- **Minimum RAM**: 8GB total system memory
- **Recommended**: 16GB for smooth operation
- **Model memory**: ~4GB during inference

### Inference Speed
- **CPU**: Multi-core processor recommended
- **First inference**: 10-15 seconds (model loading)
- **Subsequent queries**: 2-5 seconds
- **Batch processing**: More efficient for multiple queries

## Security and Privacy

### Local Operation Benefits
- **Complete privacy**: No data sent to external servers
- **Offline capability**: Works without internet connection
- **Data control**: All manufacturing data stays local
- **Compliance**: Meets enterprise data governance requirements

### File Security
```bash
# Set appropriate permissions
chmod 644 models/gemma/gemma-2b-it.task
chown $USER:$USER models/gemma/gemma-2b-it.task
```

## Integration Success Indicators

### Model Loading Success
- [ ] .task file loads without errors
- [ ] MediaPipe recognizes file format
- [ ] First inference completes successfully
- [ ] Response time under 10 seconds

### ProcessGPT Integration Success
- [ ] ProcessGPT switches to local AI mode
- [ ] Manufacturing questions get intelligent responses
- [ ] All 25+ analysis types work with local model
- [ ] No external API calls detected

## Alternative Models

If Gemma-2B-IT doesn't work, these alternatives support .task format:

### Gemma 7B IT
- **Size**: ~6.5GB
- **Performance**: Better quality, slower inference
- **Memory**: 12GB RAM minimum

### Phi-3 Mini
- **Size**: ~2.3GB  
- **Performance**: Faster inference
- **Memory**: 6GB RAM minimum

### Custom Fine-tuned Models
- Use MediaPipe Model Maker to create custom .task files
- Fine-tune on manufacturing-specific data
- Optimize for ProcessGPT question types

This guide ensures you get the correct Gemma-2B-IT model in .task format for seamless ProcessGPT integration with complete local operation and data privacy.