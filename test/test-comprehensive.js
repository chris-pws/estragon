#!/usr/bin/env node

/**
 * Comprehensive MCP Server Test Suite
 * Tests all functionality and reverts changes (leaves no trace)
 */

import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';

const SERVER_URL = 'ws://localhost:8765';
const TEST_TIMEOUT = 30000; // 30 seconds
const COMMAND_TIMEOUT = 5000; // 5 seconds per command

class MCPServerTester {
    constructor() {
        this.ws = null;
        this.testResults = [];
        this.createdNodes = []; // Track nodes for cleanup
        