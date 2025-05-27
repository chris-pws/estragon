# 🌿 Estragon - Godot 4 MCP Protocol

A fresh take on LLM collaboration, built with 🍀 and 🌟

## 🚀 Overview

Estragon is an initial implementation of the MCP protocol for Godot 4, enabling seamless communication between your game and AI assistants. Whether you're building a text-based adventure, a collaborative writing tool, or any other AI-powered experience, Estragon makes it easy to connect your Godot project with AI assistants like Claude.

## 📱 Use Cases

- 🎮 Text-based adventures with AI companions
- 📝 Collaborative writing tools
- 🎮 AI-powered game assistants
- 🤖 Custom AI integrations

## 📦 Project Structure

```
📦 estragon/
├── 📁 src/             # Core implementation
├── 📁 godot-plugin/    # Godot plugin
└── 📁 docs/           # Documentation
```

## 🌱 Current Features

- 🎮 Complete Godot 4 editor integration
- 🔌 Full MCP protocol communication
- 🌐 WebSocket-based real-time communication
- 🔄 **Graceful shutdown system** - No stale daemons when Claude Desktop quits
- 🛠️ 8 comprehensive scene manipulation tools
- 📚 Extensive documentation and testing

## 🧪 Recent Research & Development

**🕷️ Web Research Complete** - May 27, 2025
- 🔍 **Collision Shape Assignment:** Research validated Godot 4 patterns for programmatic shape creation
- 🗑️ **Node Deletion System:** Discovered performance optimizations and safety patterns
- 📋 **Implementation Ready:** Production-grade solutions documented in [TODO_ENHANCEMENTS.md](docs/TODO_ENHANCEMENTS.md)

## 🎯 Next Priority Features

- 🟢 **Priority 1:** Collision shape assignment (CircleShape2D, RectangleShape2D, etc.)
- 🟡 **Priority 2:** Node deletion system (safe deletion with performance optimization)
- 🔵 **Priority 3:** Enhanced property type conversion (better MCP protocol handling)

## 🛠️ Setup

For detailed setup instructions, check out:
- [Godot Setup](docs/GODOT_SETUP.md)
- [Client Setup](docs/CLIENT_SETUP.md) - Setup instructions for popular clients (Claude Desktop, MUSHclient, TinyFugue, zMUD, and web clients)
- [Claude Setup](docs/SETUP_CLAUDE.md)
- [Graceful Shutdown](GRACEFUL_SHUTDOWN.md) - **NEW**: Signal-based cascade shutdown system

## 🤝 Contributing

We welcome contributions! Please feel free to submit issues and pull requests.

## 📜 License

MIT License - feel free to use this project however you like!
## 📚 Documentation

### Setup Guides
- [Godot Setup](docs/GODOT_SETUP.md) - Plugin installation and configuration
- [Client Setup](docs/CLIENT_SETUP.md) - Setup for Claude Desktop and other MCP clients  
- [Claude Setup](docs/SETUP_CLAUDE.md) - Claude Desktop configuration

### Architecture & Development
- [Multi-Client Design](docs/MULTICLIENT_DESIGN.md) - WebSocket architecture for multiple connections
- [QA Worklog](docs/QA_WORKLOG_FINAL.md) - Comprehensive testing and validation results
- [Enhancement TODO](docs/TODO_ENHANCEMENTS.md) - **NEW**: Research-validated feature roadmap

### System Documentation  
- [Graceful Shutdown](GRACEFUL_SHUTDOWN.md) - Multi-method process lifecycle management
- [Final Worklog](docs/FINAL_WORKLOG_COMPLETE.md) - Complete development history and achievements

## 🤝 Contributing

We welcome contributions! Check out [TODO_ENHANCEMENTS.md](docs/TODO_ENHANCEMENTS.md) for research-validated enhancement opportunities.

## 📜 License

MIT License - feel free to use this project however you like!
