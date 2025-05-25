/**
 * WebSocket Manager for Godot Communication
 * 
 * Handles WebSocket server for communicating with Godot EditorPlugin
 */

import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { ConnectionError, TimeoutError, logError } from './errors.js';
import { setTimeout as setTimeoutPromise } from 'timers/promises';

const DEFAULT_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 3;
const RECONNECT_DELAY = 5000; // 5 seconds

export class WebSocketManager {
  constructor(port = 8765) {
    this.port = port;
    this.wss = null;
    this.godotClient = null;
    this.pendingRequests = new Map();
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.isConnected = false;
  }

  async start() {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocketServer({ port: this.port });
        
        this.wss.on('connection', async (ws) => {
          this.godotClient = ws;
          this.isConnected = true;
          logError(new ConnectionError('Godot client connected'), 'info');

          ws.on('message', async (data) => {
            try {
              const message = JSON.parse(data.toString());
              await this.handleGodotMessage(message);
            } catch (error) {
              logError(error, 'error');
            }
          });

          ws.on('close', async () => {
            this.godotClient = null;
            this.isConnected = false;
            logError(new ConnectionError('Godot client disconnected'), 'warn');
            this.attemptReconnect();
          });

          ws.on('error', (error) => {
            logError(new ConnectionError('Client error', { error }), 'error');
          });
        });

        this.wss.on('listening', () => {
          logError(new ConnectionError(`Server listening on port ${this.port}`), 'info');
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

  async stop() {
    if (this.wss) {
      try {
        await new Promise((resolve) => {
          this.wss.close(() => resolve());
        });
        this.wss = null;
        this.godotClient = null;
        this.isConnected = false;
        logError(new ConnectionError('WebSocket server stopped'), 'info');
      } catch (error) {
        logError(new ConnectionError('Error stopping WebSocket server', { error }), 'error');
      }
    }
  }

  async sendCommand(command, params = {}) {
    if (!this.isConnected) {
      throw new ConnectionError('Godot client not connected');
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

        // Send message with retry logic
        await this.sendMessageWithRetry(message, MAX_RETRIES);

        // Wait for response or timeout
        await Promise.race([timeout]);
      } catch (error) {
        reject(error);
      }
    });
  }

  async handleGodotMessage(message) {
    const { id, success, result, error } = message;

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
    } else {
      logError(new ValidationError('No pending request found for message ID'), 'warn');
    }
  }

  async attemptReconnect() {
    if (this.reconnectAttempts >= MAX_RETRIES) {
      logError(new ConnectionError('Max reconnection attempts reached'), 'error');
      return;
    }

    this.reconnectAttempts++;
    logError(new ConnectionError(`Attempting reconnection attempt ${this.reconnectAttempts}`), 'info');

    this.reconnectTimer = setTimeout(() => {
      this.start();
    }, RECONNECT_DELAY);
  }

  async sendMessageWithRetry(message, retries = 0) {
    try {
      if (!this.godotClient) {
        throw new ConnectionError('No WebSocket client available');
      }

      this.godotClient.send(JSON.stringify(message));
    } catch (error) {
      if (retries < MAX_RETRIES) {
        logError(new ConnectionError('Message send failed, retrying...'), 'warn');
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.sendMessageWithRetry(message, retries + 1);
      } else {
        throw new ConnectionError('Failed to send message after retries');
      }
    }
  }

  async cleanup() {
    await this.stop();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
  }

  isConnected() {
    return this.godotClient && this.godotClient.readyState === this.godotClient.OPEN;
  }
}

export default WebSocketManager;
