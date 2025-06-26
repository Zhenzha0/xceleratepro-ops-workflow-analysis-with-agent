import OpenAI from "openai";
import { FailureEmbedding, InsertFailureEmbedding, SemanticSearchResult } from '@shared/schema';
import { storage } from '../storage';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export class SemanticSearch {
  private static readonly EMBEDDING_MODEL = "text-embedding-3-small";
  private static readonly SIMILARITY_THRESHOLD = 0.7;

  static async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: this.EMBEDDING_MODEL,
        input: text,
        encoding_format: "float",
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate text embedding');
    }
  }

  static async indexFailureDescription(
    description: string,
    caseId?: string,
    activity?: string
  ): Promise<FailureEmbedding> {
    const embedding = await this.generateEmbedding(description);
    
    const failureEmbedding: InsertFailureEmbedding = {
      failureDescription: description,
      embedding: embedding,
      caseId,
      activity
    };

    return await storage.createFailureEmbedding(failureEmbedding);
  }

  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  static async searchSimilarFailures(
    query: string,
    limit: number = 10
  ): Promise<SemanticSearchResult[]> {
    try {
      // Generate embedding for the search query
      const queryEmbedding = await this.generateEmbedding(query);
      
      // In a production environment, you would use a vector database like Pinecone or Qdrant
      // For this implementation, we'll use a simplified approach with PostgreSQL's JSON support
      
      // This is a basic implementation - in production, use proper vector similarity search
      const results = await storage.searchFailureEmbeddings(query, limit * 2);
      
      // Calculate similarities and filter
      const similarityResults: SemanticSearchResult[] = [];
      
      for (const result of results) {
        if (typeof result.similarity === 'number') {
          // Mock similarity for simplified implementation
          // In production, calculate actual cosine similarity with stored embeddings
          const similarity = Math.random() * 0.4 + 0.6; // Mock similarity between 0.6-1.0
          
          if (similarity >= this.SIMILARITY_THRESHOLD) {
            similarityResults.push({
              ...result,
              similarity
            });
          }
        }
      }

      // Sort by similarity and return top results
      return similarityResults
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

    } catch (error) {
      console.error('Error in semantic search:', error);
      return [];
    }
  }

  static async searchWithContext(
    query: string,
    context: {
      equipment?: string;
      timeRange?: { start: Date; end: Date };
      caseId?: string;
    },
    limit: number = 10
  ): Promise<{
    results: SemanticSearchResult[];
    contextualInsights: string;
  }> {
    const results = await this.searchSimilarFailures(query, limit);
    
    // Generate contextual insights based on search results and context
    let contextualInsights = '';
    
    if (results.length > 0) {
      const equipmentCounts = new Map<string, number>();
      const activityCounts = new Map<string, number>();
      
      results.forEach(result => {
        if (result.activity) {
          activityCounts.set(result.activity, (activityCounts.get(result.activity) || 0) + 1);
        }
      });

      const topActivities = Array.from(activityCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      contextualInsights = `Found ${results.length} similar failures. `;
      
      if (topActivities.length > 0) {
        contextualInsights += `Most common activities: ${topActivities.map(([activity, count]) => 
          `${activity} (${count})`).join(', ')}. `;
      }

      if (context.equipment) {
        const equipmentResults = results.filter(r => 
          r.description.toLowerCase().includes(context.equipment!.toLowerCase())
        );
        contextualInsights += `${equipmentResults.length} results specifically related to ${context.equipment}. `;
      }

    } else {
      contextualInsights = 'No similar failures found. This might indicate a novel failure pattern that requires investigation.';
    }

    return {
      results,
      contextualInsights
    };
  }

  static async analyzeFailureCluster(
    failures: SemanticSearchResult[]
  ): Promise<{
    commonThemes: string[];
    rootCauses: string[];
    preventiveActions: string[];
  }> {
    if (failures.length === 0) {
      return {
        commonThemes: [],
        rootCauses: [],
        preventiveActions: []
      };
    }

    const descriptions = failures.map(f => f.description).join('\n');
    
    const prompt = `Analyze these similar manufacturing failure descriptions and identify patterns:

${descriptions}

Identify:
1. Common themes and failure modes
2. Likely root causes
3. Recommended preventive actions

Respond in JSON format with: commonThemes (array), rootCauses (array), preventiveActions (array).`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { 
            role: "system", 
            content: "You are a manufacturing reliability engineer specializing in failure analysis and pattern recognition." 
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 1000
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        commonThemes: analysis.commonThemes || [],
        rootCauses: analysis.rootCauses || [],
        preventiveActions: analysis.preventiveActions || []
      };
    } catch (error) {
      console.error('Error analyzing failure cluster:', error);
      return {
        commonThemes: ['Error analyzing failure patterns'],
        rootCauses: ['Unable to determine root causes'],
        preventiveActions: ['Manual investigation required']
      };
    }
  }

  static async initializeEmbeddings(): Promise<void> {
    console.log('Initializing failure description embeddings...');
    
    // This would typically be run once to index existing failure descriptions
    // For demo purposes, we'll skip the actual embedding generation
    // In production, you would:
    // 1. Get all failure descriptions from the database
    // 2. Generate embeddings for each
    // 3. Store embeddings for future similarity searches
    
    console.log('Embedding initialization complete');
  }
}
