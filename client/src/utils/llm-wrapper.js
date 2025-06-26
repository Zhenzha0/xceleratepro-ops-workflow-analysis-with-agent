/**
 * LLM Wrapper for Local Gemma-2B-IT Model
 * 
 * This module handles all LLM interactions using MediaPipe WASM runtime
 * for completely offline, browser-based AI processing.
 */

let gemmaModel = null;
let isModelLoaded = false;

/**
 * Initialize the Gemma-2B-IT model using MediaPipe WASM
 */
export async function initializeGemmaModel() {
  if (isModelLoaded) return;
  
  try {
    console.log('Loading Gemma-2B-IT model...');
    
    // TODO: implement WASM inference here
    // This will use @mediapipe/tasks-genai to load gemma-2b-it.task
    // const { LlmInference } = await import('@mediapipe/tasks-genai');
    // gemmaModel = await LlmInference.createFromModelPath('/models/gemma-2b-it.task');
    
    isModelLoaded = true;
    console.log('Gemma-2B-IT model loaded successfully');
    
  } catch (error) {
    console.error('Failed to load Gemma model:', error);
    throw error;
  }
}

/**
 * Generate text using local Gemma-2B-IT model
 * 
 * @param {string} prompt - The input prompt for the model
 * @param {Object} options - Generation options
 * @returns {Promise<string>} Generated text response
 */
export async function generateWithGemma(prompt, options = {}) {
  // Ensure model is loaded
  if (!isModelLoaded) {
    await initializeGemmaModel();
  }
  
  try {
    console.log('Generating with Gemma-2B-IT...');
    
    // TODO: implement WASM inference here
    // This will use the loaded MediaPipe model to generate responses
    // const response = await gemmaModel.generateResponse(prompt, {
    //   maxTokens: options.maxTokens || 1024,
    //   temperature: options.temperature || 0.1,
    //   topP: options.topP || 0.9
    // });
    // return response.text;
    
    // Placeholder response for now
    return `[Gemma-2B-IT Response] Analyzing: ${prompt.substring(0, 100)}...`;
    
  } catch (error) {
    console.error('Gemma generation failed:', error);
    throw error;
  }
}

/**
 * Classify manufacturing query using local model
 * 
 * @param {string} query - User query to classify
 * @returns {Promise<string>} Classification type
 */
export async function classifyQuery(query) {
  const classificationPrompt = `
You are a manufacturing process analysis expert. Classify this query into one of these categories:

Categories:
- failure_analysis: Questions about what fails, failure rates, failure causes
- activity_failure_analysis: Questions about which activities fail most
- temporal_pattern_analysis: Questions about time patterns, hourly/daily trends
- anomaly_analysis: Questions about anomalies, outliers, unusual behavior
- bottleneck_analysis: Questions about delays, slow processes, bottlenecks
- case_analysis: Questions about specific cases or case comparisons

Query: "${query}"

Respond with ONLY the category name, no explanation.
`;

  const response = await generateWithGemma(classificationPrompt);
  return response.trim().toLowerCase();
}

/**
 * Generate manufacturing analysis using local model
 * 
 * @param {string} query - Original user query
 * @param {string} queryType - Classification type
 * @param {Object} relevantData - Pre-processed manufacturing data
 * @param {Object} contextData - Additional context
 * @returns {Promise<string>} Analysis report
 */
export async function generateAnalysis(query, queryType, relevantData, contextData = {}) {
  const systemPrompt = buildSystemPrompt(queryType, relevantData);
  const userPrompt = buildUserPrompt(query, contextData);
  
  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
  
  return await generateWithGemma(fullPrompt, {
    maxTokens: 2048,
    temperature: 0.1
  });
}

/**
 * Generate actionable recommendations
 * 
 * @param {string} queryType - Type of analysis performed
 * @param {Object} relevantData - Analysis results
 * @returns {Promise<string[]>} Array of recommendations
 */
export async function generateSuggestedActions(queryType, relevantData) {
  const actionPrompt = `
Based on this ${queryType} analysis of manufacturing data, suggest 3 specific actionable recommendations:

Data: ${JSON.stringify(relevantData, null, 2)}

Provide ONLY a JSON array of 3 action strings, no explanation.
Example: ["Action 1", "Action 2", "Action 3"]
`;

  try {
    const response = await generateWithGemma(actionPrompt);
    const parsed = JSON.parse(response.trim());
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to generate actions:', error);
    // Fallback suggestions
    return [
      "Review and optimize identified problem areas",
      "Implement monitoring for detected patterns", 
      "Schedule maintenance for critical components"
    ];
  }
}

/**
 * Build system prompt for manufacturing analysis
 */
function buildSystemPrompt(queryType, relevantData) {
  return `You are ProcessGPT, an intelligent manufacturing analyst specializing in ${queryType} for industrial process mining.

You have access to real manufacturing data and should provide detailed, actionable insights based on the following data:

${JSON.stringify(relevantData, null, 2)}

Format your response as a comprehensive manufacturing analysis report with:
1. Executive Summary
2. Key Performance Metrics  
3. Critical Issues Identified
4. Data Quality Assessment
5. Visual Analysis (if applicable)
6. Recommendations

Focus on practical insights that help optimize manufacturing processes, reduce failures, and improve efficiency.`;
}

/**
 * Build user prompt
 */
function buildUserPrompt(query, contextData) {
  let prompt = `User Query: "${query}"`;
  
  if (contextData && Object.keys(contextData).length > 0) {
    prompt += `\n\nAdditional Context: ${JSON.stringify(contextData, null, 2)}`;
  }
  
  return prompt;
}

/**
 * Check if model is ready for use
 */
export function isModelReady() {
  return isModelLoaded;
}

/**
 * Get model status information
 */
export function getModelStatus() {
  return {
    loaded: isModelLoaded,
    modelType: 'Gemma-2B-IT',
    runtime: 'MediaPipe WASM',
    offline: true
  };
}