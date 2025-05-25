@tool
extends Control

## UI Dock for Claude MCP Plugin
## Shows connection status and provides manual controls

var mcp_client: MCPClient

@onready var status_label: Label = $VBox/StatusLabel
@onready var connect_button: Button = $VBox/ConnectButton
@onready var info_label: Label = $VBox/InfoLabel

func _ready():
	if connect_button:
		connect_button.pressed.connect(_on_connect_pressed)

func setup(client: MCPClient):
	mcp_client = client
	
	if mcp_client:
		mcp_client.connected_to_server.connect(_on_connected)
		mcp_client.disconnected_from_server.connect(_on_disconnected)
		mcp_client.command_executed.connect(_on_command_executed)
	
	_update_ui()

func _on_connected():
	_update_ui()

func _on_disconnected():
	_update_ui()

func _on_command_executed(command: String, result: Dictionary):
	if info_label:
		info_label.text = "Last: " + command

func _on_connect_pressed():
	if not mcp_client:
		return
		
	if mcp_client.is_connected():
		mcp_client.disconnect_from_server()
	else:
		mcp_client.connect_to_server()

func _update_ui():
	if not mcp_client:
		return
		
	var is_connected = mcp_client.is_connected()
	
	if status_label:
		status_label.text = "Status: " + ("Connected" if is_connected else "Disconnected")
		status_label.modulate = Color.GREEN if is_connected else Color.RED
	
	if connect_button:
		connect_button.text = "Disconnect" if is_connected else "Connect"
	
	if info_label and is_connected:
		info_label.text = "Ready for Claude commands"
	elif info_label:
		info_label.text = "Start MCP server first"
