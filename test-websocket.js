#!/usr/bin/env node

/**
 * WebSocket Test Client
 * Simulates a Godot client connecting to our WebSocket server
 */

import WebSocket from 'ws';

class MockGodotClient {
  constructor(url = 'ws://localhost:8765') {
    this.url = url;
    this.ws = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      console.log('🔗 Connecting to WebSocket server...');
      
      this.ws = new WebSocket(this.url);

      this.ws.on('open', () => {
        console.log('✅ Connected to WebSocket server');
        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log('📨 Received command:', message);
          this.handleCommand(message);
        } catch (error) {
          console.error('❌ Failed to parse message:', error);
        }
      });

      this.ws.on('close', () => {
        console.log('🔌 Disconnected from WebSocket server');
      });

      this.ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        reject(error);
      });
    });
  }

  handleCommand(message) {
    const { id, command, params } = message;
    
    // Simulate Godot processing the command
    console.log(`🎮 Processing Godot command: ${command}`);
    
    let result;
    let success = true;
    
    switch (command) {
      case 'get_scene_tree':
        result = {
          root: {
            name: 'Main',
            type: 'Node2D',
            children: [
              { name: 'Player', type: 'CharacterBody2D' },
              { name: 'Background', type: 'Sprite2D' }
            ]
          }
        };
        break;
        
      case 'list_nodes':
        result = {
          nodes: [
            { path: 'Main', type: 'Node2D' },
            { path: 'Main/Player', type: 'CharacterBody2D' },
            { path: 'Main/Background', type: 'Sprite2D' }
          ]
        };
        break;
        
      case 'create_node':
        result = {
          created_node: {
            path: `${params.parent_path || 'Main'}/${params.node_name}`,
            type: params.node_type,
            name: params.node_name
          }
        };
        break;
        
      default:
        success = false;
        result = `Unknown command: ${command}`;
    }

    // Send response back
    const response = {
      id,
      success,
      result: success ? result : undefined,
      error: success ? undefined : result,
      timestamp: Date.now()
    };

    console.log('📤 Sending response:', response);
    this.ws.send(JSON.stringify(response));
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Test the WebSocket connection
async function runTest() {
  console.log('🧪 Testing WebSocket Communication\n');
  
  const client = new MockGodotClient();
  
  try {
    await client.connect();
    
    console.log('\n🎯 WebSocket connection successful!');
    console.log('📝 Mock Godot client is now listening for commands');
    console.log('💡 You can now test tools in Claude Desktop - they should work!');
    console.log('\n⏳ Keeping connection open... Press Ctrl+C to exit\n');
    
    // Keep the connection alive
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down mock client...');
      client.disconnect();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('\n💡 Make sure the MCP server is running first!');
    process.exit(1);
  }
}

runTest();
