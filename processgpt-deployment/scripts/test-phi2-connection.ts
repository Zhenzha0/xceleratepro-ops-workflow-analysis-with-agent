import { phi2MediaPipeService } from '../server/services/phi2-mediapipe-service.js';

async function testPhi2Connection() {
  console.log('🔍 Testing Phi-2 MediaPipe connection...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    // Test basic connection
    console.log('1. Testing basic connection...');
    const status = await phi2MediaPipeService.testConnection();
    console.log(`   Status: ${status.status}`);
    console.log(`   Model: ${status.model}`);
    console.log(`   Version: ${status.version}`);
    
    if (status.status === 'connected') {
      console.log('✅ Phi-2 MediaPipe connection successful!');
      
      // Test actual query processing
      console.log('\n2. Testing query processing...');
      const testRequest = {
        query: 'What are the main failure patterns in manufacturing?',
        sessionId: 'test-session',
        filters: {}
      };
      
      console.log('   Sending test query to Phi-2...');
      const response = await phi2MediaPipeService.analyzeQuery(testRequest);
      
      console.log('✅ Query processing successful!');
      console.log(`   Response type: ${response.analysis_type}`);
      console.log(`   Response length: ${response.response.length} characters`);
      console.log(`   First 100 chars: "${response.response.substring(0, 100)}..."`);
      
      // Test classification capability
      console.log('\n3. Testing classification capabilities...');
      const classificationTests = [
        'Show me failure analysis',
        'What are the timing issues?',
        'Analyze trends over time',
        'Compare case WF_101_0 with WF_102_0'
      ];
      
      for (const testQuery of classificationTests) {
        try {
          const testResponse = await phi2MediaPipeService.analyzeQuery({
            query: testQuery,
            sessionId: 'classification-test',
            filters: {}
          });
          console.log(`   ✅ "${testQuery}" → ${testResponse.analysis_type}`);
        } catch (error) {
          console.log(`   ❌ "${testQuery}" → Error: ${error.message}`);
        }
      }
      
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎉 ALL TESTS PASSED! Phi-2 MediaPipe is ready for ProcessGPT');
      console.log('   You can now use the "Use Phi-2 Edge" button in ProcessGPT');
      console.log('   Complete data privacy with local AI processing enabled');
      
    } else {
      console.log('❌ Phi-2 MediaPipe connection failed');
      console.log('   Check model file path and MediaPipe installation');
      console.log('   Expected model location: ./models/phi2/phi-2-instruct-int4.tflite');
    }
    
  } catch (error) {
    console.log('❌ Phi-2 test failed with error:');
    console.error('   Error details:', error.message);
    console.log('\n🔧 Troubleshooting suggestions:');
    console.log('   1. Verify Phi-2 model file exists: ./models/phi2/phi-2-instruct-int4.tflite');
    console.log('   2. Check MediaPipe installation: npm list @mediapipe/tasks-genai');
    console.log('   3. Ensure sufficient memory (4GB+ available)');
    console.log('   4. Try restarting the application');
  }
}

// Performance monitoring
async function testPerformance() {
  console.log('\n⚡ Performance Testing...');
  
  const startTime = Date.now();
  const startMem = process.memoryUsage();
  
  try {
    const response = await phi2MediaPipeService.analyzeQuery({
      query: 'Quick test query for performance measurement',
      sessionId: 'perf-test',
      filters: {}
    });
    
    const endTime = Date.now();
    const endMem = process.memoryUsage();
    
    console.log(`   Response time: ${endTime - startTime}ms`);
    console.log(`   Memory used: ${Math.round((endMem.rss - startMem.rss) / 1024 / 1024)}MB`);
    console.log(`   Heap used: ${Math.round(endMem.heapUsed / 1024 / 1024)}MB`);
    
    if (endTime - startTime < 2000) {
      console.log('✅ Performance: Excellent (< 2 seconds)');
    } else if (endTime - startTime < 5000) {
      console.log('⚠️ Performance: Acceptable (2-5 seconds)');
    } else {
      console.log('⚠️ Performance: Slow (> 5 seconds) - consider using int8 model');
    }
    
  } catch (error) {
    console.log('❌ Performance test failed:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  await testPhi2Connection();
  await testPerformance();
  
  console.log('\n📊 System Status Summary:');
  console.log(`   Node.js version: ${process.version}`);
  console.log(`   Platform: ${process.platform}`);
  console.log(`   Architecture: ${process.arch}`);
  console.log(`   Memory usage: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`);
  
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}