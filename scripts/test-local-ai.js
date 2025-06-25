// Test script to verify local AI integration
const { LocalAIService } = require('../server/services/local-ai-service');

async function testLocalAI() {
  console.log('Testing Local AI Integration...\n');
  
  const localAI = new LocalAIService();
  
  // Test query
  const testRequest = {
    query: "What causes the most failures in manufacturing?",
    sessionId: "test-session",
    filters: {}
  };
  
  try {
    console.log('Sending test query:', testRequest.query);
    const response = await localAI.analyzeQuery(testRequest);
    
    console.log('\n✅ Response received:');
    console.log('Analysis Type:', response.analysis_type);
    console.log('Response Length:', response.response.length, 'characters');
    console.log('Has Visualization Data:', !!response.data);
    console.log('Suggested Actions:', response.suggestedActions?.length || 0);
    
    if (response.data?.analysis_type) {
      console.log('Structured Data Type:', response.data.analysis_type);
    }
    
    console.log('\n🎉 Local AI integration is working correctly!');
    
  } catch (error) {
    console.error('\n❌ Local AI test failed:');
    console.error('Error:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Solution: Make sure Ollama is running:');
      console.log('   1. ollama serve');
      console.log('   2. ollama pull gemma2:9b');
    }
  }
}

// Run the test
testLocalAI();