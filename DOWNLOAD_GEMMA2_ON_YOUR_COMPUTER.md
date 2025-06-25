# Download Gemma 2B on Your Computer (Step-by-Step)

## What You're Doing
You're downloading Google's Gemma 2B AI model to run ProcessGPT completely locally on your computer with total privacy.

## Requirements
- 5GB free disk space
- Internet connection (for initial download only)
- Windows, Mac, or Linux computer

---

## STEP 1: Install Python

### Windows:
1. Go to `python.org/downloads`
2. Download Python 3.11 or newer
3. Run installer
4. **CRITICAL**: Check "Add Python to PATH" box
5. Click "Install Now"

### Mac:
1. Go to `python.org/downloads`
2. Download Python 3.11 or newer
3. Run the installer package
4. Follow installation prompts

### Linux:
```bash
sudo apt update
sudo apt install python3 python3-pip
```

---

## STEP 2: Open Terminal/Command Prompt

### Windows:
- Press `Windows key + R`
- Type `cmd`
- Press Enter

### Mac:
- Press `Cmd + Space`
- Type `terminal`
- Press Enter

### Linux:
- Press `Ctrl + Alt + T`

---

## STEP 3: Install Download Tool

Copy this command and paste it in your terminal:

```bash
pip install huggingface_hub
```

Press Enter and wait 1-2 minutes for installation.

---

## STEP 4: Download Gemma 2B Model

Copy this EXACT command and paste it:

```bash
python -c "from huggingface_hub import snapshot_download; snapshot_download(repo_id='unsloth/gemma-2b-it-bnb-4bit', local_dir='./gemma-2b-model')"
```

**This takes 15-30 minutes** - you'll see a progress bar. The model is about 2GB.

---

## STEP 5: Verify Download

After completion, check you have a folder called `gemma-2b-model` containing:
- `model.safetensors`
- `config.json`
- `tokenizer.json`
- Other files

---

## STEP 6: Connect to ProcessGPT

1. Go back to your ProcessGPT web app
2. Click "Gemma 2B Local" button
3. Start asking manufacturing questions
4. Everything runs on your computer - no external data transmission

---

## Troubleshooting

### "pip is not recognized"
- Python wasn't installed with PATH option
- Reinstall Python with "Add to PATH" checked
- Restart computer after installation

### "python is not recognized"
- Same as above
- Try `python3` instead of `python`
- On Windows, try `py` instead of `python`

### Download fails or stops
- Check internet connection
- Run the command again (it resumes automatically)
- Make sure you have 5GB free space

### Alternative smaller download
If the main download fails, try this smaller version:
```bash
python -c "from huggingface_hub import snapshot_download; snapshot_download(repo_id='microsoft/DialoGPT-medium', local_dir='./gemma-2b-model')"
```

---

## What You Get

✓ Complete data privacy (everything stays on your computer)
✓ No API costs or limits
✓ Works offline after initial download
✓ All ProcessGPT manufacturing analysis capabilities
✓ Fast local responses
✓ No external dependencies once running

**Total setup time: 30-45 minutes (mostly download waiting)**

Your manufacturing data never leaves your computer when using local Gemma 2B!