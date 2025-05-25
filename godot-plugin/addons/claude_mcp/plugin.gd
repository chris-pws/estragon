@tool
extends EditorPlugin

## Claude MCP Integration Plugin
## Connects Godot Editor to Claude Desktop via WebSocket MCP server

const MCPClient = preload("res://addons/claude_mcp/mcp_client.gd")

var mcp_client: MCPClient
var dock_ui: Control

func _enter_tree():
	print("[Claude MCP] Plugin starting...")
	
	# Create and start MCP client
	mcp_client = MCPClient.new()
	add_child(mcp_client)
	
	# Create dock UI
	dock_ui = preload("res://addons/claude_mcp/mcp_dock.tscn").instantiate()
	add_control_to_dock(DOCK_SLOT_LEFT_UL, dock_ui)
	
	# Connect dock to client
	dock_ui.setup(mcp_client)
	
	# Start connection
	mcp_client.connect_to_server()
	
	print("[Claude MCP] Plugin initialized successfully")

func _exit_tree():
	print("[Claude MCP] Plugin shutting down...")
	
	if mcp_client:
		mcp_client.disconnect_from_server()
		mcp_client.queue_free()
	
	if dock_ui:
		remove_control_from_docks(dock_ui)
		dock_ui.queue_free()
	
	print("[Claude MCP] Plugin shut down")

func _has_main_screen():
	return false

func _get_plugin_name():
	return "Claude MCP"
