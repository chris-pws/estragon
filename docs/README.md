# Godot 4 MCP Server

Model Context Protocol (MCP) server for integrating Claude Desktop with Godot 4 game engine.

## Features

- Real-time scene manipulation through Claude
- Node creation and property modification
- WebSocket-based communication with Godot editor
- Scene state synchronization

## Setup

1. Install dependencies: `npm install`
2. Start the MCP server: `npm start`
3. Install the Godot plugin (see godot-plugin directory)
4. Configure Claude Desktop to use this MCP server

## Architecture

- **MCP Server**: Node.js server implementing MCP protocol
- **WebSocket Bridge**: Real-time communication with Godot
- **Godot Plugin**: EditorPlugin for scene manipulation

## Development

Run in development mode with auto-reload:
```bash
npm run dev
```
