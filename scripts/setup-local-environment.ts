import fs from 'fs';
import path from 'path';

async function setupLocalEnvironment() {
  console.log('Setting up ProcessGPT local environment...');
  
  // Check for required files
  const requiredFiles = [
    'package.json',
    'server/index.ts', 
    'client/src/App.tsx',
    'shared/schema.ts'
  ];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      console.error(`ERROR: Missing required file: ${file}`);
      console.error('Make sure you downloaded the complete ProcessGPT project from Replit');
      process.exit(1);
    }
  }
  
  // Check for sample data
  if (!fs.existsSync('sample_data.csv')) {
    console.warn('WARNING: sample_data.csv not found');
    console.warn('Copy your manufacturing data file to the root directory');
  }
  
  // Create .env if it doesn't exist
  if (!fs.existsSync('.env')) {
    const envContent = `# ProcessGPT Local Configuration
NODE_ENV=development

# Database Configuration
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/processgpt
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=yourpassword
PGDATABASE=processgpt

# AI Configuration
USE_LOCAL_AI=true
GEMMA2_URL=http://localhost:8080

# Optional: OpenAI fallback
# OPENAI_API_KEY=your_openai_key_here
`;
    
    fs.writeFileSync('.env', envContent);
    console.log('✓ Created .env file - please edit with your PostgreSQL credentials');
  }
  
  // Test Gemma 2B connection
  try {
    const response = await fetch('http://localhost:8080/health', { 
      signal: AbortSignal.timeout(3000) 
    });
    console.log('✓ Gemma 2B server is running on localhost:8080');
  } catch (error) {
    console.warn('⚠ WARNING: Gemma 2B server not responding on localhost:8080');
    console.warn('Make sure your Gemma 2B server is running');
  }
  
  console.log('\n✓ Local environment setup complete!');
  console.log('\nNext steps:');
  console.log('1. Edit .env with your PostgreSQL password');
  console.log('2. Run: npm run db:push');
  console.log('3. Run: npm run import-data'); 
  console.log('4. Run: npm run dev');
  console.log('5. Open: http://localhost:5173');
}

if (require.main === module) {
  setupLocalEnvironment().catch(console.error);
}