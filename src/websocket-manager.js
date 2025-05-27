/**
 * Multi-Client WebSocket Manager for Godot Communication
 * 
 * Handles multiple WebSocket connections to prevent server shutdown
 * when individual clients disconnect
 */

import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { ConnectionError, TimeoutError, ValidationError, ToolExecutionError, logError } from './errors.js';
import { setTimeout as setTimeoutPromise } from 'timers/promises';

const DEFAULT_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 3;
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const HEARTBEAT_TIMEOUT = 5000; // 5 seconds

export class WebSocketManager extends EventEmitter {
  constructor(port = 8765) {
    super();
    this.port = port;
    this.wss = null;
    this.clients = new Map(); // Map of clientId -> { ws, type, heartbeatSent, ready }
    this.pendingRequests = new Map();
    this.shutdownInProgress = false;
    this.heartbeatInterval = null;
  }

  async start() {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocketServer({ port: this.port });
        
        this.wss.on('connection', async (ws, req) => {
          const clientId = uuidv4();
          const clientType = this.identifyClientType(req);
          
          logError(new ConnectionError(`New client connected: ${clientId} (${clientType})`), 'info');

          // Store client information
          this.clients.set(clientId, {
            ws,
            type: clientType,
            heartbeatSent: null, // Track when we send ping, null when pong received
            ready: false
          });

          // Set up client handlers
          ws.on('message', async (data) => {
            try {
              const message = JSON.parse(data.toString());
              await this.handleClientMessage(clientId, message);
            } catch (error) {
              logError(error, 'error');
            }
          });

          ws.on('close', async () => {
            logError(new ConnectionError(`Client disconnected: ${clientId} (${clientType})`), 'warn');
            this.clients.delete(clientId);
            
            // Only emit disconnection event for Godot clients
            if (clientType === 'godot') {
              this.emit('godotClientDisconnected', clientId);
            }
          });

          ws.on('error', (error) => {
            logError(new ConnectionError(`Client error: ${clientId}`, { error }), 'error');
          });

          // Send initial handshake
          this.sendToClient(clientId, {
            type: 'handshake',
            clientId,
            serverVersion: '1.0.0'
          });
        });

        this.wss.on('listening', () => {
          logError(new ConnectionError(`Multi-client server listening on port ${this.port}`), 'info');
          this.startHeartbeat();
          resolve();
        });

        this.wss.on('error', (error) => {
          logError(new ConnectionError('Server error', { error }), 'error');
          reject(error);
        });

      } catch (error) {
        logError(new ConnectionError('Failed to start WebSocket server', { error }), 'error');
        reject(error);
      }
    });
  }

  identifyClientType(req) {
    // Identify client type based on headers or connection parameters
    const userAgent = req.headers['user-agent'] || '';
    
    if (userAgent.includes('Godot')) {
      return 'godot';
    } else if (req.url && req.url.includes('type=mcp')) {
      return 'mcp';
    }
    
    // Default assumption based on connection order or other heuristics
    return 'unknown';
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      
      for (const [clientId, client] of this.clients.entries()) {
        // First, check if we're waiting for a pong and it's timed out
        if (client.heartbeatSent && now - client.heartbeatSent > HEARTBEAT_TIMEOUT) {
          logError(new ConnectionError(`Client ${clientId} heartbeat timeout (${now - client.heartbeatSent}ms), removing`), 'warn');
          client.ws.terminate();
          this.clients.delete(clientId);
          continue;
        }

        // Only send new heartbeat if we're not already waiting for a pong
        if (!client.heartbeatSent) {
          client.heartbeatSent = now; // Mark that we sent a ping
          logError(new ConnectionError(`Sending heartbeat ping to ${clientId} (${client.type})`), 'debug');
          this.sendToClient(clientId, {
            type: 'heartbeat',
            timestamp: now
          }).catch(() => {
            // If send fails, clear the heartbeat marker
            client.heartbeatSent = null;
            logError(new ConnectionError(`Failed to send heartbeat to ${clientId}`), 'warn');
          });
        } else {
          logError(new ConnectionError(`Waiting for heartbeat pong from ${clientId} (${now - client.heartbeatSent}ms elapsed)`), 'debug');
        }
      }
    }, HEARTBEAT_INTERVAL);
  }

  async handleClientMessage(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Handle different message types
    if (message.type === 'heartbeat_response') {
      // Clear heartbeat marker - client is alive!
      const responseTime = client.heartbeatSent ? Date.now() - client.heartbeatSent : 0;
      logError(new ConnectionError(`Received heartbeat pong from ${clientId} (${responseTime}ms response time)`), 'debug');
      client.heartbeatSent = null;
      return;
    }

    if (message.type === 'identify') {
      // Client is identifying itself
      client.type = message.clientType || 'unknown';
      client.ready = true;
      logError(new ConnectionError(`Client ${clientId} identified as ${client.type}`), 'info');
      return;
    }

    // Handle shutdown acknowledgment from Godot
    if (message.command === 'shutdown_ack') {
      logError(new ConnectionError(`Received shutdown acknowledgment from ${clientId}`), 'info');
      return;
    }

    // For regular commands, check if this is a response to a pending request
    const { id, success, result, error, command } = message;
    
    if (id && this.pendingRequests.has(id)) {
      const { resolve, reject } = this.pendingRequests.get(id);
      this.pendingRequests.delete(id);

      if (error) {
        reject(new ToolExecutionError(error));
      } else if (!success) {
        reject(new ToolExecutionError('Command failed'));
      } else {
        resolve(result);
      }
    }
  }

  async sendCommand(command, params = {}) {
    // Find a ready Godot client
    const godotClient = this.findGodotClient();
    
    if (!godotClient) {
      throw new ConnectionError('No Godot client connected');
    }

    const requestId = uuidv4();
    const message = {
      id: requestId,
      command,
      params,
      timestamp: Date.now(),
    };

    return new Promise(async (resolve, reject) => {
      try {
        // Set up timeout
        const timeout = setTimeoutPromise(DEFAULT_TIMEOUT)
          .then(() => {
            this.pendingRequests.delete(requestId);
            throw new TimeoutError(`Command ${command} timed out`);
          });

        // Store pending request
        this.pendingRequests.set(requestId, { resolve, reject });

        // Send to specific Godot client
        await this.sendToClient(godotClient.clientId, message);

        // Wait for response or timeout
        await Promise.race([timeout]);
      } catch (error) {
        reject(error);
      }
    });
  }

  findGodotClient() {
    // Find the first ready Godot client
    for (const [clientId, client] of this.clients.entries()) {
      if (client.type === 'godot' && client.ready && client.ws.readyState === 1) {
        return { clientId, ...client };
      }
    }
    return null;
  }

  async sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== 1) {
      throw new ConnectionError(`Client ${clientId} not available`);
    }

    try {
      client.ws.send(JSON.stringify(message));
    } catch (error) {
      logError(new ConnectionError(`Failed to send to client ${clientId}`, { error }), 'error');
      throw error;
    }
  }

  async broadcastToGodotClients(message) {
    const godotClients = Array.from(this.clients.entries())
      .filter(([_, client]) => client.type === 'godot' && client.ws.readyState === 1);

    for (const [clientId, client] of godotClients) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        logError(new ConnectionError(`Failed to broadcast to ${clientId}`, { error }), 'error');
      }
    }
  }

  hasConnectedClients() {
    return this.clients.size > 0;
  }

  hasGodotClients() {
    return Array.from(this.clients.values()).some(
      client => client.type === 'godot' && client.ws.readyState === 1
    );
  }

  isConnected() {
    // For backward compatibility - returns true if any Godot client is connected
    return this.hasGodotClients();
  }

  async broadcastShutdown() {
    if (this.shutdownInProgress) {
      logError(new ConnectionError('Shutdown already in progress'), 'warn');
      return;
    }

    this.shutdownInProgress = true;
    
    // Only notify Godot clients about shutdown
    const shutdownMessage = {
      id: uuidv4(),
      command: 'shutdown',
      params: {
        reason: 'mcp_server_terminating',
        timestamp: Date.now()
      },
      timestamp: Date.now()
    };

    logError(new ConnectionError('Broadcasting shutdown to Godot clients only'), 'info');
    await this.broadcastToGodotClients(shutdownMessage);

    // Give clients time to acknowledge
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    this.emit('shutdownComplete');
  }

  async stop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.wss) {
      try {
        // Close all client connections gracefully
        for (const [clientId, client] of this.clients.entries()) {
          if (client.ws.readyState === 1) {
            client.ws.close(1000, 'Server shutting down');
          }
        }
        
        this.clients.clear();

        // Close the server
        await new Promise((resolve) => {
          this.wss.close(() => resolve());
        });
        
        this.wss = null;
        logError(new ConnectionError('WebSocket server stopped'), 'info');
      } catch (error) {
        logError(new ConnectionError('Error stopping WebSocket server', { error }), 'error');
      }
    }
  }

  async cleanup() {
    await this.stop();
  }

  getConnectionStats() {
    const stats = {
      totalClients: this.clients.size,
      godotClients: 0,
      mcpClients: 0,
      unknownClients: 0
    };

    for (const client of this.clients.values()) {
      switch (client.type) {
        case 'godot':
          stats.godotClients++;
          break;
        case 'mcp':
          stats.mcpClients++;
          break;
        default:
          stats.unknownClients++;
      }
    }

    return stats;
  }
}

export default WebSocketManager;
