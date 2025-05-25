/**
 * Godot Tool Registry
 * 
 * Defines and manages all available tools for Godot interaction
 */

import { z } from 'zod';

export class GodotToolRegistry {
  constructor(wsManager) {
    this.wsManager = wsManager;
    this.tools = this.initializeTools();
  }

  initializeTools() {
    return {
      // Scene inspection tools
      get_scene_tree: {
        name: 'get_scene_tree',
        description: 'Get the current scene tree structure with all nodes and their properties',
        inputSchema: {
          type: 'object', 
          properties: {},
          required: [],
        },
      },

      list_nodes: {
        name: 'list_nodes',
        description: 'List all nodes in the current scene with their types and basic info',
        inputSchema: {
          type: 'object',
          properties: {
            node_path: {
              type: 'string',
              description: 'Optional path to list children of specific node (e.g., "Player/Inventory")',
            },
          },
          required: [],
        },
      },

      // Node creation tools
      create_node: {
        name: 'create_node',
        description: 'Create a new node in the scene',
        inputSchema: {
          type: 'object',
          properties: {
            node_type: {
              type: 'string',
              description: 'Type of node to create (e.g., "Sprite2D", "RigidBody2D", "CollisionShape2D")',
            },
            node_name: {
              type: 'string',
              description: 'Name for the new node',
            },
            parent_path: {
              type: 'string',
              description: 'Path to parent node (empty string for scene root)',
            },
          },
          required: ['node_type', 'node_name'],
        },
      },

      // Node modification tools
      set_node_property: {
        name: 'set_node_property',
        description: 'Set a property value on an existing node',
        inputSchema: {
          type: 'object',
          properties: {
            node_path: {
              type: 'string',
              description: 'Path to the node (e.g., "Player", "Player/Sprite2D")',
            },
            property_name: {
              type: 'string',
              description: 'Name of the property to set (e.g., "position", "rotation", "scale")',
            },
            property_value: {
              description: 'Value to set (will be converted to appropriate Godot type)',
            },
          },
          required: ['node_path', 'property_name', 'property_value'],
        },
      },

      get_node_properties: {
        name: 'get_node_properties',
        description: 'Get all properties of a specific node',
        inputSchema: {
          type: 'object',
          properties: {
            node_path: {
              type: 'string',
              description: 'Path to the node',
            },
          },
          required: ['node_path'],
        },
      },

      // Transform manipulation tools
      move_node: {
        name: 'move_node',
        description: 'Move a node to a new position',
        inputSchema: {
          type: 'object',
          properties: {
            node_path: {
              type: 'string',
              description: 'Path to the node to move',
            },
            x: {
              type: 'number',
              description: 'X coordinate',
            },
            y: {
              type: 'number', 
              description: 'Y coordinate',
            },
            z: {
              type: 'number',
              description: 'Z coordinate (for 3D nodes)',
            },
          },
          required: ['node_path', 'x', 'y'],
        },
      },

      // Project management tools
      save_scene: {
        name: 'save_scene',
        description: 'Save the current scene',
        inputSchema: {
          type: 'object',
          properties: {
            file_path: {
              type: 'string',
              description: 'Optional file path to save as (uses current scene path if not provided)',
            },
          },
          required: [],
        },
      },

      // Input Map management tools
      add_input_action: {
        name: 'add_input_action',
        description: 'Add a new input action to the InputMap with specified keys',
        inputSchema: {
          type: 'object',
          properties: {
            action_name: {
              type: 'string',
              description: 'Name of the input action (e.g., "move_left", "jump", "attack")',
            },
            keys: {
              type: 'array',
              description: 'Array of keys to bind to this action (e.g., ["W", "KEY_UP"] or [87, 265])',
              items: {
                oneOf: [
                  { type: 'string' },
                  { type: 'integer' }
                ]
              }
            },
            deadzone: {
              type: 'number',
              description: 'Deadzone value for analog inputs (default: 0.2)',
              default: 0.2
            },
            persistent: {
              type: 'boolean',
              description: 'Whether to save this action to project settings (default: false)',
              default: false
            }
          },
          required: ['action_name', 'keys'],
        },
      },

      remove_input_action: {
        name: 'remove_input_action',
        description: 'Remove an input action from the InputMap',
        inputSchema: {
          type: 'object',
          properties: {
            action_name: {
              type: 'string',
              description: 'Name of the input action to remove',
            },
            persistent: {
              type: 'boolean',
              description: 'Whether to also remove from project settings (default: false)',
              default: false
            }
          },
          required: ['action_name'],
        },
      },

      list_input_actions: {
        name: 'list_input_actions',
        description: 'List all current input actions and their key bindings',
        inputSchema: {
          type: 'object',
          properties: {
            include_persistent: {
              type: 'boolean',
              description: 'Whether to include persistent project settings info (default: true)',
              default: true
            }
          },
          required: [],
        },
      },

      // Collision shape creation tool
      create_collision_shape: {
        name: 'create_collision_shape',
        description: 'Create a collision shape resource for a CollisionShape2D node',
        inputSchema: {
          type: 'object',
          properties: {
            node_path: {
              type: 'string',
              description: 'Path to the CollisionShape2D node (e.g., "Player/CollisionShape")',
            },
            shape_type: {
              type: 'string',
              description: 'Type of collision shape to create',
              enum: ['circle', 'rectangle', 'rect', 'capsule', 'segment'],
              default: 'circle'
            },
            shape_params: {
              type: 'object',
              description: 'Parameters for the collision shape',
              properties: {
                radius: {
                  type: 'number',
                  description: 'Radius for circle/capsule shapes (default: 16.0)'
                },
                width: {
                  type: 'number',
                  description: 'Width for rectangle shapes (default: 32.0)'
                },
                height: {
                  type: 'number',
                  description: 'Height for rectangle/capsule shapes (default: 32.0)'
                },
                point_a: {
                  type: 'array',
                  description: 'First point for segment shape [x, y] (default: [0, -16])'
                },
                point_b: {
                  type: 'array',
                  description: 'Second point for segment shape [x, y] (default: [0, 16])'
                }
              }
            }
          },
          required: ['node_path'],
        },
      },
    };
  }

  getToolDefinitions() {
    return Object.values(this.tools);
  }

  async executeTool(toolName, args) {
    if (!this.tools[toolName]) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    if (!this.wsManager.isConnected()) {
      throw new Error('Godot editor is not connected. Please ensure the MCP plugin is running in Godot.');
    }

    // Validate arguments against schema could go here
    
    try {
      const result = await this.wsManager.sendCommand(toolName, args);
      return {
        success: true,
        tool: toolName,
        result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Failed to execute ${toolName}: ${error.message}`);
    }
  }
}
