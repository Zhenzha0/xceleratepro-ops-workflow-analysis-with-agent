#!/usr/bin/env python3
"""
Setup script for Phi-2 local AI integration with ProcessGPT
Prepares environment for .task model file integration
"""

import os
import sys
import subprocess
import json
from pathlib import Path

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        print("Error: Python 3.8 or higher required")
        return False
    print(f"✓ Python {sys.version_info.major}.{sys.version_info.minor} detected")
    return True

def install_dependencies():
    """Install required Python packages for local AI"""
    packages = [
        'torch',
        'transformers>=4.20.0',
        'mediapipe>=0.10.0',
        'numpy',
        'accelerate'
    ]
    
    print("Installing Python dependencies for local AI...")
    for package in packages:
        try:
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', package])
            print(f"✓ Installed {package}")
        except subprocess.CalledProcessError as e:
            print(f"✗ Failed to install {package}: {e}")
            return False
    return True

def create_model_directory():
    """Create directory structure for AI models"""
    model_dir = Path('./models/phi2')
    model_dir.mkdir(parents=True, exist_ok=True)
    print(f"✓ Created model directory: {model_dir}")
    return model_dir

def check_task_file(model_dir):
    """Check if .task file exists"""
    task_file = model_dir / 'phi-2-instruct-int4.task'
    if task_file.exists():
        size_mb = task_file.stat().st_size / (1024 * 1024)
        print(f"✓ Found Phi-2 .task file ({size_mb:.1f} MB)")
        return True
    else:
        print(f"○ Waiting for .task file at: {task_file}")
        return False

def create_env_config():
    """Create environment configuration for local AI"""
    config = {
        'USE_LOCAL_AI': 'true',
        'PHI2_MODEL_PATH': './models/phi2/phi-2-instruct-int4.task',
        'AI_SERVICE': 'phi2-mediapipe'
    }
    
    env_file = Path('.env.local')
    with open(env_file, 'w') as f:
        for key, value in config.items():
            f.write(f"{key}={value}\n")
    
    print(f"✓ Created local AI configuration: {env_file}")
    return True

def test_mediapipe_connection():
    """Test MediaPipe installation"""
    try:
        import mediapipe as mp
        print(f"✓ MediaPipe {mp.__version__} installed")
        return True
    except ImportError:
        print("✗ MediaPipe not available")
        return False

def main():
    print("Setting up Phi-2 Local AI for ProcessGPT...")
    print("=" * 50)
    
    # Check requirements
    if not check_python_version():
        return False
    
    # Install dependencies
    if not install_dependencies():
        print("Failed to install dependencies")
        return False
    
    # Create model directory
    model_dir = create_model_directory()
    
    # Check for .task file
    has_task_file = check_task_file(model_dir)
    
    # Test MediaPipe
    test_mediapipe_connection()
    
    # Create environment config
    create_env_config()
    
    print("\n" + "=" * 50)
    if has_task_file:
        print("✓ Setup complete! Phi-2 ready for local AI processing")
        print("  Run: npm run dev")
        print("  Then switch to Phi-2 AI in ProcessGPT interface")
    else:
        print("○ Setup prepared. Place your .task file in:")
        print(f"  {model_dir}/phi-2-instruct-int4.task")
        print("  Then restart ProcessGPT")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)