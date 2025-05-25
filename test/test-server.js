#!/usr/bin/env node

/**
 * Simple test to verify MCP server starts correctly
 * Run this before configuring Claude Desktop
 */

import { spawn } from 'child_process';

console.log('🧪 Testing Godot MCP Server startup...\n');

const server = spawn('node', ['src/index.js'], {
  cwd: process.cwd(),
  stdio: ['pipe', 'pipe', 'inherit'], // inherit stderr so we see logs
});

let hasStarted = false;

// Send initialization request
const initRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'test-client',
      version: '1.0.0',
    },
  },
};

// Send tools/list request
const listToolsRequest = {
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/list',
  params: {},
};

server.stdout.on('data', (data) => {
  const response = data.toString().trim();
  if (response) {
    try {
      const parsed = JSON.parse(response);
      console.log('📨 Server Response:', JSON.stringify(parsed, null, 2));
      
      if (parsed.id === 1) {
        // Initialization successful, now list tools
        console.log('\n📤 Requesting available tools...');
        server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
      } else if (parsed.id === 2) {
        // Tools list received
        console.log('\n✅ MCP Server is working correctly!');
        console.log(`🛠️  Available tools: ${parsed.result?.tools?.length || 0}`);
        if (parsed.result?.tools) {
          parsed.result.tools.forEach(tool => {
            console.log(`   - ${tool.name}: ${tool.description}`);
          });
        }
        
        setTimeout(() => {
          server.kill();
          process.exit(0);
        }, 1000);
      }
    } catch (error) {
      console.log('📨 Raw response:', response);
    }
  }
});

server.on('error', (error) => {
  console.error('❌ Failed to start server:', error.message);
  process.exit(1);
});

server.on('close', (code) => {
  if (code !== 0) {
    console.error(`❌ Server exited with code ${code}`);
    process.exit(1);
  }
});

// Give server time to start, then send init request
setTimeout(() => {
  console.log('📤 Sending initialization request...');
  server.stdin.write(JSON.stringify(initRequest) + '\n');
}, 1000);

// Timeout after 10 seconds
setTimeout(() => {
  console.error('⏰ Test timed out');
  server.kill();
  process.exit(1);
}, 10000);
