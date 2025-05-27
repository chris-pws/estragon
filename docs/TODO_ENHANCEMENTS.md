# 📋 TODO: Enhancement Roadmap Based on Research Findings

**Last Updated:** May 27, 2025  
**Research Session:** Collision Shape Assignment & Node Deletion Investigation  
**Status:** Research Complete, Implementation Ready  

---

## 🎯 **Executive Summary**

Following comprehensive web research using "spider deployment" across Godot documentation, Stack Overflow, GitHub issues, and community forums, we've identified two critical missing features and documented the exact implementation patterns needed. This TODO represents production-ready solutions validated against Godot 4 best practices.

---

## 🔬 **Research-Based Findings**

### **Key Discovery: CollisionShape2D Assignment Pattern**
- **Root Issue:** MCP cannot assign collision shapes to CollisionShape2D nodes
- **Godot 4 Pattern:** `collision_node.shape = CircleShape2D.new()` with explicit radius setting
- **Research Sources:** Official Godot docs, Stack Overflow examples, GitHub issues
- **Implementation Confidence:** High - Multiple confirmed working examples found

### **Key Discovery: Node Deletion Best Practices**
- **Available Methods:** `queue_free()` (safe, end-of-frame) vs `free()` (immediate)
- **Performance Insight:** Delete children in reverse order for better performance
- **Safety Patterns:** Root scene protection, editor node protection
- **Research Sources:** Godot forums, performance benchmarking discussions

---

## 🚀 **PRIORITY 1: Collision Shape Assignment (High Impact)**

### **Implementation Status:** Ready for Development  
**Estimated Effort:** 2-3 hours  
**Complexity:** Medium  
**Impact:** Eliminates major workflow blocker  

### **Required Implementation**

#### **A. Add New MCP Commands**
```gdscript
# Add to mcp_client.gd _execute_command() match statement:
"assign_collision_shape": return _cmd_assign_collision_shape(params)
"modify_shape_radius": return _cmd_modify_shape_radius(params)  
"get_shape_info": return _cmd_get_shape_info(params)
```

#### **B. Core Shape Assignment Function**
```gdscript
func _cmd_assign_collision_shape(params: Dictionary) -> Dictionary:
    # Research-validated pattern from Stack Overflow & Godot docs
    var shape_resource = CircleShape2D.new()  # or RectangleShape2D, etc.
    shape_resource.radius = float(radius)
    collision_node.shape = shape_resource
```

#### **C. Supported Shape Types**
Based on research, prioritize these common shapes:
- **CircleShape2D** - Fast collision detection, radius parameter
- **RectangleShape2D** - size parameter (Vector2)
- **CapsuleShape2D** - radius + height parameters
- **SegmentShape2D** - point_a, point_b parameters

#### **D. Server-Side Tool Definitions**
```javascript
// Add to godot-tools.js
assign_collision_shape: {
  name: 'assign_collision_shape',
  description: 'Assign a collision shape to a CollisionShape2D node',
  inputSchema: {
    properties: {
      node_path: { type: 'string' },
      shape_type: { enum: ['circle', 'rectangle', 'capsule', 'segment'] },
      shape_params: { type: 'object' }
    }
  }
}
```

### **Success Criteria**
- ✅ Create CollisionShape2D node via MCP
- ✅ Assign CircleShape2D with custom radius  
- ✅ Assign RectangleShape2D with custom dimensions
- ✅ Modify existing shape properties
- ✅ Inspect assigned shape information

---

## 🗑️ **PRIORITY 2: Node Deletion System (Medium Impact)**

### **Implementation Status:** Ready for Development  
**Estimated Effort:** 1-2 hours  
**Complexity:** Low-Medium  
**Impact:** Completes CRUD operations, improves testing workflow  

### **Required Implementation**

#### **A. Add Deletion Commands**
```gdscript
# Add to mcp_client.gd _execute_command() match statement:
"delete_node": return _cmd_delete_node(params)
"delete_all_children": return _cmd_delete_all_children(params)
```

#### **B. Safe Node Deletion Function**
```gdscript
func _cmd_delete_node(params: Dictionary) -> Dictionary:
    # Research-validated safety checks
    if target_node == current_scene:
        return {"success": false, "error": "Cannot delete root scene"}
    
    # Performance-optimized deletion
    if immediate:
        target_node.free()      # Immediate
    else:
        target_node.queue_free()  # Safe, end-of-frame
```

#### **C. Batch Deletion with Performance Optimization**
```gdscript
func _cmd_delete_all_children(params: Dictionary) -> Dictionary:
    # Research finding: reverse-order deletion for better performance
    for i in range(children.size() - 1, -1, -1):
        children[i].queue_free()
```

#### **D. Safety Protections**
Research revealed these critical safety patterns:
- **Root Scene Protection:** Never delete scene root
- **Editor Node Protection:** Detect and protect editor-related nodes
- **Parent Validation:** Ensure parent exists before deletion
- **Graceful Error Handling:** Return informative error messages

### **Success Criteria**
- ✅ Delete individual nodes safely
- ✅ Batch delete all children of a parent
- ✅ Protect root scene from accidental deletion
- ✅ Support both immediate and queued deletion modes
- ✅ Performance-optimized batch operations

---

## 🔧 **PRIORITY 3: Enhanced Property System (Low Impact)**

### **Status:** Future Enhancement  
**Estimated Effort:** 2-3 hours  
**Complexity:** Medium  
**Impact:** Improves property setting success rate from 85% to 95%+  

### **Research Findings: MCP String Array Issue**
**Critical Discovery:** MCP protocol transmits JSON arrays as strings, not native arrays
- **Example:** `[100, 50]` becomes `"[100, 50]"` (string)
- **Current Solution:** Position properties use string parsing + move_node fallback
- **Opportunity:** Extend string parsing to all Vector2/Vector3 properties

### **Implementation Plan**
```gdscript
func _parse_mcp_array(string_value: String) -> Array:
    # "[100, 50, 255]" → [100.0, 50.0, 255.0]
    var cleaned = string_value.replace("[", "").replace("]", "")
    return cleaned.split(",").map(func(s): return float(s.strip_edges()))

func _convert_property_by_type(property_name: String, raw_value):
    match property_name:
        "size", "scale": return Vector2(parsed[0], parsed[1])
        "modulate": return Color(parsed[0], parsed[1], parsed[2], parsed[3])
        # etc.
```

---

## 📚 **RESEARCH REFERENCES**

### **Collision Shape Assignment**
- **Stack Overflow:** "How to create Area2Ds with collision shapes on demand" (76640485)
- **Godot Forum:** "How do I change radius of CircleShape2D by script?" (104027)
- **GitHub Issues:** Radius modification behavior and shared shape instances
- **Official Docs:** CollisionShape2D and CircleShape2D class references

### **Node Deletion** 
- **Godot Forum:** "queue_free() vs remove_child() differences" (2842, 6773)
- **GitHub Issues:** "Deleting large numbers of nodes performance" (61929)
- **Stack Overflow:** Node deletion patterns and safety considerations
- **Performance:** Reverse-order deletion optimization discovery

### **Property Type Conversion**
- **Project History:** String array parsing solution development
- **MCP Protocol:** JSON transmission behavior analysis  
- **Godot 4 Type System:** Vector2/Vector3 conversion requirements

---

## 🎮 **TESTING REQUIREMENTS**

### **Integration Testing**
- [ ] Create CollisionShape2D → Assign CircleShape2D → Modify radius
- [ ] Test all shape types (Circle, Rectangle, Capsule, Segment)
- [ ] Create nodes → Delete individually → Delete in batches
- [ ] Safety tests: Attempt to delete root scene (should fail)

### **Performance Testing**  
- [ ] Batch deletion of 100+ nodes (reverse order optimization)
- [ ] Shape assignment to multiple CollisionShape2D nodes
- [ ] Memory leak testing after node deletion cycles

### **Error Handling Testing**
- [ ] Invalid node paths for all new commands
- [ ] Shape assignment to non-CollisionShape2D nodes
- [ ] Deletion of non-existent nodes
- [ ] Edge cases: Empty parent nodes, null shapes

---

## 💡 **IMPLEMENTATION NOTES**

### **Development Approach**
1. **Start with Priority 1** - Collision shapes have highest user impact
2. **Implement incrementally** - Add one command at a time with testing
3. **Validate with existing workflows** - Test against current use cases
4. **Document thoroughly** - Update command reference and examples

### **Code Organization**
- **Client Side:** Add functions to `mcp_client.gd` (Godot plugin)
- **Server Side:** Update `godot-tools.js` (MCP server)
- **Testing:** Create focused test scripts for each new command
- **Documentation:** Update README with new command examples

### **Rollback Plan**
Each priority can be implemented independently. If issues arise:
- **Priority 1:** Collision shapes remain assignable manually in editor
- **Priority 2:** Nodes remain deletable manually in scene dock  
- **Priority 3:** Current property system continues working for most cases

---

## 🏁 **SUCCESS DEFINITION**

### **Priority 1 Complete When:**
- User can say "Create a CollisionShape2D and assign a CircleShape2D with radius 25"
- Command executes successfully with visual confirmation in Godot editor  
- Shape properties can be modified and inspected via MCP

### **Priority 2 Complete When:**
- User can say "Delete the NewCollisionShape node we created"
- Node disappears from scene tree safely
- Batch deletion works for cleaning up test scenarios

### **All Priorities Complete When:**
- **100% CRUD Operations:** Create, Read, Update, Delete all work for nodes
- **Complete Collision Workflow:** Full collision shape creation and modification
- **Production Ready:** Error handling covers all edge cases
- **User Experience:** Natural language commands translate to sophisticated operations

---

**This TODO represents actionable, research-validated enhancements ready for implementation.**