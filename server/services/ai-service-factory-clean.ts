import { IntelligentAnalyst } from './intelligent-analyst';
import { GeminiService } from './gemini-service';

export class AIServiceFactory {
  private static currentService: 'openai' | 'gemini' = 'openai';
  private static intelligentAnalyst = new IntelligentAnalyst();
  private static geminiService = new GeminiService();

  static getCurrentService() {
    return this.currentService;
  }

  static getService() {
    switch (this.currentService) {
      case 'gemini':
        return this.geminiService;
      case 'openai':
      default:
        return this.intelligentAnalyst;
    }
  }

  static async switchToOpenAI() {
    this.currentService = 'openai';
    return { success: true, service: 'openai', name: 'OpenAI GPT-4o' };
  }

  static async switchToGemini() {
    this.currentService = 'gemini';
    return { success: true, service: 'gemini', name: 'Google Gemini' };
  }

  static getServiceInfo() {
    const serviceMap = {
      openai: { service: 'openai', name: 'OpenAI GPT-4o' },
      gemini: { service: 'gemini', name: 'Google Gemini' }
    };
    return serviceMap[this.currentService];
  }

  // Legacy method for backward compatibility
  static async enableGemini() {
    return this.switchToGemini();
  }
}