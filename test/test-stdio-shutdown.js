#!/usr/bin/env node

/**
 * Test script specifically for STDIO-based shutdown detection
 * Simulates how Claude Desktop actually manages MCP servers
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Testing STDIO-Based Shutdown Detection\n');

// This simulates Claude Desktop behavior more accurately
console.log('1. Starting MCP server with STDIO transport...');
const serverPath = join(__dirname, 'src', 'index.js');
const serverProcess = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe'], // stdin, stdout, stderr
  env: { ...process.env, NODE_ENV: 'test' }
});

let serverReady = false;
let shutdownDetected = false;

// Monitor server output
serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(`[SERVER STDOUT] ${output.trim()}`);
});

serverProcess.stderr.on('data', (data) => {
  const output = data.toString();
  console.log(`[SERVER STDERR] ${output.trim()}`);
  
  if (output.includes('Godot 4 MCP Server started successfully')) {
    serverReady = true;
    console.log('✅ Server is ready\n');
    
    // Wait a moment then test shutdown by closing stdin
    setTimeout(testStdinShutdown, 2000);
  }
  
  if (output.includes('stdin closed') || output.includes('parent process') || output.includes('Graceful shutdown completed')) {
    shutdownDetected = true;
    console.log('✅ Shutdown detection working correctly!');
  }
});

serverProcess.on('close', (code, signal) => {
  console.log(`\n[SERVER] Process exited with code ${code}, signal ${signal}`);
  
  if (shutdownDetected && (code === 0 || signal === 'SIGTERM')) {
    console.log('🎉 STDIO shutdown detection test passed!');
    console.log('✅ Server properly detected parent termination');
  } else {
    console.log('❌ Test failed - shutdown not detected properly');
  }
  
  process.exit(code === 0 ? 0 : 1);
});

function testStdinShutdown() {
  if (!serverReady) {
    console.log('❌ Server not ready for shutdown test');
    return;
  }
  
  console.log('2. Testing STDIO shutdown detection...');
  console.log('   Closing server stdin (simulates Claude Desktop quit)');
  console.log('   Server should detect stdin closure and shutdown gracefully\n');
  
  // Close stdin - this is what Claude Desktop does when it quits
  serverProcess.stdin.end();
  
  // Set a timeout in case shutdown detection fails
  setTimeout(() => {
    if (!shutdownDetected) {
      console.log('❌ Shutdown detection timeout - server didn\'t detect stdin closure');
      serverProcess.kill('SIGKILL');
      process.exit(1);
    }
  }, 8000); // 8 second timeout
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
