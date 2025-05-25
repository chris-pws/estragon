# 📱 Client Setup Guide

## 🖥️ Claude Desktop

1. Download and install Claude Desktop from the official website
2. Open Claude Desktop and go to Settings
3. Navigate to the "Connections" tab
4. Click "Add New Connection"
   - Name: Your Game Name
   - Protocol: MCP
   - Host: localhost (or your server IP)
   - Port: 4201 (default MCP port)
5. Click "Save" and then "Connect"

## 📱 MUSHclient

1. Download and install MUSHclient
2. Create a new world:
   - File → New World
   - Name: Your Game Name
   - Host: localhost
   - Port: 4201
3. Configure MCP:
   - Go to World → World Options
   - Navigate to "MCP" tab
   - Enable MCP
   - Set "MCP Version" to 2.0
4. Save and connect to your game

## 📱 TinyFugue

1. Download and install TinyFugue
2. Create a new connection:
   - Start TinyFugue
   - Enter: `connect localhost 4201`
3. Enable MCP:
   - Enter: `set mcp_version 2.0`
   - Enter: `set mcp_enabled 1`
4. Connect to your game

## 📱 zMUD

1. Download and install zMUD
2. Create a new connection:
   - File → New World
   - Name: Your Game Name
   - Host: localhost
   - Port: 4201
3. Configure MCP:
   - Go to World → World Options
   - Navigate to "MCP" tab
   - Enable MCP
   - Set "MCP Version" to 2.0
4. Save and connect

## 📱 Web Clients

For web-based clients, ensure your server is configured to accept WebSocket connections. The default port for MCP WebSocket connections is 4202.

1. Configure your server to accept WebSocket connections
2. Point your web client to `ws://your-server:4202`
3. Ensure your web client supports MCP 2.0 protocol

## 🔄 Troubleshooting

- **Connection Issues**: Verify your firewall settings and ensure the port (4201) is open
- **MCP Not Working**: Check that your client supports MCP 2.0 protocol
- **Authentication**: Ensure your server's authentication system is properly configured
- **SSL/TLS**: If using HTTPS, make sure your client supports secure connections

## 📚 Additional Resources

- [MCP Protocol Specification](https://mcp.mud.net/mcp2.html)
- [Godot Networking Documentation](https://docs.godotengine.org/en/stable/tutorials/networking/index.html)
- [Estragon GitHub Repository](https://github.com/yourusername/estragon)
