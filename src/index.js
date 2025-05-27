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
    this.shutdownInProgress = false;
    this.parentMonitorInterval = null;
    
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
    
    // Setup graceful shutdown detection
    this.setupShutdownDetection();
  }
  
  setupShutdownDetection() {
    // Method 1: Detect when stdin closes (Claude Desktop closes our stdin)
    process.stdin.on('end', () => {
      console.error('[MCP Server] stdin closed - parent process (Claude Desktop) likely terminated');
      this.gracefulShutdown();
    });
    
    process.stdin.on('close', () => {
      console.error('[MCP Server] stdin closed - initiating shutdown');
      this.gracefulShutdown();
    });
    
    // Method 2: Monitor parent process (Claude Desktop) 
    this.startParentMonitoring();
    
    // Method 3: Traditional signal handlers (backup)
    process.on('SIGINT', this.gracefulShutdown.bind(this));
    process.on('SIGTERM', this.gracefulShutdown.bind(this));
    process.on('SIGHUP', this.gracefulShutdown.bind(this));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('[MCP Server] Uncaught Exception:', error);
      this.gracefulShutdown();
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('[MCP Server] Unhandled Rejection at:', promise, 'reason:', reason);
      this.gracefulShutdown();
    });
  }
  
  startParentMonitoring() {
    // Get parent process ID (Claude Desktop)
    const parentPid = process.ppid;
    console.error(`[MCP Server] Monitoring parent process (Claude Desktop) PID: ${parentPid}`);
    
    // Check if parent is still alive every 5 seconds
    this.parentMonitorInterval = setInterval(() => {
      try {
        // Try to send signal 0 to parent (doesn't actually send signal, just checks if process exists)
        process.kill(parentPid, 0);
      } catch (error) {
        if (error.code === 'ESRCH') {
          console.error('[MCP Server] Parent process (Claude Desktop) no longer exists - shutting down');
          clearInterval(this.parentMonitorInterval);
          this.gracefulShutdown();
        }
      }
    }, 5000); // Check every 5 seconds
  }

  async start() {
    // Start WebSocket server for Godot communication
    await this.wsManager.start();
    
    // Start MCP server with stdio transport
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error('Godot 4 MCP Server started successfully');
  }

  async gracefulShutdown() {
    // Prevent multiple shutdowns
    if (this.shutdownInProgress) {
      return;
    }
    this.shutdownInProgress = true;
    
    console.error('\n[MCP Server] Initiating graceful shutdown...');
    
    try {
      // Clear parent monitoring if active
      if (this.parentMonitorInterval) {
        clearInterval(this.parentMonitorInterval);
        this.parentMonitorInterval = null;
      }
      
      // Step 1: Notify all connected clients about shutdown
      console.error('[MCP Server] Broadcasting shutdown to connected clients...');
      await this.wsManager.broadcastShutdown();
      
      // Step 2: Wait a moment for clients to acknowledge
      console.error('[MCP Server] Waiting for client acknowledgments...');
      await this.waitForShutdownAcks(3000); // 3 second timeout
      
      // Step 3: Close WebSocket server
      console.error('[MCP Server] Closing WebSocket server...');
      await this.wsManager.stop();
      
      // Step 4: Close MCP server
      console.error('[MCP Server] Closing MCP server...');
      await this.server.close();
      
      console.error('[MCP Server] Graceful shutdown completed');
      process.exit(0);
      
    } catch (error) {
      console.error('[MCP Server] Error during graceful shutdown:', error);
      // Force exit if graceful shutdown fails
      process.exit(1);
    }
  }
  
  async waitForShutdownAcks(timeout = 3000) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        console.error('[MCP Server] Shutdown acknowledgment timeout reached');
        resolve();
      }, timeout);
      
      // Listen for shutdown acknowledgments from WebSocket manager
      this.wsManager.once('allClientsDisconnected', () => {
        clearTimeout(timer);
        console.error('[MCP Server] All clients disconnected gracefully');
        resolve();
      });
      
      // If no clients are connected, resolve immediately
      if (!this.wsManager.hasConnectedClients()) {
        clearTimeout(timer);
        resolve();
      }
    });
  }

  async cleanup() {
    // Legacy cleanup method - redirect to graceful shutdown
    await this.gracefulShutdown();
  }
}

// Start the server
const server = new Godot4MCPServer();
server.start().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
