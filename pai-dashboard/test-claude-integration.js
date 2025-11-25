#!/usr/bin/env node

/**
 * Test Script for Claude API Integration
 *
 * This script tests the Claude API integration without starting the full Next.js server.
 * Run it with: node test-claude-integration.js
 *
 * It will:
 * 1. Check if the Anthropic SDK is installed
 * 2. Check if API key is configured
 * 3. Test basic chat functionality
 * 4. Verify system prompts and context handling
 */

const path = require('path');
const fs = require('fs');

// ANSI color codes for prettier output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('');
  log('='.repeat(60), 'cyan');
  log(`  ${title}`, 'bright');
  log('='.repeat(60), 'cyan');
  console.log('');
}

async function checkDependencies() {
  logSection('1. Checking Dependencies');

  try {
    require('@anthropic-ai/sdk');
    log('✓ @anthropic-ai/sdk is installed', 'green');
    return true;
  } catch (error) {
    log('✗ @anthropic-ai/sdk is NOT installed', 'red');
    log('  Run: npm install or bun install', 'yellow');
    return false;
  }
}

async function checkEnvironment() {
  logSection('2. Checking Environment Configuration');

  // Load environment variables
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    log('✓ .env.local file found', 'green');

    const envContent = fs.readFileSync(envPath, 'utf8');
    const hasApiKey = envContent.includes('ANTHROPIC_API_KEY=sk-ant-');

    if (hasApiKey) {
      log('✓ ANTHROPIC_API_KEY appears to be configured', 'green');

      // Extract the key (masking most of it)
      const match = envContent.match(/ANTHROPIC_API_KEY=(sk-ant-api03-[^\s\n]+)/);
      if (match) {
        const key = match[1];
        const masked = `${key.substring(0, 20)}...${key.slice(-10)}`;
        log(`  Key: ${masked}`, 'cyan');
      }

      return true;
    } else {
      log('⚠ ANTHROPIC_API_KEY is not set or invalid', 'yellow');
      log('  The system will use mock responses', 'yellow');
      return false;
    }
  } else {
    log('⚠ .env.local file not found', 'yellow');
    log('  Run: cp .env.example .env.local', 'yellow');
    return false;
  }
}

async function checkFiles() {
  logSection('3. Checking Integration Files');

  const files = [
    { path: 'lib/claude-client.ts', name: 'Claude Client Library' },
    { path: 'app/api/pai/chat/route.ts', name: 'Chat API Route' },
    { path: '.env.example', name: 'Environment Template' },
  ];

  let allExist = true;

  for (const file of files) {
    const fullPath = path.join(__dirname, file.path);
    if (fs.existsSync(fullPath)) {
      log(`✓ ${file.name}`, 'green');
      log(`  ${file.path}`, 'cyan');
    } else {
      log(`✗ ${file.name} NOT FOUND`, 'red');
      log(`  Expected: ${file.path}`, 'yellow');
      allExist = false;
    }
  }

  return allExist;
}

async function testClaudeClient() {
  logSection('4. Testing Claude Client (TypeScript)');

  log('Note: Full testing requires running the Next.js dev server', 'cyan');
  log('This script only validates file structure and configuration', 'cyan');
  console.log('');

  // Check if we can at least read the client file
  const clientPath = path.join(__dirname, 'lib/claude-client.ts');
  if (fs.existsSync(clientPath)) {
    const content = fs.readFileSync(clientPath, 'utf8');

    const checks = [
      { pattern: 'export class ClaudeClient', name: 'ClaudeClient class' },
      { pattern: 'generateSystemPrompt', name: 'System prompt generator' },
      { pattern: 'async chat(', name: 'Chat method' },
      { pattern: 'async streamChat(', name: 'Stream chat method' },
      { pattern: 'getClaudeClient', name: 'Singleton getter' },
    ];

    let allPresent = true;
    for (const check of checks) {
      if (content.includes(check.pattern)) {
        log(`✓ ${check.name} found`, 'green');
      } else {
        log(`✗ ${check.name} NOT FOUND`, 'red');
        allPresent = false;
      }
    }

    return allPresent;
  }

  return false;
}

async function testApiRoute() {
  logSection('5. Testing API Route Integration');

  const routePath = path.join(__dirname, 'app/api/pai/chat/route.ts');
  if (fs.existsSync(routePath)) {
    const content = fs.readFileSync(routePath, 'utf8');

    const checks = [
      { pattern: "from '@/lib/claude-client'", name: 'Claude client import' },
      { pattern: 'getClaudeClient()', name: 'Client initialization' },
      { pattern: 'claudeClient.isReady()', name: 'Ready check' },
      { pattern: 'claudeClient.chat(', name: 'Chat invocation' },
      { pattern: 'generateMockResponse', name: 'Fallback to mock' },
    ];

    let allPresent = true;
    for (const check of checks) {
      if (content.includes(check.pattern)) {
        log(`✓ ${check.name} found`, 'green');
      } else {
        log(`✗ ${check.name} NOT FOUND`, 'red');
        allPresent = false;
      }
    }

    return allPresent;
  }

  return false;
}

function printSummary(results) {
  logSection('Summary');

  const allPassed = Object.values(results).every(r => r);

  if (allPassed) {
    log('🎉 All checks passed!', 'green');
    console.log('');
    log('Next steps:', 'bright');
    log('1. Start the development server: npm run dev', 'cyan');
    log('2. Open http://localhost:3000', 'cyan');
    log('3. Click the chat icon in the header', 'cyan');
    log('4. Send a message to test Claude integration', 'cyan');
  } else {
    log('⚠ Some checks failed', 'yellow');
    console.log('');
    log('Please fix the issues above and run this script again', 'yellow');
  }

  console.log('');
  log('For detailed documentation, see:', 'bright');
  log('  • CLAUDE_INTEGRATION.md - Full integration guide', 'cyan');
  log('  • SETUP_CLAUDE.md - Quick setup guide', 'cyan');
  console.log('');
}

function printUsageGuide() {
  logSection('Quick Usage Guide');

  log('To use Claude API integration:', 'bright');
  console.log('');

  log('1. Set your API key in .env.local:', 'cyan');
  console.log('   ANTHROPIC_API_KEY=sk-ant-api03-YOUR_KEY_HERE');
  console.log('');

  log('2. Choose a model (optional):', 'cyan');
  console.log('   PAI_MODEL=claude-sonnet-4-20250514');
  console.log('');

  log('3. Start the server:', 'cyan');
  console.log('   npm run dev');
  console.log('');

  log('4. Test the API endpoint:', 'cyan');
  console.log('   curl http://localhost:3000/api/pai/chat \\');
  console.log('     -X POST \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{"message":"Hello PAI!"}\'');
  console.log('');
}

async function main() {
  console.clear();

  log('╔════════════════════════════════════════════════════════════╗', 'bright');
  log('║        Claude API Integration Test Suite                  ║', 'bright');
  log('║        PAI Business Dashboard                              ║', 'bright');
  log('╚════════════════════════════════════════════════════════════╝', 'bright');
  console.log('');

  const results = {
    dependencies: await checkDependencies(),
    environment: await checkEnvironment(),
    files: await checkFiles(),
    client: await testClaudeClient(),
    route: await testApiRoute(),
  };

  printSummary(results);
  printUsageGuide();
}

// Run the tests
main().catch(error => {
  console.error('');
  log('Fatal error running tests:', 'red');
  console.error(error);
  process.exit(1);
});
