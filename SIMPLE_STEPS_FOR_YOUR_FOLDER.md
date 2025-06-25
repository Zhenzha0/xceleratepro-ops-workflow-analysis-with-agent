# Install Gemma 2B in Your Folder (Super Simple)

I see you have models in: `C:\Users\rober\my-ai-model\models\tinyllama-chat`

## Step 1: Open Command Prompt in Your Models Folder

1. Open File Explorer
2. Go to: `C:\Users\rober\my-ai-model\models\`
3. Click in the address bar where it shows the path
4. Type `cmd` and press Enter

## Step 2: Download Gemma 2B (Copy & Paste This)

```
python -c "from huggingface_hub import snapshot_download; snapshot_download(repo_id='unsloth/gemma-2b-it-bnb-4bit', local_dir='./gemma-2b-it')"
```

**Wait 15-30 minutes** - it downloads about 2GB

## Step 3: You'll Have Both Models

```
C:\Users\rober\my-ai-model\models\
├── tinyllama-chat\     (your existing model)
└── gemma-2b-it\       (new Gemma 2B model)
```

## Step 4: Start Gemma 2B Server

1. Go back to: `C:\Users\rober\my-ai-model\`
2. Save the `start_gemma2_server_for_your_folder.py` file there
3. Run: `python start_gemma2_server_for_your_folder.py`

## Step 5: Use with ProcessGPT

1. Click "Gemma 2B Local" in ProcessGPT
2. Ask manufacturing questions
3. Everything stays on your computer

**That's it!** Your manufacturing data stays completely private.