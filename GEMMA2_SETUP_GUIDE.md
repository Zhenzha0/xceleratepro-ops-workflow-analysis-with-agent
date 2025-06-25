# Complete Gemma 2B Setup Guide

## Step 1: Install Required Software

### Install Python (if you don't have it)
1. Go to https://python.org/downloads
2. Download Python 3.11 or newer
3. Run the installer and check "Add Python to PATH"

### Install Git (if you don't have it)
1. Go to https://git-scm.com/downloads
2. Download and install Git
3. Use default settings during installation

## Step 2: Download Gemma 2B Model

### Option A: Using Hugging Face Hub (Recommended)
1. Open Command Prompt (Windows) or Terminal (Mac/Linux)
2. Install the Hugging Face library:
   ```
   pip install huggingface_hub
   ```
3. Download the model (this will take 10-20 minutes, ~4.5GB):
   ```
   python -c "from huggingface_hub import snapshot_download; snapshot_download(repo_id='google/gemma-2b-it', local_dir='./gemma-2b-model')"
   ```

### Option B: Using Git LFS (Alternative)
1. Install Git LFS:
   ```
   git lfs install
   ```
2. Clone the model repository:
   ```
   git clone https://huggingface.co/google/gemma-2b-it
   ```

## Step 3: Verify Download
1. Check that you have a folder called `gemma-2b-model` (or `gemma-2b-it`)
2. Inside should be files like:
   - `model.safetensors` or `pytorch_model.bin`
   - `tokenizer.json`
   - `config.json`
   - Other model files

## Step 4: Set Up Local Server
1. Install required Python libraries:
   ```
   pip install torch transformers flask
   ```
2. Your Gemma 2B model is now ready to use!

## Step 5: Connect to ProcessGPT
1. Once download is complete, click "Gemma 2B Local" button in ProcessGPT
2. Ask manufacturing questions like "What are the main failure patterns?"
3. All analysis happens locally on your computer

## Troubleshooting

### If download fails:
- Check internet connection
- Try the alternative download method
- Make sure you have enough disk space (5GB free)

### If Python commands don't work:
- Make sure Python is installed and in your PATH
- Try `python3` instead of `python`
- On Windows, try `py` instead of `python`

### Need help?
- The model file should be about 4.5GB when fully downloaded
- Download time depends on your internet speed
- You only need to download once, then you can use it forever locally

## What You Get
- Complete data privacy (no external API calls)
- Offline manufacturing analysis capabilities
- All 25 ProcessGPT question types supported
- No recurring costs or API limits