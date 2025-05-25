#!/usr/bin/env node

/**
 * Godot 4 MCP Server
 * 
 * MCP server that provides Claude Desktop with tools to interact with Godot 4
 * through a WebSocket connection to an EditorPlugin.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { WebSocketManager } from './websocket-manager.js';
import { GodotToolRegistry } from './godot-tools.js';

class Godot4MCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'godot4-mcp-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.wsManager = new WebSocketManager();
    this.toolRegistry = new GodotToolRegistry(this.wsManager);
    
    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.toolRegistry.getToolDefinitions(),
      };
    });

    // Execute tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        const result = await this.toolRegistry.executeTool(name, args);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing tool ${name}: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Server Error]:', error);
    };

    process.on('SIGINT', async () => {
      await this.cleanup();
      process.exit(0);
    });
  }

  async start() {
    // Start WebSocket server for Godot communication
    await this.wsManager.start();
    
    // Start MCP server with stdio transport
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error('Godot 4 MCP Server started successfully');
  }

  async cleanup() {
    console.error('Cleaning up MCP server...');
    await this.wsManager.stop();
    await this.server.close();
  }
}

// Start the server
const server = new Godot4MCPServer();
server.start().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
