# Godot Plugin Installation & Setup Guide

## Step 1: Copy Plugin to Godot Project

1. **Copy the plugin folder** to your Godot project:
   ```
   your_godot_project/
   └── addons/
       └── claude_mcp/
           ├── plugin.cfg
           ├── plugin.gd
           ├── mcp_client.gd
           ├── mcp_dock.gd
           └── mcp_dock.tscn
   ```

2. **Enable the plugin**:
   - Open your Godot project
   - Go to `Project → Project Settings → Plugins`
   - Find "Claude MCP Integration" and enable it
   - You should see a "Claude MCP" dock appear in the editor

## Step 2: Start the MCP Server

Before connecting Godot, make sure your MCP server is running:

```bash
cd /home/chris/proj/claude/mcp/godot4_mcp
node src/index.js
```

You should see:
```
[WebSocket] Server listening on port 8765
Godot 4 MCP Server started successfully
```

## Step 3: Connect Godot to MCP Server

1. **In Godot Editor**: Look for the "Claude MCP" dock (usually on the left side)
2. **Click "Connect"** button in the dock
3. **Status should change** to "Connected" (green text)

## Step 4: Test the Connection

### Method 1: Test in Claude Desktop
If your MCP server is configured with Claude Desktop:

1. Ask Claude: "Get the current scene tree"
2. Ask Claude: "Create a new Sprite2D node called TestSprite"
3. Check Godot editor - you should see the node appear!

### Method 2: Test with Mock Client (Fallback)
If Claude Desktop isn't set up yet:

1. **Stop the MCP server** (Ctrl+C)
2. **Run the mock test**: `node test-websocket.js`
3. **Connect Godot** to the mock client
4. You should see connection messages in both terminals

## Step 5: Verify Everything Works

Create a simple test:

1. **Open/Create a scene** in Godot
2. **In Claude Desktop**, try these commands:
   - "List all nodes in the current scene"
   - "Create a Control node called MainMenu"
   - "Create a Label node called TitleLabel as a child of MainMenu"
   - "Set the text property of TitleLabel to 'My Game'"

You should see nodes appearing in real-time in the Godot editor!

## Troubleshooting

### "Connection Failed"
- Ensure MCP server is running on port 8765
- Check firewall settings
- Verify WebSocket server started (see console output)

### "Plugin Not Found"
- Check plugin files are in correct directory structure
- Ensure `plugin.cfg` is properly formatted
- Restart Godot editor after copying files

### "Commands Not Working"
- Verify Godot plugin shows "Connected" status
- Check both MCP server and Godot console for error messages
- Ensure a scene is open in Godot editor

### "Claude Desktop Not Seeing Tools"
- Verify `claude_desktop_config.json` is in correct location
- Restart Claude Desktop after config changes
- Check MCP server logs for connection issues

## Advanced Configuration

### Custom WebSocket Port
To change the default port (8765):

1. **In `mcp_client.gd`**: Change `SERVER_URL` constant
2. **In `websocket-manager.js`**: Change default port in constructor
3. **Restart both** MCP server and Godot

### Development Mode
For development, you can:
- Edit GDScript files while Godot is running (hot reload)
- Check Godot's Output panel for debug messages
- Use Godot's debugger to step through plugin code

## Next Steps

Once connected, you can:
- Create complete scenes through Claude
- Set up node hierarchies and properties
- Generate and attach scripts
- Save scenes with custom names
- Build entire game prototypes via conversation!

The integration enables Claude to act as your AI game development assistant with direct scene manipulation capabilities.
