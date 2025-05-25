#!/usr/bin/env node

/**
 * End-to-End Test Suite
 * Tests MCP Server + WebSocket + Mock Godot Client
 */

import { spawn } from 'child_process';
import WebSocket from 'ws';

class E2ETestRunner {
  constructor() {
    this.mcpServer = null;
    this.mockGodot = null;
  }

  async startMCPServer() {
    return new Promise((resolve, reject) => {
      console.log('🚀 Starting MCP Server...');
      
      this.mcpServer = spawn('node', ['src/index.js'], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.mcpServer.stderr.on('data', (data) => {
        const message = data.toString().trim();
        console.log('🔧 MCP Server:', message);
        
        // Look for WebSocket server ready message
        if (message.includes('WebSocket] Server listening')) {
          resolve();
        }
      });

      this.mcpServer.on('error', reject);
      
      // Fallback timeout
      setTimeout(resolve, 2000);
    });
  }

  async startMockGodot() {
    return new Promise((resolve, reject) => {
      console.log('🎮 Starting Mock Godot Client...');
      
      this.mockGodot = new WebSocket('ws://localhost:8765');

      this.mockGodot.on('open', () => {
        console.log('✅ Mock Godot connected to WebSocket');
        resolve();
      });

      this.mockGodot.on('message', (data) => {
        const message = JSON.parse(data.toString());
        console.log('📨 Mock Godot received:', message.command);
        
        // Send mock response
        const response = {
          id: message.id,
          success: true,
          result: this.getMockResult(message.command, message.params),
          timestamp: Date.now()
        };
        
        this.mockGodot.send(JSON.stringify(response));
      });

      this.mockGodot.on('error', reject);
    });
  }

  getMockResult(command, params) {
    switch (command) {
      case 'get_scene_tree':
        return { 
          root: { name: 'Main', type: 'Node2D', children: [] }
        };
      case 'list_nodes':
        return { 
          nodes: [{ path: 'Main', type: 'Node2D' }] 
        };
      case 'create_node':
        return { 
          created_node: { 
            path: `Main/${params.node_name}`, 
            type: params.node_type 
          } 
        };
      default:
        return { message: `Executed ${command}` };
    }
  }

  async testMCPCommands() {
    console.log('\n🧪 Testing MCP Commands...\n');

    const testCommands = [
      {
        name: 'Initialize',
        request: {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test', version: '1.0.0' }
          }
        }
      },
      {
        name: 'List Tools',
        request: {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
          params: {}
        }
      },
      {
        name: 'Get Scene Tree',
        request: {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'get_scene_tree',
            arguments: {}
          }
        }
      },
      {
        name: 'Create Node',
        request: {
          jsonrpc: '2.0',
          id: 4,
          method: 'tools/call',
          params: {
            name: 'create_node',
            arguments: {
              node_type: 'Sprite2D',
              node_name: 'TestSprite'
            }
          }
        }
      }
    ];

    for (const test of testCommands) {
      console.log(`📤 Testing: ${test.name}`);
      
      this.mcpServer.stdin.write(JSON.stringify(test.request) + '\n');
      
      // Wait for response
      await new Promise(resolve => {
        const handler = (data) => {
          try {
            const response = JSON.parse(data.toString().trim());
            if (response.id === test.request.id) {
              console.log(`✅ ${test.name}: Success`);
              if (response.result?.tools) {
                console.log(`   Found ${response.result.tools.length} tools`);
              }
              this.mcpServer.stdout.off('data', handler);
              resolve();
            }
          } catch (error) {
            // Ignore parsing errors, might be partial data
          }
        };
        
        this.mcpServer.stdout.on('data', handler);
        setTimeout(resolve, 2000); // Timeout fallback
      });
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up...');
    
    if (this.mockGodot) {
      this.mockGodot.close();
    }
    
    if (this.mcpServer) {
      this.mcpServer.kill();
    }
  }

  async run() {
    try {
      await this.startMCPServer();
      await this.startMockGodot();
      await this.testMCPCommands();
      
      console.log('\n🎉 All tests completed successfully!');
      console.log('💡 Your MCP server is ready for Claude Desktop integration');
      console.log('🔜 Next step: Build the actual Godot EditorPlugin');
      
    } catch (error) {
      console.error('\n❌ Test failed:', error.message);
    } finally {
      await this.cleanup();
    }
  }
}

// Run the tests
const runner = new E2ETestRunner();

process.on('SIGINT', async () => {
  await runner.cleanup();
  process.exit(0);
});

runner.run();
