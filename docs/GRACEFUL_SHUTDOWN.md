# 🔄 Graceful Shutdown System

## Overview

The MCP + Godot integration implements a **Multi-Method Shutdown Detection** system that ensures no stale daemon processes are left running when Claude Desktop quits.

**IMPORTANT**: Claude Desktop uses **STDIO transport**, not signals. When Claude Desktop quits, it closes the stdin/stdout pipes to MCP servers but doesn't send termination signals.

## How It Works

### **Method 1: STDIN Closure Detection (Primary)**
When Claude Desktop terminates, it closes the MCP server's stdin pipe. We detect this closure and initiate shutdown.

### **Method 2: Parent Process Monitoring (Backup)**
Periodically check if the parent process (Claude Desktop) is still alive using `process.kill(ppid, 0)`.

### **Method 3: Signal Handlers (Fallback)**
Traditional `SIGTERM`, `SIGINT`, and `SIGHUP` handlers for manual termination.

### **Shutdown Sequence**
```
Claude Desktop Quits
    ↓
MCP Server detects stdin closure OR parent death
    ↓
Broadcasts "shutdown" command to Godot via WebSocket
    ↓
Godot Plugin receives shutdown command
    ↓
Godot sends "shutdown_ack" acknowledgment
    ↓
MCP Server closes WebSocket connections
    ↓
MCP Server exits gracefully
    ↓
All processes terminated - No stale daemons!
```

### 3. **Timeout Protection**
- **Server-side**: 3-second timeout for client acknowledgments
- **Client-side**: 2-second timeout for sending acknowledgments
- **Fallback**: Force shutdown if graceful shutdown fails

## Components Modified

### **MCP Server (`src/index.js`)**
- Added `SIGTERM` and `SIGINT` signal handlers
- Implemented `gracefulShutdown()` method
- Added timeout handling for client acknowledgments

### **WebSocket Manager (`src/websocket-manager.js`)**
- Extended from `EventEmitter` for event coordination
- Added `broadcastShutdown()` method
- Implemented shutdown acknowledgment handling
- Added `hasConnectedClients()` helper method

### **Godot Plugin (`addons/claude_mcp/mcp_client.gd`)**
- Added `shutdown` command handler
- Implemented `_cmd_shutdown()` method
- Added `_send_shutdown_acknowledgment()` function
- Added `_perform_graceful_shutdown()` cleanup

### **Dock UI (`addons/claude_mcp/mcp_dock.gd`)**
- Enhanced connection status reporting
- Added shutdown status messages

### **Testing**

#### **Automated STDIO Test**
```bash
cd /home/chris/proj/claude/mcp/godot4_mcp
node test-stdio-shutdown.js
```

#### **Automated General Test** 
```bash
node test-graceful-shutdown.js
```

#### **Manual Test with Claude Desktop**
1. **Start MCP Server**: Configure in `claude_desktop_config.json` and restart Claude Desktop
2. **Connect Godot**: Open Godot project with plugin enabled
3. **Test Shutdown**: Quit Claude Desktop completely
4. **Verify**: Check that both MCP server and Godot disconnect cleanly

## Expected Behavior

### **Normal Operation**
```
[MCP Server] Godot 4 MCP Server started successfully
[MCP Server] Monitoring parent process (Claude Desktop) PID: 12345
[MCP Client] Connected to server
[DOCK] MCP server connected
```

### **Graceful Shutdown (STDIN Detection)**
```
[MCP Server] stdin closed - parent process (Claude Desktop) likely terminated
[MCP Server] Initiating graceful shutdown...
[MCP Server] Broadcasting shutdown to connected clients...
[MCP_CLIENT] 🚫 SHUTDOWN command received from MCP server
[MCP_CLIENT] ✅ Shutdown acknowledgment sent successfully
[MCP Server] Shutdown acknowledgment received
[MCP_CLIENT] 🔄 Performing graceful shutdown...
[MCP_CLIENT] ✅ Graceful shutdown completed
[MCP Server] Graceful shutdown completed
```

### **Graceful Shutdown (Parent Death Detection)**
```
[MCP Server] Parent process (Claude Desktop) no longer exists - shutting down
[MCP Server] Initiating graceful shutdown...
[... same sequence as above ...]
```

## Error Handling

### **Timeout Scenarios**
- If Godot doesn't acknowledge within 2 seconds, server proceeds with shutdown
- If server doesn't receive acknowledgment within 3 seconds, forces cleanup
- Fallback mechanisms prevent hanging processes

### **Crash Protection**
- `uncaughtException` and `unhandledRejection` handlers trigger graceful shutdown
- Multiple signal handlers (`SIGTERM`, `SIGINT`) ensure coverage
- Force exit after timeout prevents zombie processes

## Benefits

✅ **No Stale Daemons** - All processes terminate when Claude Desktop quits  
✅ **Multi-Method Detection** - STDIN closure + parent monitoring + signal handlers  
✅ **Coordinated Cleanup** - Both server and client close connections properly  
✅ **Resource Management** - WebSocket connections and pending requests cleaned up  
✅ **Error Recovery** - Multiple fallback mechanisms handle edge cases  
✅ **STDIO Transport Compatible** - Works with Claude Desktop's actual process management  
✅ **Production Ready** - Comprehensive error handling and logging  
✅ **Future-Proof** - Extensible architecture for additional clients  

## Troubleshooting

### **If Graceful Shutdown Fails**
1. Check server logs for timeout messages
2. Verify Godot plugin is receiving shutdown commands
3. Test WebSocket connection independently
4. Run automated test script for diagnostics

### **Common Issues**
- **Firewall blocking WebSocket**: Check port 8765 accessibility
- **Plugin not loaded**: Verify plugin is enabled in Godot
- **Signal not received**: Test with manual `kill -TERM <pid>`

## Future Enhancements

- [ ] Multiple client support (when MCP supports multiple Godot instances)
- [ ] Custom shutdown timeouts via configuration
- [ ] Health check integration
- [ ] Process monitoring and restart capabilities

---

**Status**: ✅ **Production Ready** - Comprehensive graceful shutdown system implemented and tested.
