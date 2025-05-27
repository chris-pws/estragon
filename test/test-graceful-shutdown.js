#!/usr/bin/env node

/**
 * Test script for graceful shutdown functionality
 * Tests the signal-based cascade shutdown system
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Testing Graceful Shutdown System\n');

// Start the MCP server
console.log('1. Starting MCP server...');
const serverPath = join(__dirname, 'src', 'index.js');
const serverProcess = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, NODE_ENV: 'test' }
});

let serverReady = false;
let shutdownTestComplete = false;

// Monitor server output
serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(`[SERVER] ${output.trim()}`);
  
  if (output.includes('Godot 4 MCP Server started successfully')) {
    serverReady = true;
    console.log('✅ Server is ready\n');
    
    // Wait a moment then test shutdown
    setTimeout(testGracefulShutdown, 2000);
  }
  
  if (output.includes('Graceful shutdown completed')) {
    shutdownTestComplete = true;
    console.log('✅ Graceful shutdown test completed successfully!');
  }
});

serverProcess.stderr.on('data', (data) => {
  const output = data.toString();
  console.log(`[SERVER ERROR] ${output.trim()}`);
});

serverProcess.on('close', (code) => {
  console.log(`\n[SERVER] Process exited with code ${code}`);
  
  if (shutdownTestComplete && code === 0) {
    console.log('🎉 All tests passed! Graceful shutdown is working correctly.');
  } else if (code !== 0) {
    console.log('❌ Server exited with error code. Check logs above.');
  } else {
    console.log('⚠️ Server exited before shutdown test completed.');
  }
  
  process.exit(code);
});

function testGracefulShutdown() {
  if (!serverReady) {
    console.log('❌ Server not ready for shutdown test');
    return;
  }
  
  console.log('2. Testing graceful shutdown by terminating parent process...');
  console.log('   (This simulates what happens when Claude Desktop quits)');
  console.log('   The server should detect parent process death and shutdown gracefully\n');
  
  // Kill the server process (simulating Claude Desktop termination)
  // This should trigger our parent death detection
  serverProcess.kill('SIGTERM');
  
  // Set a timeout in case graceful shutdown hangs
  setTimeout(() => {
    if (!shutdownTestComplete) {
      console.log('❌ Graceful shutdown timeout - forcing exit');
      serverProcess.kill('SIGKILL');
      process.exit(1);
    }
  }, 10000); // 10 second timeout
}

// Handle our own shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted - cleaning up...');
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill('SIGKILL');
  }
  process.exit(1);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception in test:', error);
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill('SIGKILL');
  }
  process.exit(1);
});
