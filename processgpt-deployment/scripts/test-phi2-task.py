#!/usr/bin/env python3
"""
Test script for Phi-2 .task file integration
Validates MediaPipe AI Edge connectivity for ProcessGPT
"""

import sys
import os
from pathlib import Path

def test_task_file(task_path):
    """Test if .task file is valid and accessible"""
    task_file = Path(task_path)
    
    if not task_file.exists():
        print(f"✗ Task file not found: {task_path}")
        return False
    
    if not task_file.suffix == '.task':
        print(f"✗ File is not a .task bundle: {task_path}")
        return False
    
    size_mb = task_file.stat().st_size / (1024 * 1024)
    print(f"✓ Found .task file: {task_path} ({size_mb:.1f} MB)")
    
    # Check if file size is reasonable for Phi-2 model
    if size_mb < 100:
        print(f"⚠ Warning: File seems small for Phi-2 model ({size_mb:.1f} MB)")
    elif size_mb > 5000:
        print(f"⚠ Warning: File seems large for Phi-2 model ({size_mb:.1f} MB)")
    else:
        print(f"✓ File size looks reasonable for Phi-2 model")
    
    return True

def test_mediapipe_import():
    """Test MediaPipe import and AI Edge capabilities"""
    try:
        import mediapipe as mp
        print(f"✓ MediaPipe {mp.__version__} available")
        
        # Try to import text generation specifically
        try:
            from mediapipe.tasks import python
            from mediapipe.tasks.python import text
            print("✓ MediaPipe text generation module available")
            return True
        except ImportError as e:
            print(f"✗ MediaPipe text generation not available: {e}")
            return False
            
    except ImportError:
        print("✗ MediaPipe not installed")
        return False

def test_phi2_inference(task_path):
    """Test actual Phi-2 inference with .task file"""
    try:
        import mediapipe as mp
        from mediapipe.tasks import python
        from mediapipe.tasks.python import text
        
        print(f"Loading Phi-2 model from: {task_path}")
        
        # Create text generator with .task file
        base_options = python.BaseOptions(model_asset_path=str(task_path))
        options = text.TextGeneratorOptions(base_options=base_options)
        generator = text.TextGenerator.create_from_options(options)
        
        # Test simple inference
        test_prompt = "What is manufacturing process mining?"
        print(f"Testing with prompt: {test_prompt}")
        
        result = generator.generate(test_prompt)
        print(f"✓ Phi-2 response: {result.text[:100]}...")
        
        return True
        
    except Exception as e:
        print(f"✗ Phi-2 inference failed: {e}")
        return False

def main():
    if len(sys.argv) != 2:
        print("Usage: python test-phi2-task.py <path-to-task-file>")
        print("Example: python test-phi2-task.py ./models/phi2/phi-2-instruct-int4.task")
        sys.exit(1)
    
    task_path = sys.argv[1]
    
    print("Testing Phi-2 .task file integration...")
    print("=" * 50)
    
    # Test 1: Validate .task file
    if not test_task_file(task_path):
        print("Task file validation failed")
        sys.exit(1)
    
    # Test 2: Check MediaPipe availability
    if not test_mediapipe_import():
        print("MediaPipe not ready - install with: pip install mediapipe")
        sys.exit(1)
    
    # Test 3: Test actual inference
    if test_phi2_inference(task_path):
        print("\n" + "=" * 50)
        print("✓ Phi-2 .task integration successful!")
        print("Ready for ProcessGPT local AI processing")
    else:
        print("\n" + "=" * 50)
        print("✗ Phi-2 inference test failed")
        print("Check .task file format and MediaPipe installation")
        sys.exit(1)

if __name__ == "__main__":
    main()