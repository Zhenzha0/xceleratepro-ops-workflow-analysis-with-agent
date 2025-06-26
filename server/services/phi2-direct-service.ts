import { AIService } from './ai-service-factory';

export class Phi2DirectService implements AIService {
  private modelPath: string;
  private isConnected: boolean = false;
  
  constructor() {
    this.modelPath = process.env.PHI2_MODEL_PATH || './phi2-models';
  }

  async testConnection(): Promise<boolean> {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Check if model files exist
      const configPath = path.join(this.modelPath, 'config.json');
      const modelExists = fs.existsSync(configPath);
      
      if (modelExists) {
        this.isConnected = true;
        console.log('✓ Phi-2 model files found at:', this.modelPath);
        return true;
      } else {
        console.log('✗ Phi-2 model files not found at:', this.modelPath);
        return false;
      }
    } catch (error) {
      console.error('Error testing Phi-2 connection:', error);
      return false;
    }
  }

  async chat(messages: Array<{ role: string; content: string }>): Promise<string> {
    try {
      // For now, we'll use a Python subprocess to run Phi-2
      // This avoids complex Node.js ML dependencies
      const { spawn } = require('child_process');
      const path = require('path');
      
      const prompt = messages[messages.length - 1].content;
      
      return new Promise((resolve, reject) => {
        const pythonScript = path.join(__dirname, '../../scripts/run-phi2.py');
        const python = spawn('python', [pythonScript, this.modelPath, prompt]);
        
        let output = '';
        let error = '';
        
        python.stdout.on('data', (data: Buffer) => {
          output += data.toString();
        });
        
        python.stderr.on('data', (data: Buffer) => {
          error += data.toString();
        });
        
        python.on('close', (code: number) => {
          if (code === 0) {
            resolve(output.trim());
          } else {
            reject(new Error(`Phi-2 process failed: ${error}`));
          }
        });
        
        // Timeout after 30 seconds
        setTimeout(() => {
          python.kill();
          reject(new Error('Phi-2 response timeout'));
        }, 30000);
      });
    } catch (error) {
      throw new Error(`Phi-2 inference error: ${error.message}`);
    }
  }

  getModelInfo(): string {
    return 'Phi-2 (Microsoft) - Local Direct Integration';
  }

  supportsStreaming(): boolean {
    return false;
  }
}