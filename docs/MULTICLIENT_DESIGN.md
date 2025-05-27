# Multi-Client WebSocket Architecture Design

**Version:** 1.0  
**Date:** May 26, 2025  
**Author:** Claude + Chris  
**Status:** Implementation In Progress  

## Executive Summary

This document outlines the multi-client WebSocket architecture designed to solve the connection stability issue between Claude Desktop and the Godot MCP plugin. The new architecture allows multiple independent client connections, preventing the MCP server from shutting down when individual clients disconnect.

## Architecture Overview

```
┌─────────────────┐
│ Claude Desktop  │
│   (MCP Host)    │
└────────┬────────┘
         │ MCP Protocol
         │
┌────────▼────────┐
│   MCP Server    │
│   (Node.js)     │
└────────┬────────┘
         │
┌────────▼─────────────┐      ┌─────────────┐
│  WebSocket Manager   │      │   Clients   │
│  - Multi-client      │◄────►│  Registry   │
│  - Client routing    │      │  (Map)      │
│  - Heartbeat system  │      └─────────────┘
└────────┬─────────────┘
         │ WebSocket
    ┌────┴────┬────────┬─────────┐
    │         │        │         │
┌───▼──┐  ┌──▼──┐  ┌──▼──┐  ┌──▼──┐
│Godot │  │Godot│  │ MCP │  │Other│
│Client│  │ #2  │  │Client│  │ ... │
└──────┘  └─────┘  └─────┘  └─────┘
```

## Key Components

### 1. WebSocket Manager Changes

#### Client Registry
```javascript
this.clients = new Map(); // clientId -> ClientInfo

interface ClientInfo {
  ws: WebSocket;           // WebSocket connection
  type: string;           // 'godot' | 'mcp' | 'unknown'
  lastHeartbeat: number;  // Timestamp of last activity
  ready: boolean;         // Has completed handshake
}
```

#### Client Identification
- **Headers-based:** Check User-Agent for "Godot"
- **URL-based:** Query parameters for client type
- **Handshake-based:** Post-connection identification message

#### Connection Lifecycle
1. **Connection:** Assign UUID, store in registry
2. **Handshake:** Exchange version and capabilities
3. **Identification:** Client declares type and version
4. **Operation:** Route commands and maintain heartbeat
5. **Disconnection:** Remove from registry, no cascade

### 2. Godot Client Protocol

#### Handshake Sequence
```
Server → Client: {
  "type": "handshake",
  "clientId": "uuid-here",
  "serverVersion": "1.0.0"
}

Client → Server: {
  "type": "identify",
  "clientType": "godot",
  "clientVersion": "1.0.1",
  "godotVersion": "4.3.0"
}
```

#### Heartbeat Protocol
- **Interval:** 30 seconds
- **Timeout:** 60 seconds (2 missed beats)
- **Recovery:** Automatic removal of dead clients

### 3. Command Routing

#### Finding Target Client
```javascript
findGodotClient() {
  // Returns first available Godot client
  for (const [clientId, client] of this.clients) {
    if (client.type === 'godot' && 
        client.ready && 
        client.ws.readyState === OPEN) {
      return { clientId, ...client };
    }
  }
  return null;
}
```

#### Error Handling
- No Godot client: Return appropriate error
- Client disconnects mid-command: Timeout handling
- Multiple clients: Route to first available

## Implementation Status

### Completed ✅
- Multi-client WebSocket manager
- Client identification system
- Heartbeat monitoring
- Selective shutdown broadcasting
- Connection statistics

### In Progress 🚧
- Godot client heartbeat implementation
- Client identification headers
- Handshake protocol in Godot

### TODO 📋
- Fix duplicate code in mcp_client.gd
- Comprehensive testing
- Performance optimization
- Documentation updates

## Migration Guide

### For MCP Server
1. Replace `websocket-manager.js` with new version
2. No changes needed to other server files
3. Restart MCP server

### For Godot Plugin
1. Update `mcp_client.gd` with new version
2. Reload plugin in Godot
3. Test connection/disconnection

### For Claude Desktop
No changes required - benefits automatically from stable connection

## Benefits

1. **Stability:** Claude Desktop connection unaffected by Godot disconnects
2. **Scalability:** Support for multiple Godot instances
3. **Flexibility:** Easy addition of new client types
4. **Debugging:** Better visibility into connected clients
5. **Reliability:** Automatic cleanup of dead connections

## Future Enhancements

### Phase 2 (Optional)
- Client targeting for specific commands
- Load balancing across multiple Godot instances
- Persistent client IDs with reconnection tokens
- WebSocket compression for large scenes

### Phase 3 (Long-term)
- Client capabilities negotiation
- Command queuing for offline clients
- Real-time collaboration features
- Performance metrics dashboard

## Testing Requirements

### Unit Tests
- Client connection/disconnection
- Heartbeat timeout detection
- Command routing logic
- Error handling paths

### Integration Tests
- Multi-client scenarios
- Network failure recovery
- High-load conditions
- Long-running connections

### Manual Tests
- User workflow validation
- UI responsiveness
- Error message clarity
- Performance benchmarks

## Security Considerations

1. **Client Validation:** Verify client identities
2. **Command Sanitization:** Validate all inputs
3. **Rate Limiting:** Prevent DoS attacks
4. **Connection Limits:** Max clients per IP
5. **Secure Transport:** Consider WSS for production

## Conclusion

The multi-client WebSocket architecture provides a robust solution to the connection stability issue while laying groundwork for future enhancements. The implementation maintains backward compatibility while significantly improving the user experience.

---

**Questions?** Contact the development team or refer to the implementation worklog for technical details.