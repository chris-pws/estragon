#!/usr/bin/env node

/**
 * Quick test to verify the server can start without errors
 */

import { WebSocketManager } from './src/websocket-manager.js';
import { GodotToolRegistry } from './src/godot-tools.js';

console.log('🧪 Testing server components...');

try {
  // Test WebSocket Manager
  console.log('1. Creating WebSocket Manager...');
  const wsManager = new WebSocketManager();
  console.log('✅ WebSocket Manager created successfully');
  
  // Test the isConnected method
  console.log('2. Testing isConnected method...');
  const connected = wsManager.isConnected();
  console.log(`✅ isConnected() returned: ${connected} (type: ${typeof connected})`);
  
  // Test Tool Registry
  console.log('3. Creating Tool Registry...');
  const toolRegistry = new GodotToolRegistry(wsManager);
  console.log('✅ Tool Registry created successfully');
  
  // Test tool definitions
  console.log('4. Testing tool definitions...');
  const tools = toolRegistry.getToolDefinitions();
  console.log(`✅ Found ${tools.length} tools`);
  
  console.log('\n🎉 All components working correctly!');
  console.log('🔄 You can now restart the main server with: node src/index.js');
  
} catch (error) {
  console.error('❌ Error testing components:');
  console.error(error);
  process.exit(1);
}
