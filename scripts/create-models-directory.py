#!/usr/bin/env python3
"""
Create models directory structure for ProcessGPT local deployment
"""
import os
from pathlib import Path

def create_models_directory():
    """Create directory structure for AI models"""
    
    # Create main models directory
    models_dir = Path("models")
    models_dir.mkdir(exist_ok=True)
    
    # Create subdirectories for different models
    subdirs = ["gemma", "phi2", "backup"]
    
    for subdir in subdirs:
        (models_dir / subdir).mkdir(exist_ok=True)
        
    # Create README files for each directory
    readme_content = {
        "gemma": """# Gemma Model Directory

Place your Gemma-2B-IT .task file here:
- Download from: https://ai.google.dev/edge/models
- File name: gemma-2b-it.task
- File size: ~3.1GB (quantized 4-bit)

The file should be named exactly: gemma-2b-it.task
""",
        "phi2": """# Phi-2 Model Directory

Place your Phi-2 .task file here:
- Download from MediaPipe AI Edge
- File name: phi-2.task
- File size: ~2.3GB

Alternative models can also be placed here.
""",
        "backup": """# Model Backup Directory

Store backup copies of your models here.
Use this directory for:
- Model version backups
- Alternative model formats
- Temporary model storage during updates
"""
    }
    
    for subdir, content in readme_content.items():
        readme_file = models_dir / subdir / "README.md"
        readme_file.write_text(content)
    
    # Create .gitkeep files to ensure directories are tracked
    for subdir in subdirs:
        gitkeep_file = models_dir / subdir / ".gitkeep"
        gitkeep_file.touch()
    
    print("Created models directory structure:")
    print("models/")
    print("├── gemma/")
    print("│   ├── README.md")
    print("│   └── .gitkeep")
    print("├── phi2/")
    print("│   ├── README.md")
    print("│   └── .gitkeep")
    print("└── backup/")
    print("    ├── README.md")
    print("    └── .gitkeep")
    print("\nPlace your Gemma-2B-IT .task file in models/gemma/")

if __name__ == "__main__":
    create_models_directory()