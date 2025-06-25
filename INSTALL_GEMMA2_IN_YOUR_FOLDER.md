# Install Gemma 2B in Your Existing Model Folder

I can see you already have a model folder at `C:\Users\rober\my-ai-model\models\tinyllama-chat`. Let's install Gemma 2B right next to it.

## Step 1: Open Command Prompt in Your Folder

1. Open File Explorer
2. Navigate to: `C:\Users\rober\my-ai-model\models\`
3. In the address bar, type `cmd` and press Enter
4. This opens Command Prompt directly in your models folder

## Step 2: Install Download Tool (if needed)

```cmd
pip install huggingface_hub
```

## Step 3: Download Gemma 2B to Your Models Folder

Copy and paste this exact command:

```cmd
python -c "from huggingface_hub import snapshot_download; snapshot_download(repo_id='unsloth/gemma-2b-it-bnb-4bit', local_dir='./gemma-2b-it')"
```

This will create: `C:\Users\rober\my-ai-model\models\gemma-2b-it\`

## Step 4: Your Folder Structure Will Look Like:

```
C:\Users\rober\my-ai-model\models\
├── tinyllama-chat\          (your existing model)
└── gemma-2b-it\            (new Gemma 2B model)
    ├── config.json
    ├── model.safetensors
    ├── tokenizer.json
    └── other files...
```

## Step 5: Download the Server Script

1. Save this as `start_gemma2_server.py` in your `my-ai-model` folder
2. Or I can create it for you automatically

## Step 6: Start Your Local Gemma 2B Server

From your `my-ai-model` folder:

```cmd
python start_gemma2_server.py
```

## Step 7: Connect to ProcessGPT

1. Go back to your ProcessGPT app
2. Click "Gemma 2B Local" button
3. Start analyzing your manufacturing data privately

## Folder Locations:
- **TinyLlama**: `C:\Users\rober\my-ai-model\models\tinyllama-chat\`
- **Gemma 2B**: `C:\Users\rober\my-ai-model\models\gemma-2b-it\`
- **Server Script**: `C:\Users\rober\my-ai-model\start_gemma2_server.py`

The download takes 15-30 minutes and will be about 2GB. After that, you'll have both models available locally with complete privacy.