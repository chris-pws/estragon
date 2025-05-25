/**
 * WebSocket Manager for Godot Communication
 * 
 * Handles WebSocket server for communicating with Godot EditorPlugin
 */

import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';

export class WebSocketManager {
  constructor(port = 8765) {
    this.port = port;
    this.wss = null;
    this.godotClient = null;
    this.pendingRequests = new Map();
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.wss = new WebSocketServer({ port: this.port });

      this.wss.on('connection', (ws) => {
        console.error(`[WebSocket] Godot client connected`);
        this.godotClient = ws;

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleGodotMessage(message);
          } catch (error) {
            console.error('[WebSocket] Failed to parse message:', error);
          }
        });

        ws.on('close', () => {
          console.error('[WebSocket] Godot client disconnected');
          this.godotClient = null;
        });

        ws.on('error', (error) => {
          console.error('[WebSocket] Client error:', error);
        });
      });

      this.wss.on('listening', () => {
        console.error(`[WebSocket] Server listening on port ${this.port}`);
        resolve();
      });

      this.wss.on('error', (error) => {
        console.error('[WebSocket] Server error:', error);
        reject(error);
      });
    });
  }

  async stop() {
    if (this.wss) {
      this.wss.close();
    }
  }

  isConnected() {
    return this.godotClient && this.godotClient.readyState === this.godotClient.OPEN;
  }

  async sendCommand(command, params = {}) {
    if (!this.isConnected()) {
      throw new Error('Godot client not connected');
    }

    const requestId = uuidv4();
    const message = {
      id: requestId,
      command,
      params,
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Command ${command} timed out`));
      }, 10000); // 10 second timeout

      // Store pending request
      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      // Send message
      this.godotClient.send(JSON.stringify(message));
    });
  }

  handleGodotMessage(message) {
    const { id, success, result, error } = message;

    if (id && this.pendingRequests.has(id)) {
      const { resolve, reject, timeout } = this.pendingRequests.get(id);
      clearTimeout(timeout);
      this.pendingRequests.delete(id);

      if (success) {
        resolve(result);
      } else {
        reject(new Error(error || 'Unknown error from Godot'));
      }
    } else {
      // Handle unsolicited messages (notifications, events, etc.)
      console.error('[WebSocket] Received notification from Godot:', message);
    }
  }
}
