@tool
extends Node
class_name MCPClient

## WebSocket client for communicating with Claude MCP Server
## Handles all MCP command execution and scene manipulation

signal connected_to_server
signal disconnected_from_server
signal command_executed(command: String, result: Dictionary)

const SERVER_URL = "ws://localhost:8765"

var websocket: WebSocketPeer
var connection_status: String = "disconnected"
var pending_requests: Dictionary = {}

# Editor interface references
var editor_interface: EditorInterface
var editor_selection: EditorSelection

func _ready():
	# Get editor interfaces
	editor_interface = EditorInterface.get_singleton()
	editor_selection = editor_interface.get_selection()
	
	# Create WebSocket
	websocket = WebSocketPeer.new()
	
	print("[MCP Client] Initialized")

func _process(_delta):
	if websocket:
		websocket.poll()
		
		match websocket.get_ready_state():
			WebSocketPeer.STATE_OPEN:
				if connection_status != "connected":
					connection_status = "connected"
					print("[MCP Client] Connected to server")
					connected_to_server.emit()
				
				# Process incoming messages
				while websocket.get_available_packet_count() > 0:
					var packet = websocket.get_packet()
					var message_text = packet.get_string_from_utf8()
					_handle_server_message(message_text)
			
			WebSocketPeer.STATE_CLOSED:
				if connection_status == "connected":
					connection_status = "disconnected"
					print("[MCP Client] Disconnected from server")
					disconnected_from_server.emit()

func connect_to_server():
	print("[MCP Client] Connecting to ", SERVER_URL)
	var error = websocket.connect_to_url(SERVER_URL)
	if error != OK:
		print("[MCP Client] Failed to connect: ", error)
		return false
	
	connection_status = "connecting"
	return true

func disconnect_from_server():
	if websocket:
		websocket.close()
	connection_status = "disconnected"

func is_connected() -> bool:
	return connection_status == "connected"

func _handle_server_message(message_text: String):
	var json = JSON.new()
	var parse_result = json.parse(message_text)
	
	if parse_result != OK:
		print("[MCP Client] Failed to parse JSON: ", message_text)
		return
	
	var message = json.data
	print("[MCP Client] Received command: ", message.get("command", "unknown"))
	
	# Execute the command
	var result = _execute_command(message)
	
	# Send response back
	var response = {
		"id": message.get("id", ""),
		"success": result.success,
		"result": result.data if result.success else null,
		"error": result.error if not result.success else null,
		"timestamp": Time.get_unix_time_from_system()
	}
	
	_send_response(response)

func _execute_command(message: Dictionary) -> Dictionary:
	var command = message.get("command", "")
	var params = message.get("params", {})
	
	match command:
		"get_scene_tree":
			return _cmd_get_scene_tree(params)
		"list_nodes":
			return _cmd_list_nodes(params)
		"create_node":
			return _cmd_create_node(params)
		"set_node_property":
			return _cmd_set_node_property(params)
		"get_node_properties":
			return _cmd_get_node_properties(params)
		"move_node":
			return _cmd_move_node(params)
		"save_scene":
			return _cmd_save_scene(params)
		_:
			return {"success": false, "error": "Unknown command: " + command}

func _send_response(response: Dictionary):
	var json_string = JSON.stringify(response)
	websocket.send_text(json_string)
	print("[MCP Client] Sent response for command")

# Command implementations
func _cmd_get_scene_tree(_params: Dictionary) -> Dictionary:
	var current_scene = editor_interface.get_edited_scene_root()
	if not current_scene:
		return {"success": false, "error": "No scene is currently open"}
	
	var tree_data = _build_node_tree(current_scene)
	return {"success": true, "data": {"root": tree_data}}

func _cmd_list_nodes(params: Dictionary) -> Dictionary:
	var node_path = params.get("node_path", "")
	var current_scene = editor_interface.get_edited_scene_root()
	
	if not current_scene:
		return {"success": false, "error": "No scene is currently open"}
	
	var nodes = []
	var start_node = current_scene
	
	if node_path != "":
		start_node = current_scene.get_node_or_null(node_path)
		if not start_node:
			return {"success": false, "error": "Node not found: " + node_path}
	
	_collect_nodes(start_node, nodes, _get_node_path(start_node))
	return {"success": true, "data": {"nodes": nodes}}

func _cmd_create_node(params: Dictionary) -> Dictionary:
	var node_type = params.get("node_type", "")
	var node_name = params.get("node_name", "")
	var parent_path = params.get("parent_path", "")
	
	if node_type == "" or node_name == "":
		return {"success": false, "error": "node_type and node_name are required"}
	
	var current_scene = editor_interface.get_edited_scene_root()
	if not current_scene:
		return {"success": false, "error": "No scene is currently open"}
	
	# Find parent node
	var parent_node = current_scene
	if parent_path != "":
		parent_node = current_scene.get_node_or_null(parent_path)
		if not parent_node:
			return {"success": false, "error": "Parent node not found: " + parent_path}
	
	# Create new node
	var new_node = _create_node_by_type(node_type)
	if not new_node:
		return {"success": false, "error": "Unknown node type: " + node_type}
	
	new_node.name = node_name
	parent_node.add_child(new_node)
	new_node.owner = current_scene
	
	var created_path = _get_node_path(new_node)
	return {
		"success": true, 
		"data": {
			"created_node": {
				"path": created_path,
				"type": node_type,
				"name": node_name
			}
		}
	}

func _cmd_set_node_property(params: Dictionary) -> Dictionary:
	var node_path = params.get("node_path", "")
	var property_name = params.get("property_name", "")
	var property_value = params.get("property_value")
	
	if node_path == "" or property_name == "":
		return {"success": false, "error": "node_path and property_name are required"}
	
	var current_scene = editor_interface.get_edited_scene_root()
	if not current_scene:
		return {"success": false, "error": "No scene is currently open"}
	
	var target_node = current_scene.get_node_or_null(node_path)
	if not target_node:
		return {"success": false, "error": "Node not found: " + node_path}
	
	# Set the property
	if target_node.has_method("set_" + property_name):
		target_node.call("set_" + property_name, property_value)
	elif property_name in target_node:
		target_node.set(property_name, property_value)
	else:
		return {"success": false, "error": "Property not found: " + property_name}
	
	return {
		"success": true,
		"data": {
			"node_path": node_path,
			"property_name": property_name,
			"property_value": property_value
		}
	}

func _cmd_get_node_properties(params: Dictionary) -> Dictionary:
	var node_path = params.get("node_path", "")
	
	if node_path == "":
		return {"success": false, "error": "node_path is required"}
	
	var current_scene = editor_interface.get_edited_scene_root()
	if not current_scene:
		return {"success": false, "error": "No scene is currently open"}
	
	var target_node = current_scene.get_node_or_null(node_path)
	if not target_node:
		return {"success": false, "error": "Node not found: " + node_path}
	
	var properties = {}
	var property_list = target_node.get_property_list()
	
	for prop in property_list:
		if prop.usage & PROPERTY_USAGE_EDITOR:
			var prop_name = prop.name
			properties[prop_name] = target_node.get(prop_name)
	
	return {
		"success": true,
		"data": {
			"node_path": node_path,
			"properties": properties
		}
	}

func _cmd_move_node(params: Dictionary) -> Dictionary:
	var node_path = params.get("node_path", "")
	var x = params.get("x", 0.0)
	var y = params.get("y", 0.0)
	var z = params.get("z", null)
	
	if node_path == "":
		return {"success": false, "error": "node_path is required"}
	
	var current_scene = editor_interface.get_edited_scene_root()
	if not current_scene:
		return {"success": false, "error": "No scene is currently open"}
	
	var target_node = current_scene.get_node_or_null(node_path)
	if not target_node:
		return {"success": false, "error": "Node not found: " + node_path}
	
	# Set position based on node type
	if target_node.has_method("set_position"):
		if z != null and target_node.has_method("set_global_position"):
			target_node.global_position = Vector3(x, y, z)
		else:
			target_node.position = Vector2(x, y)
	else:
		return {"success": false, "error": "Node does not support position changes"}
	
	return {
		"success": true,
		"data": {
			"node_path": node_path,
			"new_position": {"x": x, "y": y, "z": z}
		}
	}

func _cmd_save_scene(params: Dictionary) -> Dictionary:
	var file_path = params.get("file_path", "")
	
	var current_scene = editor_interface.get_edited_scene_root()
	if not current_scene:
		return {"success": false, "error": "No scene is currently open"}
	
	var scene_path = ""
	if file_path != "":
		scene_path = file_path
	else:
		scene_path = current_scene.scene_file_path
		if scene_path == "":
			return {"success": false, "error": "Scene has no file path, please specify file_path"}
	
	# Save the scene
	var packed_scene = PackedScene.new()
	packed_scene.pack(current_scene)
	var error = ResourceSaver.save(packed_scene, scene_path)
	
	if error != OK:
		return {"success": false, "error": "Failed to save scene: " + str(error)}
	
	return {
		"success": true,
		"data": {
			"saved_path": scene_path
		}
	}

# Helper functions
func _build_node_tree(node: Node) -> Dictionary:
	var result = {
		"name": node.name,
		"type": node.get_class(),
		"path": _get_node_path(node)
	}
	
	var children = []
	for child in node.get_children():
		children.append(_build_node_tree(child))
	
	if children.size() > 0:
		result["children"] = children
	
	return result

func _collect_nodes(node: Node, nodes: Array, base_path: String):
	nodes.append({
		"path": base_path,
		"type": node.get_class(),
		"name": node.name
	})
	
	for child in node.get_children():
		var child_path = base_path + "/" + child.name
		_collect_nodes(child, nodes, child_path)

func _get_node_path(node: Node) -> String:
	var current_scene = editor_interface.get_edited_scene_root()
	if node == current_scene:
		return node.name
	else:
		return current_scene.get_path_to(node)

func _create_node_by_type(type_name: String) -> Node:
	match type_name:
		"Node": return Node.new()
		"Node2D": return Node2D.new()
		"Node3D": return Node3D.new()
		"Control": return Control.new()
		"Label": return Label.new()
		"Button": return Button.new()
		"VBoxContainer": return VBoxContainer.new()
		"HBoxContainer": return HBoxContainer.new()
		"ColorRect": return ColorRect.new()
		"Sprite2D": return Sprite2D.new()
		"Sprite3D": return Sprite3D.new()
		"RigidBody2D": return RigidBody2D.new()
		"RigidBody3D": return RigidBody3D.new()
		"CharacterBody2D": return CharacterBody2D.new()
		"CharacterBody3D": return CharacterBody3D.new()
		"CollisionShape2D": return CollisionShape2D.new()
		"CollisionShape3D": return CollisionShape3D.new()
		"Area2D": return Area2D.new()
		"Area3D": return Area3D.new()
		"StaticBody2D": return StaticBody2D.new()
		"StaticBody3D": return StaticBody3D.new()
		"Camera2D": return Camera2D.new()
		"Camera3D": return Camera3D.new()
		"AudioStreamPlayer": return AudioStreamPlayer.new()
		"AudioStreamPlayer2D": return AudioStreamPlayer2D.new()
		"AudioStreamPlayer3D": return AudioStreamPlayer3D.new()
		"Timer": return Timer.new()
		"HTTPRequest": return HTTPRequest.new()
		_:
			print("[MCP Client] Unknown node type: ", type_name)
			return null
