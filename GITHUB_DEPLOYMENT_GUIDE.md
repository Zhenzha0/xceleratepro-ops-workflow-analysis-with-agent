# Complete GitHub Deployment Guide for ProcessGPT with Gemma-2B-IT

## Overview
This guide will help you deploy ProcessGPT locally using VS Code with your Gemma-2B-IT model. GitHub approach is recommended for version control and easy updates.

## Prerequisites

### Required Software
- **VS Code**: Latest version with extensions
- **Node.js**: 18.x LTS or 20.x LTS
- **Python**: 3.9 (recommended for MediaPipe compatibility)
- **Git**: For repository management
- **Docker Desktop**: For PostgreSQL database

### VS Code Extensions (Install These)
```
- Thunder Client (for API testing)
- Python (Microsoft)
- TypeScript and JavaScript Language Features
- Prettier - Code formatter
- GitLens
- Docker
```

## Step 1: GitHub Repository Setup

### Create GitHub Repository
1. Go to GitHub and create new repository named `processgpt-local`
2. Initialize with README
3. Clone to your local machine:
```bash
git clone https://github.com/YOUR_USERNAME/processgpt-local.git
cd processgpt-local
```

### Copy Project Files
You'll need to download these files from the current project and add them to your GitHub repo:

**Essential Files:**
- `package.json` - Node.js dependencies
- `package-lock.json` - Dependency versions
- `tsconfig.json` - TypeScript configuration
- `vite.config.ts` - Build configuration
- `tailwind.config.ts` - CSS framework
- `drizzle.config.ts` - Database ORM
- `components.json` - UI components

**Source Code Directories:**
- `client/` - Complete React frontend
- `server/` - Complete Express backend
- `shared/` - TypeScript schemas
- `scripts/` - Setup scripts

**Data and Documentation:**
- `sample_data.csv` - Manufacturing dataset (301 cases)
- `README.md` - Project documentation

## Step 2: Environment Setup

### Install Node.js Dependencies
```bash
npm install
```

### Install Python Dependencies
```bash
# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install AI packages
pip install torch>=2.0.0 transformers>=4.35.0 mediapipe>=0.10.0 numpy accelerate
```

### Setup PostgreSQL Database
```bash
# Using Docker (easiest approach)
docker run --name processgpt-db \
  -e POSTGRES_DB=processgpt \
  -e POSTGRES_USER=processgpt \
  -e POSTGRES_PASSWORD=processgpt123 \
  -p 5432:5432 \
  -d postgres:16

# Verify database is running
docker ps
```

## Step 3: Gemma-2B-IT Model Setup

### Create Model Directory
```bash
mkdir -p models/gemma
```

### Place Your .task File
1. Copy your `gemma-2b-it.task` file to `models/gemma/`
2. Verify file size (should be ~3.1GB)
3. Test file accessibility:
```bash
ls -la models/gemma/gemma-2b-it.task
```

## Step 4: Environment Configuration

### Create .env File
```bash
cat > .env << 'EOF'
# Database Configuration
DATABASE_URL=postgresql://processgpt:processgpt123@localhost:5432/processgpt

# AI Configuration
USE_LOCAL_AI=true
GEMMA_MODEL_PATH=./models/gemma/gemma-2b-it.task
AI_SERVICE=gemma-local

# Fallback Configuration
OPENAI_API_KEY=your-openai-key-here

# Application Configuration
NODE_ENV=development
PORT=5000
EOF
```

## Step 5: Critical Code Fixes

### Fix AI Service Factory
Create corrected service factory file:

```bash
cat > server/services/gemma-python-bridge.ts << 'EOF'
import { spawn } from 'child_process';
import { AIAnalysisResponse } from '@shared/types';

export class GemmaPythonBridge {
  private modelPath: string;

  constructor(modelPath: string = './models/gemma/gemma-2b-it.task') {
    this.modelPath = modelPath;
  }

  async processQuery(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const python = spawn('python', ['scripts/gemma-inference.py', this.modelPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      python.stdin.write(prompt);
      python.stdin.end();
      
      let output = '';
      let error = '';
      
      python.stdout.on('data', (data) => output += data.toString());
      python.stderr.on('data', (data) => error += data.toString());
      
      python.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(new Error(`Gemma inference failed: ${error}`));
        }
      });
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.processQuery('Test connection');
      return response.length > 0;
    } catch (error) {
      return false;
    }
  }

  getModelInfo(): string {
    return 'Gemma-2B-IT (Google) - Local MediaPipe Integration';
  }
}
EOF
```

### Create Python Inference Script
```bash
cat > scripts/gemma-inference.py << 'EOF'
#!/usr/bin/env python3
import sys
import json
import os
from pathlib import Path

def load_gemma_model(task_path):
    """Load Gemma-2B-IT model from .task file"""
    try:
        import mediapipe as mp
        from mediapipe.tasks import python
        from mediapipe.tasks.python import text
        
        base_options = python.BaseOptions(model_asset_path=task_path)
        options = text.TextGeneratorOptions(base_options=base_options)
        generator = text.TextGenerator.create_from_options(options)
        return generator
    except Exception as e:
        print(f"Error loading model: {e}", file=sys.stderr)
        return None

def generate_response(generator, prompt):
    """Generate response using Gemma model"""
    try:
        result = generator.generate(prompt)
        return result.text
    except Exception as e:
        print(f"Error generating response: {e}", file=sys.stderr)
        return None

def main():
    if len(sys.argv) != 2:
        print("Usage: python gemma-inference.py <task-file-path>", file=sys.stderr)
        sys.exit(1)
    
    task_path = sys.argv[1]
    
    # Load model
    generator = load_gemma_model(task_path)
    if not generator:
        sys.exit(1)
    
    # Read prompt from stdin
    prompt = sys.stdin.read().strip()
    if not prompt:
        print("No prompt provided", file=sys.stderr)
        sys.exit(1)
    
    # Generate response
    response = generate_response(generator, prompt)
    if response:
        print(response)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
EOF
```

## Step 6: Database Initialization

### Setup Database Schema
```bash
npm run db:push
```

### Import Manufacturing Data
```bash
npm run import-data
```

### Verify Data Import
```bash
# Check if data loaded correctly
npm run test-data
```

## Step 7: Testing and Verification

### Test Gemma Model
```bash
python scripts/test-gemma-connection.py
```

### Test Application
```bash
# Start development server
npm run dev

# Application should be available at:
# http://localhost:5000
```

### Verify ProcessGPT Functions
1. Open browser to `http://localhost:5000`
2. Navigate to ProcessGPT tab
3. Click "Use Gemma-2B-IT Local AI"
4. Test with questions:
   - "What is our failure rate?"
   - "Which activity fails most often?"
   - "Show me anomaly patterns"

## Step 8: VS Code Development Setup

### Open Project in VS Code
```bash
code .
```

### Configure VS Code Settings
Create `.vscode/settings.json`:
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "python.defaultInterpreterPath": "./venv/bin/python",
  "files.exclude": {
    "**/node_modules": true,
    "**/.git": true,
    "**/dist": true
  }
}
```

### Create Launch Configuration
Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch ProcessGPT",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/server/index.ts",
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

## Step 9: Git Version Control

### Initial Commit
```bash
git add .
git commit -m "Initial ProcessGPT local deployment setup"
git push origin main
```

### Create Development Branch
```bash
git checkout -b gemma-integration
git push -u origin gemma-integration
```

## Dependencies Summary

### Node.js Dependencies (package.json)
```json
{
  "dependencies": {
    "express": "^4.19.2",
    "drizzle-orm": "^0.33.0",
    "@neondatabase/serverless": "^0.9.0",
    "react": "^18.3.1",
    "typescript": "^5.5.3",
    "vite": "^5.4.0",
    "wouter": "^3.3.5",
    "@tanstack/react-query": "^5.51.23",
    "tailwindcss": "^3.4.0",
    "recharts": "^2.12.7",
    "lucide-react": "^0.427.0"
  }
}
```

### Python Dependencies (requirements.txt)
```
torch>=2.0.0
transformers>=4.35.0
mediapipe>=0.10.0
numpy>=1.24.0
accelerate>=0.24.0
```

### System Requirements
- **RAM**: 8GB minimum (4GB app + 4GB model)
- **Storage**: 10GB free space
- **CPU**: Multi-core processor (Intel i5/AMD Ryzen 5 or better)

## Troubleshooting

### Common Issues

**Issue**: MediaPipe installation fails
**Solution**: Use Python 3.9 specifically:
```bash
pyenv install 3.9.18
pyenv local 3.9.18
pip install mediapipe
```

**Issue**: Database connection fails
**Solution**: Verify Docker container is running:
```bash
docker ps
docker logs processgpt-db
```

**Issue**: Gemma model fails to load
**Solution**: Check file permissions and size:
```bash
ls -la models/gemma/gemma-2b-it.task
file models/gemma/gemma-2b-it.task
```

## Success Indicators

### Deployment Success Checklist
- [ ] GitHub repository created and cloned
- [ ] All dependencies installed successfully
- [ ] PostgreSQL database running and connected
- [ ] 301 manufacturing cases imported
- [ ] Gemma-2B-IT model loads without errors
- [ ] ProcessGPT responds with local AI
- [ ] All 25+ analysis types return authentic data
- [ ] No external API calls (complete privacy)

### Performance Benchmarks
- Database queries: < 200ms
- Gemma-2B-IT inference: 2-5 seconds
- Total ProcessGPT response: < 8 seconds
- Memory usage: < 8GB total

## GitHub Workflow Benefits

1. **Version Control**: Track all changes and improvements
2. **Collaboration**: Easy sharing and collaboration
3. **Backup**: Code safely stored in cloud
4. **Updates**: Pull fixes and improvements easily
5. **Branching**: Test new features safely

This approach ensures you have a complete, working ProcessGPT installation with your Gemma-2B-IT model while maintaining full version control and the ability to receive updates.