// Test all 25 question types to verify function usage
const testQuestions = [
  // Failure Analysis (5 questions)
  "what causes the most failures",
  "which activity fails most often", 
  "what are the main failure causes",
  "analyze failure patterns",
  "what equipment has highest failure rates",
  
  // Temporal Patterns (5 questions)
  "which hour has highest concentration of failures",
  "show daily failure distribution",
  "when do most delays occur",
  "analyze time-based patterns",
  "what are peak failure times",
  
  // Anomaly Detection (5 questions)
  "which cases have anomalies",
  "detect unusual process behavior", 
  "find outlier activities",
  "identify abnormal patterns",
  "show anomaly alerts",
  
  // Bottleneck Analysis (5 questions)
  "what are the main bottlenecks",
  "which activities take longest",
  "find processing delays",
  "analyze wait times",
  "identify capacity constraints",
  
  // Case Analysis (5 questions)
  "compare case WF_001 vs WF_002",
  "analyze case performance",
  "show case differences", 
  "which cases are most efficient",
  "find similar cases"
];

async function testAllFunctions() {
  console.log(`Testing ${testQuestions.length} question types for function usage...`);
  
  for (let i = 0; i < testQuestions.length; i++) {
    const query = testQuestions[i];
    console.log(`\n${i+1}. Testing: "${query}"`);
    
    try {
      const response = await fetch('http://localhost:5000/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query,
          sessionId: `test_${i}`,
          filters: {}
        })
      });
      
      const data = await response.json();
      
      // Check if real data is returned (not just OpenAI text)
      const hasRealData = data.data && (
        data.data.failure_categories?.length > 0 ||
        data.data.temporal_analysis?.total_failures > 0 ||
        data.data.activities_with_most_failures?.length > 0 ||
        data.data.anomalies?.length > 0
      );
      
      console.log(`   Result: ${hasRealData ? 'USING FUNCTIONS ✓' : 'OpenAI only ✗'}`);
      if (data.queryType) console.log(`   Type: ${data.queryType}`);
      
    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }
    
    // Small delay to avoid overwhelming server
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

testAllFunctions();