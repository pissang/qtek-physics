'use strict';


importScripts('./AmmoEngineConfig.js');
importScripts('../lib/ammo.fast.js');



/********************************************
            Global Objects
 ********************************************/

function PhysicsObject(rigidBody, transform) {
    this.rigidBody = rigidBody || null;
    this.transform = transform || null;
}

var g_objectsList = [];

var g_shapes = {};

// Init
var g_broadphase = new Ammo.btDbvtBroadphase();
var g_collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
var g_dispatcher = new Ammo.btCollisionDispatcher(g_collisionConfiguration);
var g_solver = new Ammo.btSequentialImpulseConstraintSolver();
var g_world = new Ammo.btDiscreteDynamicsWorld(g_dispatcher, g_broadphase, g_solver, g_collisionConfiguration);

onmessage = function(e) {

    var buffer = new Float32Array(e.data);
    
    var nChunk = buffer[0];

    var offset = 1;
    for (var i = 0; i < nChunk; i++) {
        var cmdType = buffer[offset++];
        // Dispatch
        switch(cmdType) {
            case CMD_ADD_RIGIDBODY:
                offset = cmd_AddRigidBody(buffer, offset);
                break;
            case CMD_REMOVE_RIGIDBODY:
                offset = cmd_RemoveRigidBody(buffer, offset);
                break;
            case CMD_MOD_RIGIDBODY:
                offset = cmd_ModRigidBody(buffer, offset);
                break;
            case CMD_STEP:
                cmd_Step(buffer[offset++], buffer[offset++], buffer[offset++]);
                break;
            default:
        }
    }
}

/********************************************
            Buffer Object
 ********************************************/

var g_buffer = {

    array : [],
    offset : 0,

    packScalar : function(scalar) {
        this.array[this.offset++] = scalar;
    },

    packVector2 : function(vector) {
        this.array[this.offset++] = vector.getX();
        this.array[this.offset++] = vector.getY();
    },

    packVector3 : function(vector) {
        this.array[this.offset++] = vector.getX();
        this.array[this.offset++] = vector.getY();
        this.array[this.offset++] = vector.getZ();
    },

    packVector4 : function(vector) {
        this.array[this.offset++] = vector.getX();
        this.array[this.offset++] = vector.getY();
        this.array[this.offset++] = vector.getZ();
        this.array[this.offset++] = vector.getW();
    },

    toFloat32Array : function() {
        this.array.length = this.offset;
        return new Float32Array(this.array);
    }
}

/********************************************
            Util Functions
 ********************************************/

function _unPackVector3(buffer, offset) {
    return new Ammo.btVector3(buffer[offset++], buffer[offset++], buffer[offset]);
}

function _setVector3(vec3, buffer, offset) {
    vec3.setX(buffer[offset++]);
    vec3.setY(buffer[offset++]);
    vec3.setZ(buffer[offset++]);
    return offset;
}

function _setVector4(vec4, buffer, offset) {
    vec4.setX(buffer[offset++]);
    vec4.setY(buffer[offset++]);
    vec4.setZ(buffer[offset++]);
    vec4.setW(buffer[offset++]);
    return offset++
}

function _createShape(buffer, offset) {
    // Shape
    var shapeId = buffer[offset++];
    var shapeType = buffer[offset++];
    var shape = g_shapes[shapeId];
    if (!shape) {
        switch(shapeType) {
            case SHAPE_SPHERE:
                shape = new Ammo.btSphereShape(buffer[offset++]);
                break;
            case SHAPE_BOX:
                shape = new Ammo.btBoxShape(_unPackVector3(buffer, offset));
                offset += 3;
                break;
            case SHAPE_CYLINDER:
                shape = new Ammo.btCylinderShape(_unPackVector3(buffer, offset));
                offset += 3;
                break;
            case SHAPE_CONE:
                shape = new Ammo.btConeShape(buffer[offset++], buffer[offset++]);
                break;
            case SHAPE_CAPSULE:
                shape = new Ammo.btCapsuleShape(buffer[offset++], buffer[offset++]);
                break;
            case SHAPE_CONVEX_TRIANGLE_MESH:
                //TODO
                break;
            case SHAPE_STATIC_PLANE:
                var normal = _unPackVector3(buffer, offset);
                offset+=3;
                shape = new Ammo.btStaticPlaneShape(normal, buffer[offset++]);
                break;
            default:
                throw new Error('Unknown type' + shapeType);
                break;
        }

        g_shapes[shapeId] = shape;
    } else {
        if (shapeType === SHAPE_SPHERE) {
            offset += 1;
        } else if (shapeType === SHAPE_CONVEX_TRIANGLE_MESH) {
            // TODO
        } else {
            offset += 3;
        }
    }

    return [shape, offset];
}

/********************************************
                COMMANDS
 ********************************************/

function cmd_AddRigidBody(buffer, offset) {
    var idx = buffer[offset++];
    var bitMask = buffer[offset++];
    // position(3)
    // rotation(4)
    // linearVelocity(3)
    // angularVelocity(3)
    // linearFactor(3)
    // angularFactor(3)
    // centerOfMass(3)
    // inertia(3)
    // mass(1)
    var collisionFlags = buffer[offset++];

    if (MOTION_STATE_MOD_BIT & bitMask) {
        var origin = new Ammo.btVector3(buffer[offset++], buffer[offset++], buffer[offset++]);
        var quat = new Ammo.btQuaternion(buffer[offset++], buffer[offset++], buffer[offset++], buffer[offset++]);
        var transform = new Ammo.btTransform(quat, origin);
    } else {
        var transform = new Ammo.btTransform();
    }

    var motionState = new Ammo.btDefaultMotionState(transform);

    var linearVelocity;
    var angularVelocity;
    var linearFactor;
    var angularFactor;
    var centerOfMass;
    var localInertia;
    if (RIGID_BODY_PROP_MOD_BIT.linearVelocity & bitMask) {
        linearVelocity = _unPackVector3(buffer, offset);
        offset += 3;
    }
    if (RIGID_BODY_PROP_MOD_BIT.angularVelocity & bitMask) {
        angularVelocity = _unPackVector3(buffer, offset);
        offset += 3;
    }
    if (RIGID_BODY_PROP_MOD_BIT.linearFactor & bitMask) {
        linearFactor = _unPackVector3(buffer, offset);
        offset += 3;
    }
    if (RIGID_BODY_PROP_MOD_BIT.angularFactor & bitMask) {
        angularFactor = _unPackVector3(buffer, offset);
        offset += 3;
    }
    if (RIGID_BODY_PROP_MOD_BIT.centerOfMass & bitMask) {
        // TODO
        // centerOfMass = _unPackVector3(buffer, offset);
        offset += 3;
    }
    if (RIGID_BODY_PROP_MOD_BIT.localInertia & bitMask) {
        localInertia = _unPackVector3(buffer, offset);
        offset += 3;
    }
    var mass = buffer[offset++];

    var res = _createShape(buffer, offset);
    var shape = res[0];
    offset = res[1];

    if (!localInertia) {
        localInertia = new Ammo.btVector3(0, 0, 0);
        if (mass !== 0) { // Is dynamic
            shape.calculateLocalInertia(mass, localInertia);
        }
    }
    var rigidBodyInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, shape, localInertia);
    var rigidBody = new Ammo.btRigidBody(rigidBodyInfo);

    rigidBody.setCollisionFlags(collisionFlags);

    linearVelocity && rigidBody.setLinearVelocity(linearVelocity);
    angularVelocity && rigidBody.setAngularVelocity(angularVelocity);
    linearFactor && rigidBody.setLinearFactor(linearFactor);
    angularFactor && rigidBody.setAngularFactor(angularFactor);

    rigidBody.setFriction(buffer[offset++]);
    rigidBody.setRestitution(buffer[offset++]);

    g_objectsList[idx] = new PhysicsObject(rigidBody, transform);

    g_world.addRigidBody(rigidBody);

    return offset;
}

function cmd_RemoveRigidBody(buffer, offset) {
    var idx = buffer[offset++];
    var obj = g_objectsList[idx];
    g_objectsList[idx] = null;
    g_world.removeRigidBody(obj.rigidBody);
    return offset;
}

function cmd_ModRigidBody(buffer, offset) {
    var idx = buffer[offset++];
    var bitMask = buffer[offset++];

    var obj = g_objectsList[idx];
    var rigidBody = obj.rigidBody;

    if (COLLISION_FLAG_MOD_BIT & bitMask) {
        rigidBody.setCollisionFlags(buffer[offset++]);
    }
    if (MOTION_STATE_MOD_BIT.position & bitMask) {
        var motionState = rigidBody.getMotionState();
        var transform = obj.transform;
        motionState.getWorldTransform(transform);
        offset = _setVector3(transform.getOrigin(), offset);
        offset = _setVector4(transform.getRotation(), offset);
        motionState.setWorldTransform(transform);
    }

    if (RIGID_BODY_PROP_MOD_BIT.linearVelocity & bitMask) {
        offset = _setVector3(rigidBody.getLinearVelocity(), offset);
    }
    if (RIGID_BODY_PROP_MOD_BIT.angularVelocity & bitMask) {
        offset = _setVector3(rigidBody.getAngularVelocity(), offset);
    }
    if (RIGID_BODY_PROP_MOD_BIT.linearFactor & bitMask) {
        offset = _setVector3(rigidBody.getLinearFactor(), offset);
    }
    if (RIGID_BODY_PROP_MOD_BIT.angularFactor & bitMask) {
        offset = _setVector3(rigidBody.getAngularFactor(), offset);
    }
    if (RIGID_BODY_PROP_MOD_BIT.centerOfMass & bitMask) {
        // TODO
        offset += 3;
    }
    if (RIGID_BODY_PROP_MOD_BIT.localInertia & bitMask) {
        // TODO
        offset += 3;
    }
    // TODO
    var mass = buffer[offset++];
    // Shape
    if (SHAPE_MOD_BIT & bitMask) {
        var res = _createShape(buffer, offset);
        var shape = res[0];
        offset = res[1];
        rigidBody.setCollisionShape(shape);
    }
    if (MATERIAL_MOD_BIT & bitMask) {
        rigidBody.setFriction(buffer[offset++]);
        rigidBody.setRestitution(buffer[offset++]);
    }
 
    return offset;
}

function cmd_Step(timeStep, maxSubSteps, fixedTimeStep) {

    g_world.stepSimulation(timeStep, maxSubSteps, fixedTimeStep);
    g_buffer.offset = 0;
    g_buffer.packScalar(CMD_SYNC_MOTION_STATE);

    var nObjects = 0;
    g_buffer.packScalar(nObjects);

    for (var i = 0; i < g_objectsList.length; i++) {
        var obj = g_objectsList[i];
        if (!obj) {
            continue;
        }
        var rigidBody = obj.rigidBody;
        if (rigidBody.isStaticOrKinematicObject()) {
            continue;
        }
        // Idx
        g_buffer.packScalar(i);
        var motionState = rigidBody.getMotionState();
        motionState.getWorldTransform(obj.transform);

        g_buffer.packVector3(obj.transform.getOrigin());
        g_buffer.packVector4(obj.transform.getRotation());
        nObjects++;
    }
    g_buffer.array[1] = nObjects;
    var array = g_buffer.toFloat32Array();
    postMessage(array.buffer, [array.buffer]);
}