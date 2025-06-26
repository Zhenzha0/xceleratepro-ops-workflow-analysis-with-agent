#!/usr/bin/env node

/**
 * Create Clean Deployment Package for ProcessGPT Local Deployment
 * This script identifies and lists only the essential files needed for local deployment
 */

import fs from 'fs';
import path from 'path';

const ESSENTIAL_FILES = {
  // Root configuration files
  root: [
    'package.json',
    'tsconfig.json', 
    'vite.config.ts',
    'tailwind.config.ts',
    'drizzle.config.ts',
    '.env.example',
    'sample_data.csv',
    'README.md',
    'components.json',
    'postcss.config.js'
  ],

  // Complete folders (copy entirely)
  folders: [
    'client',
    'shared'
  ],

  // Server files (selective)
  serverCore: [
    'server/index.ts',
    'server/db.ts', 
    'server/routes.ts',
    'server/storage.ts',
    'server/vite.ts'
  ],

  // Essential AI services only
  serverServices: [
    'server/services/ai-service-factory.ts',
    'server/services/intelligent-analyst.ts',
    'server/services/ai-analyst.ts',
    'server/services/failure-analyzer.ts',
    'server/services/anomaly-detector.ts',
    'server/services/timing-analyzer.ts',
    'server/services/trend-analyzer.ts', 
    'server/services/case-analyzer.ts',
    'server/services/semantic-search.ts',
    'server/services/xes-parser.ts',
    // Optional local AI
    'server/services/gemma2-service.ts',
    'server/services/gemini-service.ts'
  ],

  // Documentation
  docs: [
    'LOCAL_DEPLOYMENT_FILES.md',
    'QUICK_DEPLOYMENT_GUIDE.md',
    'GIT_WORKFLOW_GUIDE.md'
  ]
};

// Files to EXCLUDE (experimental/unused)
const EXCLUDE_FILES = [
  'android-bridge-server.js',
  'server/services/android-direct-ai-service.ts',
  'server/services/android-emulator-ai-service.ts', 
  'server/services/emulator-bridge-service.ts',
  'server/services/mediapipe-ai-service.ts',
  'server/services/gemma-mediapipe-service.ts',
  'server/services/phi2-direct-service.ts',
  'server/services/phi2-mediapipe-service.ts',
  'server/services/true-local-ai-service.ts',
  'server/services/tinyllama-service.ts',
  'server/services/google-ai-edge-service.ts',
  'server/services/failure-analyzer-enhanced.ts',
  'server/services/xes-parser-backup.ts'
];

function createDeploymentList() {
  const deploymentFiles = [];
  
  // Add root files
  ESSENTIAL_FILES.root.forEach(file => {
    if (fs.existsSync(file)) {
      deploymentFiles.push(file);
    }
  });

  // Add complete folders
  ESSENTIAL_FILES.folders.forEach(folder => {
    if (fs.existsSync(folder)) {
      deploymentFiles.push(`${folder}/ (complete folder)`);
    }
  });

  // Add server core files
  ESSENTIAL_FILES.serverCore.forEach(file => {
    if (fs.existsSync(file)) {
      deploymentFiles.push(file);
    }
  });

  // Add essential services
  ESSENTIAL_FILES.serverServices.forEach(file => {
    if (fs.existsSync(file)) {
      deploymentFiles.push(file);
    }
  });

  // Add documentation
  ESSENTIAL_FILES.docs.forEach(file => {
    if (fs.existsSync(file)) {
      deploymentFiles.push(file);
    }
  });

  return deploymentFiles;
}

console.log('=== ProcessGPT Clean Deployment Package ===\n');

const essentialFiles = createDeploymentList();

console.log('ESSENTIAL FILES FOR LOCAL DEPLOYMENT:');
console.log('=====================================');
essentialFiles.forEach(file => {
  console.log(`✓ ${file}`);
});

console.log('\nFILES TO EXCLUDE (experimental/unused):');
console.log('=======================================');
EXCLUDE_FILES.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✗ ${file}`);
  }
});

console.log('\n=== DEPLOYMENT SUMMARY ===');
console.log(`Essential files: ${essentialFiles.length}`);
console.log(`Excluded files: ${EXCLUDE_FILES.filter(f => fs.existsSync(f)).length}`);
console.log('\nThis clean package provides:');
console.log('• Complete ProcessGPT manufacturing analytics');
console.log('• All 25+ ProcessGPT analysis capabilities');
console.log('• Your authentic manufacturing dataset (9,471 events)');
console.log('• AI service flexibility (OpenAI, Gemini, or local Gemma-2B)');
console.log('• Clean, maintainable codebase');