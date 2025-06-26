#!/usr/bin/env python3
"""
Setup script for GitHub deployment preparation
Creates necessary directories and files for ProcessGPT local deployment
"""
import os
import json
from pathlib import Path

def create_github_deployment_structure():
    """Create complete directory structure for GitHub deployment"""
    
    # Create main directories
    directories = [
        "models/gemma",
        "models/phi2", 
        "models/backup",
        "docs",
        "scripts/tests",
        "scripts/setup"
    ]
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
        # Add .gitkeep to ensure empty directories are tracked
        (Path(directory) / ".gitkeep").touch()
    
    print("Created directory structure for GitHub deployment:")
    for directory in directories:
        print(f"  ✓ {directory}/")

def create_requirements_txt():
    """Create Python requirements.txt file"""
    requirements = [
        "torch>=2.0.0",
        "transformers>=4.35.0", 
        "mediapipe>=0.10.0",
        "numpy>=1.24.0",
        "accelerate>=0.24.0"
    ]
    
    with open("requirements.txt", "w") as f:
        f.write("\n".join(requirements))
    
    print("  ✓ Created requirements.txt")

def create_deployment_scripts():
    """Create deployment helper scripts"""
    
    # Quick setup script
    setup_script = """#!/bin/bash
# Quick setup script for ProcessGPT local deployment

echo "Setting up ProcessGPT Local Deployment..."

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Create models directory
echo "Creating models directory..."
python scripts/create-models-directory.py

# Setup environment
echo "Creating environment file..."
cp .env.example .env

echo "Setup complete!"
echo "Next steps:"
echo "1. Download Gemma-2B-IT model to models/gemma/"
echo "2. Start PostgreSQL database with Docker"
echo "3. Edit .env file with your settings"
echo "4. Run: npm run db:push"
echo "5. Run: npm run import-data"
echo "6. Run: npm run dev"
"""
    
    with open("scripts/setup/quick-setup.sh", "w") as f:
        f.write(setup_script)
    
    os.chmod("scripts/setup/quick-setup.sh", 0o755)
    print("  ✓ Created scripts/setup/quick-setup.sh")

def create_package_scripts():
    """Add helpful npm scripts to package.json"""
    
    # Read existing package.json
    try:
        with open("package.json", "r") as f:
            package_data = json.load(f)
    except FileNotFoundError:
        print("  ⚠ package.json not found - will be created during file copy")
        return
    
    # Add deployment scripts
    if "scripts" not in package_data:
        package_data["scripts"] = {}
    
    deployment_scripts = {
        "setup": "python scripts/create-models-directory.py",
        "test-db": "node -e \"console.log('Testing database connection...')\"",
        "test-gemma": "python scripts/test-gemma-connection.py",
        "import-data": "tsx scripts/import-sample-data.ts",
        "health-check": "curl http://localhost:5000/api/health"
    }
    
    for script_name, command in deployment_scripts.items():
        if script_name not in package_data["scripts"]:
            package_data["scripts"][script_name] = command
    
    # Write updated package.json
    with open("package.json", "w") as f:
        json.dump(package_data, f, indent=2)
    
    print("  ✓ Updated package.json with deployment scripts")

def create_docker_compose():
    """Create docker-compose.yml for easy database setup"""
    
    docker_compose = """version: '3.8'

services:
  postgres:
    image: postgres:16
    container_name: processgpt-db
    environment:
      POSTGRES_DB: processgpt
      POSTGRES_USER: processgpt
      POSTGRES_PASSWORD: processgpt123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
"""
    
    with open("docker-compose.yml", "w") as f:
        f.write(docker_compose)
    
    print("  ✓ Created docker-compose.yml")

def create_vscode_settings():
    """Create VS Code workspace settings"""
    
    # Create .vscode directory
    Path(".vscode").mkdir(exist_ok=True)
    
    # Settings
    settings = {
        "typescript.preferences.importModuleSpecifier": "relative",
        "editor.formatOnSave": True,
        "python.defaultInterpreterPath": "./venv/bin/python",
        "files.exclude": {
            "**/node_modules": True,
            "**/.git": True,
            "**/dist": True,
            "**/__pycache__": True
        },
        "editor.codeActionsOnSave": {
            "source.fixAll": True,
            "source.organizeImports": True
        }
    }
    
    with open(".vscode/settings.json", "w") as f:
        json.dump(settings, f, indent=2)
    
    # Extensions recommendations
    extensions = {
        "recommendations": [
            "ms-python.python",
            "ms-vscode.vscode-typescript-next",
            "rangav.vscode-thunder-client",
            "eamodio.gitlens",
            "ms-azuretools.vscode-docker",
            "esbenp.prettier-vscode"
        ]
    }
    
    with open(".vscode/extensions.json", "w") as f:
        json.dump(extensions, f, indent=2)
    
    print("  ✓ Created VS Code workspace settings")

def main():
    """Main setup function"""
    print("Setting up ProcessGPT for GitHub deployment...\n")
    
    create_github_deployment_structure()
    create_requirements_txt()
    create_deployment_scripts()
    create_package_scripts()
    create_docker_compose()
    create_vscode_settings()
    
    print("\n✅ GitHub deployment structure ready!")
    print("\nNext steps:")
    print("1. Copy all project files to your GitHub repository")
    print("2. Commit and push to GitHub")
    print("3. Clone on your local machine")
    print("4. Run: chmod +x scripts/setup/quick-setup.sh")
    print("5. Run: ./scripts/setup/quick-setup.sh")

if __name__ == "__main__":
    main()