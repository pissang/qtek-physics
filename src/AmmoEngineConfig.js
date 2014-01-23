'use strict';

// Data format
// Command are transferred in batches
// ncmd - [cmd chunk][cmd chunk]...
// Add rigid body :
//      ------header------ 
//      cmdtype(1)
//      idx(1)
//      32 bit mask(1)
//          But because it is stored in Float, so it can only use at most 24 bit (TODO)
//      -------body-------
//      collision flag(1)
//      ...
//      collision shape guid(1)
//      shape type(1)
//      ...
// Remove rigid body:
//      cmdtype(1)
//      idx(1)
//      
// Mod rigid body :
//      ------header------
//      cmdtype(1)
//      idx(1)
//      32 bit mask(1)
//      -------body-------
//      ...
//      
// Step
//      cmdtype(1)
//      timeStep(1)
//      maxSubSteps(1)
//      fixedTimeStep(1)
this.CMD_ADD_COLLIDER = 0;
this.CMD_REMOVE_COLLIDER = 1;
this.CMD_MOD_COLLIDER = 2;
this.CMD_SYNC_MOTION_STATE = 3;
this.CMD_STEP_TIME = 4;
this.CMD_COLLISION_CALLBACK = 5;

this.CMD_SYNC_INERTIA_TENSOR = 6;

// Message of step
this.CMD_STEP = 10;

// Shape types
this.SHAPE_BOX = 0;
this.SHAPE_SPHERE = 1;
this.SHAPE_CYLINDER = 2;
this.SHAPE_CONE = 3;
this.SHAPE_CAPSULE = 4;
this.SHAPE_CONVEX_TRIANGLE_MESH = 5;
this.SHAPE_CONVEX_HULL = 6;
this.SHAPE_STATIC_PLANE = 7;
this.SHAPE_BVH_TRIANGLE_MESH = 8;

// Rigid Body properties and bit mask
// 1. Property name
// 2. Property size
// 3. Mod bit mask, to check if part of rigid body needs update
this.RIGID_BODY_PROPS = [
    ['linearVelocity', 3, 0x1],
    ['angularVelocity', 3, 0x2],
    ['linearFactor', 3, 0x4],
    ['angularFactor', 3, 0x8],
    ['centerOfMass', 3, 0x10],
    ['localInertia', 3, 0x20],
    ['massAndDamping', 3, 0x40],
    ['totalForce', 3, 0x80],
    ['totalTorque', 3, 0x100]
];

this.RIGID_BODY_PROP_MOD_BIT = {};
this.RIGID_BODY_PROPS.forEach(function(item) {
    this.RIGID_BODY_PROP_MOD_BIT[item[0]] = item[2];
}, this);

this.SHAPE_MOD_BIT = 0x200;
this.MATERIAL_MOD_BIT = 0x400;
this.COLLISION_FLAG_MOD_BIT = 0x800;

this.MOTION_STATE_MOD_BIT = 0x1000;

this.MATERIAL_PROPS = [
    ['friction', 1],
    ['bounciness', 1],
];

// Collision Flags
this.COLLISION_FLAG_STATIC = 0x1;
this.COLLISION_FLAG_KINEMATIC = 0x2;
this.COLLISION_FLAG_GHOST_OBJECT = 0x4;

this.COLLISION_FLAG_HAS_CALLBACK = 0x200;

// Collision Status
this.COLLISION_STATUS_ENTER = 1;
this.COLLISION_STATUS_STAY = 2;
this.COLLISION_STATUS_LEAVE = 3;
