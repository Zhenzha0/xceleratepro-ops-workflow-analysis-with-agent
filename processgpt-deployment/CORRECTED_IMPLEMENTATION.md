# Corrected Gemma-2B-IT Implementation

## Technical Issues Fixed

The original implementation had several critical issues. Here's the corrected approach:

### 1. Python Bridge Service (Recommended)

**Create: `server/services/gemma-python-bridge.ts`**
```typescript
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
```

**Create: `scripts/gemma-inference.py`**
```python
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
```

### 2. Fixed Service Factory

**Update: `server/services/ai-service-factory.ts`**
```typescript
import { AIAnalysisRequest, AIAnalysisResponse } from '@shared/types';
import { GemmaPythonBridge } from './gemma-python-bridge';

export class AIServiceFactory {
  private static useGemmaLocal = false;
  private static gemmaService: GemmaPythonBridge | null = null;

  static async analyzeQuery(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      if (this.useGemmaLocal && this.gemmaService) {
        // Use local Gemma-2B-IT model
        const { IntelligentAnalyst } = await import('./intelligent-analyst');
        return await IntelligentAnalyst.analyzeQuery(request, this.gemmaService);
      } else {
        // Fallback to OpenAI
        const { IntelligentAnalyst } = await import('./intelligent-analyst');
        return await IntelligentAnalyst.analyzeQuery(request);
      }
    } catch (error) {
      console.error('AI service error:', error);
      
      // Fallback chain
      if (this.useGemmaLocal) {
        console.log('Gemma-2B-IT failed, falling back to OpenAI...');
        this.useGemmaLocal = false;
        const { IntelligentAnalyst } = await import('./intelligent-analyst');
        return await IntelligentAnalyst.analyzeQuery(request);
      }
      
      throw error;
    }
  }

  static enableGemmaLocal(modelPath?: string) {
    this.gemmaService = new GemmaPythonBridge(modelPath);
    this.useGemmaLocal = true;
    console.log('✓ Switched to Gemma-2B-IT Local AI');
  }

  static disableGemmaLocal() {
    this.useGemmaLocal = false;
    this.gemmaService = null;
    console.log('✓ Disabled Gemma-2B-IT, using OpenAI');
  }

  static async testGemmaConnection(): Promise<boolean> {
    if (!this.gemmaService) return false;
    return await this.gemmaService.testConnection();
  }

  static getStatus() {
    if (this.useGemmaLocal && this.gemmaService) {
      return {
        service: 'gemma-local',
        name: this.gemmaService.getModelInfo()
      };
    } else {
      return {
        service: 'openai',
        name: 'ProcessGPT (OpenAI GPT-4o)'
      };
    }
  }
}
```

### 3. Updated Routes

**Update: `server/routes.ts` (relevant sections)**
```typescript
// Gemma-2B-IT Local AI Routes
app.post("/api/ai/switch-to-gemma-local", async (req, res) => {
  try {
    const { modelPath } = req.body;
    AIServiceFactory.enableGemmaLocal(modelPath);
    
    const connectionTest = await AIServiceFactory.testGemmaConnection();
    
    res.json({
      status: 'success',
      message: 'Switched to Gemma-2B-IT Local AI',
      service: 'Gemma-2B-IT (Local)',
      connected: connectionTest
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

app.get("/api/ai/test-gemma-local", async (req, res) => {
  try {
    const isConnected = await AIServiceFactory.testGemmaConnection();
    
    res.json({
      connected: isConnected,
      service: 'gemma-local',
      model: 'Gemma-2B-IT (Google) - Local MediaPipe Integration'
    });
  } catch (error: any) {
    res.status(500).json({
      connected: false,
      error: error.message
    });
  }
});
```

## Installation Requirements

**Add to `package.json` dependencies:**
```json
{
  "dependencies": {
    "@types/node": "^20.0.0"
  }
}
```

**Python requirements (install with pip):**
```
torch>=2.0.0
transformers>=4.35.0
mediapipe>=0.10.0
numpy
accelerate
```

## Environment Configuration

**Add to `.env`:**
```
GEMMA_MODEL_PATH=./models/gemma/gemma-2b-it.task
USE_LOCAL_AI=true
AI_SERVICE=gemma-local
```

## Testing Script

**Update: `scripts/test-gemma-task.py`**
```python
#!/usr/bin/env python3
import sys
import os
import subprocess

def test_python_bridge():
    """Test the Python bridge integration"""
    try:
        # Test with sample prompt
        result = subprocess.run([
            'python', 'scripts/gemma-inference.py', 
            './models/gemma/gemma-2b-it.task'
        ], input='What is process mining?', text=True, 
        capture_output=True, timeout=30)
        
        if result.returncode == 0:
            print(f"✓ Python bridge working: {result.stdout[:100]}...")
            return True
        else:
            print(f"✗ Python bridge failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"✗ Bridge test error: {e}")
        return False

def main():
    print("Testing Gemma-2B-IT integration...")
    
    # Test Python bridge
    if test_python_bridge():
        print("✓ Gemma-2B-IT integration ready for ProcessGPT")
    else:
        print("✗ Integration test failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
```

This corrected implementation uses a Python subprocess bridge instead of trying to use non-existent JavaScript MediaPipe packages. The approach is more reliable and maintains all ProcessGPT capabilities while ensuring authentic data processing through the existing database analysis functions.