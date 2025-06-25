#!/usr/bin/env python3
"""
Download Gemma 2B model - no authentication required
"""
from huggingface_hub import snapshot_download
import os

print("Downloading Gemma 2B model...")
print("This will download about 4.5GB - takes 10-20 minutes")

try:
    model_path = snapshot_download(
        repo_id="google/gemma-2b-it",
        local_dir="./models/gemma-2b-it",
        local_dir_use_symlinks=False
    )
    print("SUCCESS! Gemma 2B downloaded to:", model_path)
except Exception as e:
    print(f"Download failed: {e}")
    print("Trying alternative repository...")
    # Fallback to quantized version
    model_path = snapshot_download(
        repo_id="unsloth/gemma-2b-it-bnb-4bit",
        local_dir="./models/gemma-2b-it",
        local_dir_use_symlinks=False
    )
    print("Downloaded quantized Gemma 2B successfully!")