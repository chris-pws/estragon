export class MCPError extends Error {
  constructor(message, code = 'UNKNOWN', details = {}) {
    super(message);
    this.name = 'MCPError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

export class ConnectionError extends MCPError {
  constructor(message, details = {}) {
    super(message, 'CONNECTION_ERROR', details);
    this.name = 'ConnectionError';
  }
}

export class TimeoutError extends MCPError {
  constructor(message, details = {}) {
    super(message, 'TIMEOUT_ERROR', details);
    this.name = 'TimeoutError';
  }
}

export class ValidationError extends MCPError {
  constructor(message, details = {}) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class ToolExecutionError extends MCPError {
  constructor(message, details = {}) {
    super(message, 'TOOL_EXECUTION_ERROR', details);
    this.name = 'ToolExecutionError';
  }
}

// Error logging utility
export function logError(error, level = 'error') {
  const log = {
    timestamp: new Date().toISOString(),
    level,
    name: error.name,
    code: error.code,
    message: error.message,
    ...(error.details || {})
  };

  // Log to console with appropriate color
  const color = {
    error: '\x1b[31m',  // red
    warn: '\x1b[33m',   // yellow
    info: '\x1b[36m',   // cyan
  }[level] || '\x1b[37m'; // white
  
  console.error(`\x1b[1m[${level.toUpperCase()}]\x1b[0m ${color}${JSON.stringify(log, null, 2)}\x1b[0m`);
}
