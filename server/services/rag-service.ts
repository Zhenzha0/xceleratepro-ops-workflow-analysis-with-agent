
export interface QAPair {
  id: string;
  category: string;
  question: string;
  openaiResponse: string;
  queryType: string;
  dataContext?: any;
  embedding?: number[];
  createdAt: Date;
}

export interface RAGConfig {
  maxExamples: number;
  similarityThreshold: number;
  useSemanticSearch: boolean;
}

export class RAGService {
  private static knowledgeBase: QAPair[] = [];
  private static isInitialized = false;
  
  private static readonly DEFAULT_CONFIG: RAGConfig = {
    maxExamples: 3,
    similarityThreshold: 0.7,
    useSemanticSearch: true
  };

  /**
   * Initialize RAG system with predefined questions
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('Initializing RAG Service...');
    
    // Load existing knowledge base from storage
    await this.loadKnowledgeBase();
    
    this.isInitialized = true;
    console.log(`RAG Service initialized with ${this.knowledgeBase.length} Q&A pairs`);
  }

  /**
   * Core method: Generate OpenAI responses for training questions
   */
  static async buildKnowledgeBase(forceRebuild: boolean = false): Promise<void> {
    const trainingQuestions = this.getTrainingQuestions();
    
    console.log(`Building knowledge base with ${trainingQuestions.length} training questions...`);
    
    for (const questionGroup of trainingQuestions) {
      console.log(`\nProcessing category: ${questionGroup.category}`);
      
      for (const question of questionGroup.questions) {
        // Check if we already have this question (unless forcing rebuild)
        const existing = this.knowledgeBase.find(qa => 
          qa.question.toLowerCase() === question.toLowerCase() && 
          qa.category === questionGroup.category
        );
        
        if (existing && !forceRebuild) {
          console.log(`✓ Skipping existing: ${question.substring(0, 50)}...`);
          continue;
        }

        try {
          console.log(`🤖 Generating OpenAI response for: ${question.substring(0, 50)}...`);
          
          // Import AIAnalyst dynamically to avoid circular dependencies
          const { AIAnalyst } = await import('./ai-analyst');
          
          // Generate high-quality OpenAI response with real data
          const response = await AIAnalyst.analyzeQuery({
            query: question,
            sessionId: `rag-training-${Date.now()}`,
            contextData: { isTraining: true, category: questionGroup.category }
          });

          // Store in knowledge base
          const qaPair: QAPair = {
            id: `${questionGroup.category}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            category: questionGroup.category,
            question: question,
            openaiResponse: response.response,
            queryType: response.queryType,
            dataContext: response.data,
            createdAt: new Date()
          };

          this.knowledgeBase.push(qaPair);
          await this.saveQAPair(qaPair);
          
          console.log(`✅ Stored: ${question.substring(0, 50)}...`);
          
          // Small delay to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`❌ Failed to generate response for: ${question}`, error);
        }
      }
    }
    
    console.log(`\n🎉 Knowledge base building complete! Total Q&A pairs: ${this.knowledgeBase.length}`);
  }

  /**
   * Find similar Q&A pairs for a given query
   */
  static async findSimilarExamples(query: string, config?: Partial<RAGConfig>): Promise<QAPair[]> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    if (this.knowledgeBase.length === 0) {
      console.log('Knowledge base is empty, returning no examples');
      return [];
    }

    // Simple keyword-based similarity for now (can be enhanced with embeddings)
    const queryWords = query.toLowerCase().split(/\s+/);
    
    const scoredPairs = this.knowledgeBase.map(qa => {
      const questionWords = qa.question.toLowerCase().split(/\s+/);
      
      // Calculate similarity score
      let score = 0;
      queryWords.forEach(word => {
        if (questionWords.some(qWord => qWord.includes(word) || word.includes(qWord))) {
          score += 1;
        }
      });
      
      // Boost score for category keywords
      if (query.toLowerCase().includes('failure') && qa.category.includes('Failure')) score += 2;
      if (query.toLowerCase().includes('time') && qa.category.includes('Timing')) score += 2;
      if (query.toLowerCase().includes('anomaly') && qa.category.includes('Anomaly')) score += 2;
      
      return { qa, score: score / queryWords.length };
    });

    // Sort by similarity and filter by threshold
    const similarPairs = scoredPairs
      .filter(item => item.score >= finalConfig.similarityThreshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, finalConfig.maxExamples)
      .map(item => item.qa);

    console.log(`Found ${similarPairs.length} similar examples for query: ${query.substring(0, 50)}...`);
    
    return similarPairs;
  }

  /**
   * Enhance local AI prompt with RAG examples
   */
  static async enhancePromptWithRAG(query: string, originalPrompt?: string): Promise<string> {
    const similarExamples = await this.findSimilarExamples(query);
    
    if (similarExamples.length === 0) {
      return originalPrompt || `Analyze this manufacturing process query: ${query}`;
    }

    let enhancedPrompt = `You are analyzing manufacturing process data. Here are examples of similar high-quality analysis:\n\n`;
    
    similarExamples.forEach((example, index) => {
      enhancedPrompt += `Example ${index + 1}:\n`;
      enhancedPrompt += `Question: "${example.question}"\n`;
      enhancedPrompt += `Analysis: "${example.openaiResponse.substring(0, 500)}..."\n\n`;
    });
    
    enhancedPrompt += `Now provide a similar detailed analysis for: "${query}"\n\n`;
    enhancedPrompt += `Use the same analytical depth and structure as the examples above. Focus on specific data insights, patterns, and actionable recommendations.`;
    
    return enhancedPrompt;
  }

  /**
   * Get training questions organized by category
   */
  private static getTrainingQuestions(): Array<{category: string, questions: string[]}> {
    return [
      {
        category: "Failure Analysis & Diagnosis",
        questions: [
          "What are the most common causes of failure?",
          "Which activity is most associated with unsatisfactory outcomes?",
          "What are the top failure reasons for specific machines/processes?",
          "Are there any recurring failure patterns in recent cases?",
          "Which failures are linked to long wait times or transitions?",
          "What kind of errors are usually found in manufacturing activities?"
        ]
      },
      {
        category: "Delay & Timing Issues", 
        questions: [
          "Which activities have the longest average processing time?",
          "Are there any specific transitions that take longer than expected?",
          "Are delays more frequent during specific time periods or shifts?",
          "What is the average wait time before/after critical activities?",
          "Which cases had abnormal durations compared to others?"
        ]
      },
      {
        category: "Anomaly Detection",
        questions: [
          "Were there any anomalous sequences in recent cases?",
          "Are there cases with unusually high failure rates?", 
          "Are there any activities with sudden spikes in processing time?"
        ]
      },
      {
        category: "Trend & Pattern Mining",
        questions: [
          "How has the failure rate changed over time?",
          "Which process steps are improving or deteriorating over time?",
          "Are there new failure types emerging in recent data?"
        ]
      },
      {
        category: "Root Cause & Correlation", 
        questions: [
          "Is there any link between failure type and processing time?",
          "Do unsatisfactory cases share similar sequences of events?",
          "Which upstream activities most often lead to failures?"
        ]
      },
      {
        category: "Maintenance & Recommendations",
        questions: [
          "Which machines or processes might require maintenance based on recent failures?",
          "Can you suggest potential areas to reduce downtime?",
          "What changes can be made to reduce failure rates in specific activities?"
        ]
      },
      {
        category: "Targeted Case Queries",
        questions: [
          "Show me all cases with specific failure keywords in the description",
          "What happened in specific Case IDs that led to failures?",
          "Give me a summary of reasons for failure in the last 100 cases"
        ]
      }
    ];
  }

  /**
   * Storage methods
   */
  private static async loadKnowledgeBase(): Promise<void> {
    try {
      // For now, use memory storage - can be enhanced with persistent DB
      console.log('Loading knowledge base from storage...');
      // TODO: Implement persistent storage loading
      this.knowledgeBase = [];
    } catch (error) {
      console.error('Error loading knowledge base:', error);
      this.knowledgeBase = [];
    }
  }

  private static async saveQAPair(qaPair: QAPair): Promise<void> {
    try {
      // For now, just keep in memory - can be enhanced with persistent DB
      console.log(`Saved Q&A pair: ${qaPair.id}`);
      // TODO: Implement persistent storage saving
    } catch (error) {
      console.error('Error saving Q&A pair:', error);
    }
  }

  /**
   * Utility methods
   */
  static getKnowledgeBaseSize(): number {
    return this.knowledgeBase.length;
  }

  static getKnowledgeBaseStats(): {totalPairs: number, categories: string[], avgResponseLength: number} {
    const categories = Array.from(new Set(this.knowledgeBase.map(qa => qa.category)));
    const avgLength = this.knowledgeBase.reduce((sum, qa) => sum + qa.openaiResponse.length, 0) / this.knowledgeBase.length;
    
    return {
      totalPairs: this.knowledgeBase.length,
      categories,
      avgResponseLength: Math.round(avgLength)
    };
  }

  static async clearKnowledgeBase(): Promise<void> {
    this.knowledgeBase = [];
    console.log('Knowledge base cleared');
  }
} 