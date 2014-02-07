'use strict';

// importScripts('./AmmoEngineConfig.js');
// importScripts('../lib/ammo.fast.js');

/********************************************
            Global Objects
 ********************************************/

function PhysicsObject(collisionObject, transform) {

    this.__idx__ = 0;

    this.collisionObject = collisionObject || null;
    this.transform = transform || null;

    this.collisionStatus = [];

    this.isGhostObject = false;
    this.hasCallback = false;
}

var g_objectsList = [];
var g_shapes = {};
    
// Map to store the ammo objects which key is the ptr of body
var g_ammoPtrIdxMap = {};

// Init
var g_broadphase = new Ammo.btDbvtBroadphase();
var g_collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
var g_dispatcher = new Ammo.btCollisionDispatcher(g_collisionConfiguration);
var g_solver = new Ammo.btSequentialImpulseConstraintSolver();
var g_world = new Ammo.btDiscreteDynamicsWorld(g_dispatcher, g_broadphase, g_solver, g_collisionConfiguration);
g_world.setGravity(new Ammo.btVector3(0, -10, 0));
var g_ghostPairCallback = null;

/********************************************
            Buffer Object
 ********************************************/

 function g_Buffer() {

    this.array = [];
    this.offset = 0;
}

g_Buffer.prototype = {

    constructor : g_Buffer,
    
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

    packMatrix3x3 : function(m3x3) {
        this.packVector3(m3x3.getColumn(0));
        this.packVector3(m3x3.getColumn(1));
        this.packVector3(m3x3.getColumn(2));
    },

    toFloat32Array : function() {
        this.array.length = this.offset;
        return new Float32Array(this.array);
    }
}

var g_stepBuffer = new g_Buffer();
var g_inertiaTensorBuffer = new g_Buffer();
var g_rayTestBuffer = new g_Buffer();


/********************************************
            Message Dispatcher
 ********************************************/

onmessage = function(e) {

    var buffer = new Float32Array(e.data);
    
    var nChunk = buffer[0];

    var offset = 1;
    var haveStep = false;
    var stepTime, maxSubSteps, fixedTimeStep;
    var addedCollisonObjects = [];
    for (var i = 0; i < nChunk; i++) {
        var cmdType = buffer[offset++];
        // Dispatch
        switch(cmdType) {
            case CMD_ADD_COLLIDER:
                offset = cmd_AddCollisionObject(buffer, offset, addedCollisonObjects);
                break;
            case CMD_REMOVE_COLLIDER:
                offset = cmd_RemoveCollisionObject(buffer, offset);
                break;
            case CMD_MOD_COLLIDER:
                offset = cmd_ModCollisionObject(buffer, offset);
                break;
            case CMD_STEP:
                haveStep = true;
                stepTime = buffer[offset++];
                maxSubSteps = buffer[offset++];
                fixedTimeStep = buffer[offset++];
                break;
            case CMD_RAYTEST_ALL:
            case CMD_RAYTEST_CLOSEST:
                offset = cmd_Raytest(buffer, offset, cmdType === CMD_RAYTEST_CLOSEST);
                break;
            default:
        }
    }

    // Sync back inertia tensor
    // Calculating torque needs this stuff
    if (addedCollisonObjects.length > 0) { 
        g_inertiaTensorBuffer.offset = 0;
        g_inertiaTensorBuffer.packScalar(1); // nChunk
        g_inertiaTensorBuffer.packScalar(CMD_SYNC_INERTIA_TENSOR);   // Command
        g_inertiaTensorBuffer.packScalar(0); // nBody
        var nBody = 0;
        for (var i = 0; i < addedCollisonObjects.length; i++) {
            var co = addedCollisonObjects[i];
            var body = co.collisionObject;
            if (body.getInvInertiaTensorWorld) {
                var m3x3 = body.getInvInertiaTensorWorld();
                g_inertiaTensorBuffer.packScalar(co.__idx__);
                g_inertiaTensorBuffer.packMatrix3x3(m3x3);
                nBody++;
            }
        }
        g_inertiaTensorBuffer.array[2] = nBody;
        var array = g_inertiaTensorBuffer.toFloat32Array();
        postMessage(array.buffer, [array.buffer]);
    }

    // Lazy execute
    if (haveStep) {
        g_stepBuffer.offset = 0;
        cmd_Step(stepTime, maxSubSteps, fixedTimeStep);
    }
}

/********************************************
            Util Functions
 ********************************************/

function _unPackVector3(buffer, offset) {
    return new Ammo.btVector3(buffer[offset++], buffer[offset++], buffer[offset]);
}

function _setVector3(vec, buffer, offset) {
    vec.setValue(buffer[offset++], buffer[offset++], buffer[offset++]);
    return offset;
}

function _setVector4(vec, buffer, offset) {
    vec.setValue(buffer[offset++], buffer[offset++], buffer[offset++], buffer[offset++]);
    return offset;
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
            case SHAPE_BVH_TRIANGLE_MESH:
                var nTriangles = buffer[offset++];
                var nVertices = buffer[offset++];
                var indexStride = 3 * 4;
                var vertexStride = 3 * 4;
                
                var triangleIndices = buffer.subarray(offset, offset + nTriangles * 3);
                offset += nTriangles * 3;
                var indicesPtr = Ammo.allocate(indexStride * nTriangles, 'i32', Ammo.ALLOC_NORMAL);
                for (var i = 0; i < triangleIndices.length; i++) {
                    Ammo.setValue(indicesPtr + i * 4, triangleIndices[i], 'i32');
                }

                var vertices = buffer.subarray(offset, offset + nVertices * 3);
                offset += nVertices * 3;
                var verticesPtr = Ammo.allocate(vertexStride * nVertices, 'float', Ammo.ALLOC_NORMAL);
                for (var i = 0; i < vertices.length; i++) {
                    Ammo.setValue(verticesPtr + i * 4, vertices[i], 'float');
                }

                var indexVertexArray = new Ammo.btTriangleIndexVertexArray(nTriangles, indicesPtr, indexStride, nVertices, verticesPtr, vertexStride);
                // TODO Cal AABB ?
                if (shapeType === SHAPE_CONVEX_TRIANGLE_MESH) {
                    shape = new Ammo.btConvexTriangleMeshShape(indexVertexArray, true);
                } else {
                    shape = new Ammo.btBvhTriangleMeshShape(indexVertexArray, true, true);
                }
                break;
            case SHAPE_CONVEX_HULL:
                var nPoints = buffer[offset++];
                var stride = 3 * 4;
                var points = buffer.subarray(offset, offset + nPoints * 3);
                offset += nPoints * 3;
                var pointsPtr = Ammo.allocate(stride * nPoints, 'float', Ammo.ALLOC_NORMAL);
                for (var i = 0; i < points.length; i++) {
                    Ammo.setValue(pointsPtr + i * 4, points[i], 'float');
                }

                shape = new Ammo.btConvexHullShape(pointsPtr, nPoints, stride);
                break;
            case SHAPE_STATIC_PLANE:
                var normal = _unPackVector3(buffer, offset);
                offset+=3;
                shape = new Ammo.btStaticPlaneShape(normal, buffer[offset++]);
                break;
            default:
                throw new Error('Unknown type ' + shapeType);
                break;
        }

        g_shapes[shapeId] = shape;
    } else {
        switch(shapeType) {
            case SHAPE_SPHERE:
                offset++;
                break;
            case SHAPE_BOX:
            case SHAPE_CYLINDER:
                offset += 3;
                break;
            case SHAPE_CONE:
            case SHAPE_CAPSULE:
                offset += 2;
                break;
            case SHAPE_CONVEX_TRIANGLE_MESH:
            case SHAPE_BVH_TRIANGLE_MESH:
                var nTriangles = buffer[offset++];
                var nVertices = buffer[offset++];
                offset += nTriangles * 3 + nVertices * 3;
                break;
            case SHAPE_CONVEX_HULL:
                var nPoints = buffer[offset++];
                offset += nPoints * 3;
                break;
            case SHAPE_STATIC_PLANE:
                offset += 4;
                break;
            default:
                throw new Error('Unknown type ' + shapeType);
                break;
        }
    }

    return [shape, offset];
}

/********************************************
                COMMANDS
 ********************************************/

function cmd_AddCollisionObject(buffer, offset, out) {
    var idx = buffer[offset++];
    var bitMask = buffer[offset++];

    var collisionFlags = buffer[offset++];
    var isGhostObject = COLLISION_FLAG_GHOST_OBJECT & collisionFlags;
    var hasCallback = COLLISION_FLAG_HAS_CALLBACK & collisionFlags;

    var group = buffer[offset++];
    var collisionMask = buffer[offset++];

    if (MOTION_STATE_MOD_BIT & bitMask) {
        var origin = new Ammo.btVector3(buffer[offset++], buffer[offset++], buffer[offset++]);
        var quat = new Ammo.btQuaternion(buffer[offset++], buffer[offset++], buffer[offset++], buffer[offset++]);
        var transform = new Ammo.btTransform(quat, origin);
    } else {
        var transform = new Ammo.btTransform();
    }

    if (!isGhostObject) {
        var motionState = new Ammo.btDefaultMotionState(transform);

        if (RIGID_BODY_PROP_MOD_BIT.linearVelocity & bitMask) {
            var linearVelocity = _unPackVector3(buffer, offset);
            offset += 3;
        }
        if (RIGID_BODY_PROP_MOD_BIT.angularVelocity & bitMask) {
            var angularVelocity = _unPackVector3(buffer, offset);
            offset += 3;
        }
        if (RIGID_BODY_PROP_MOD_BIT.linearFactor & bitMask) {
            var linearFactor = _unPackVector3(buffer, offset);
            offset += 3;
        }
        if (RIGID_BODY_PROP_MOD_BIT.angularFactor & bitMask) {
            var angularFactor = _unPackVector3(buffer, offset);
            offset += 3;
        }
        if (RIGID_BODY_PROP_MOD_BIT.centerOfMass & bitMask) {
            // TODO
            // centerOfMass = _unPackVector3(buffer, offset);
            offset += 3;
        }
        if (RIGID_BODY_PROP_MOD_BIT.localInertia & bitMask) {
            var localInertia = _unPackVector3(buffer, offset);
            offset += 3;
        }
        if (RIGID_BODY_PROP_MOD_BIT.massAndDamping & bitMask) {
            var massAndDamping = _unPackVector3(buffer, offset);
            offset += 3;
        }
        if (RIGID_BODY_PROP_MOD_BIT.totalForce & bitMask) {
            var totalForce = _unPackVector3(buffer, offset);
            offset += 3;
        }
        if (RIGID_BODY_PROP_MOD_BIT.totalTorque & bitMask) {
            var totalTorque = _unPackVector3(buffer, offset);
            offset += 3;
        }
    }

    var res = _createShape(buffer, offset);
    var shape = res[0];
    offset = res[1];

    if (massAndDamping) {
        var mass = massAndDamping.getX();
    } else {
        var mass = 0;
    }

    var physicsObject;
    if (!isGhostObject) {
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
        if (massAndDamping) {
            rigidBody.setDamping(massAndDamping.getY(), massAndDamping.getZ());
        }
        totalForce && rigidBody.applyCentralForce(totalForce);
        totalTorque && rigidBody.applyTorque(totalTorque);

        rigidBody.setFriction(buffer[offset++]);
        rigidBody.setRestitution(buffer[offset++]);

        physicsObject = new PhysicsObject(rigidBody, transform);
        physicsObject.hasCallback = hasCallback;
        g_objectsList[idx] = physicsObject;
        g_ammoPtrIdxMap[rigidBody.ptr] = idx;
        // TODO
        // g_world.addRigidBody(rigidBody, group, collisionMask);
        g_world.addRigidBody(rigidBody);
    } else {
        // TODO What's the difference of Pair Caching Ghost Object ?
        var ghostObject = new Ammo.btPairCachingGhostObject();
        ghostObject.setCollisionShape(shape);
        ghostObject.setWorldTransform(transform);

        physicsObject = new PhysicsObject(ghostObject, transform);
        physicsObject.hasCallback = hasCallback;
        physicsObject.isGhostObject = true;
        g_objectsList[idx] = physicsObject;
        // TODO
        // g_world.addCollisionObject(ghostObject, group, collisionMask);
        g_world.addCollisionObject(ghostObject);

        g_ammoPtrIdxMap[ghostObject.ptr] = idx;
        // TODO
        if (!g_ghostPairCallback) {
            g_ghostPairCallback = new Ammo.btGhostPairCallback();
            g_world.getPairCache().setInternalGhostPairCallback(g_ghostPairCallback);
        }
    }

    physicsObject.__idx__ = idx;
    out.push(physicsObject);

    return offset;
}


// TODO destroy ?
function cmd_RemoveCollisionObject(buffer, offset) {
    var idx = buffer[offset++];
    var obj = g_objectsList[idx];
    g_objectsList[idx] = null;
    if (obj.isGhostObject) {
        g_world.removeCollisionObject(obj.collisionObject);
    } else {
        g_world.removeRigidBody(obj.collisionObject);
    }
    return offset;
}

function cmd_ModCollisionObject(buffer, offset) {
    var idx = buffer[offset++];
    var bitMask = buffer[offset++];

    var obj = g_objectsList[idx];
    var collisionObject = obj.collisionObject;
    var bodyNeedsActive = false;

    if (COLLISION_FLAG_MOD_BIT & bitMask) {
        var collisionFlags = buffer[offset++];
        collisionObject.setCollisionFlags(collisionFlags);

        obj.hasCallback = collisionFlags & COLLISION_FLAG_HAS_CALLBACK;
        obj.isGhostObject = collisionFlags & COLLISION_FLAG_GHOST_OBJECT;
    }
    if (MOTION_STATE_MOD_BIT & bitMask) {
        var motionState = collisionObject.getMotionState();
        var transform = obj.transform;
        motionState.getWorldTransform(transform);
        offset = _setVector3(transform.getOrigin(), buffer, offset);
        offset = _setVector4(transform.getRotation(), buffer, offset);
        motionState.setWorldTransform(transform);
    }

    if (RIGID_BODY_PROP_MOD_BIT.linearVelocity & bitMask) {
        offset = _setVector3(collisionObject.getLinearVelocity(), buffer, offset);
        bodyNeedsActive = true;
    }
    if (RIGID_BODY_PROP_MOD_BIT.angularVelocity & bitMask) {
        offset = _setVector3(collisionObject.getAngularVelocity(), buffer, offset);
        bodyNeedsActive = true;
    }
    if (RIGID_BODY_PROP_MOD_BIT.linearFactor & bitMask) {
        offset = _setVector3(collisionObject.getLinearFactor(), buffer, offset);
    }
    if (RIGID_BODY_PROP_MOD_BIT.angularFactor & bitMask) {
        offset = _setVector3(collisionObject.getAngularFactor(), buffer, offset);
    }
    if (RIGID_BODY_PROP_MOD_BIT.centerOfMass & bitMask) {
        // TODO
        offset += 3;
    }
    if (RIGID_BODY_PROP_MOD_BIT.localInertia & bitMask) {
        // TODO
        offset += 3;
    }
    if (RIGID_BODY_PROP_MOD_BIT.massAndDamping & bitMask) {
        // TODO MASS
        var mass = buffer[offset++];
        collisionObject.setDamping(buffer[offset++], buffer[offset++]);
    }
    if (RIGID_BODY_PROP_MOD_BIT.totalForce & bitMask) {
        offset = _setVector3(collisionObject.getTotalForce(), buffer, offset);
        bodyNeedsActive = true;
    }
    if (RIGID_BODY_PROP_MOD_BIT.totalTorque & bitMask) {
        offset = _setVector3(collisionObject.getTotalTorque(), buffer, offset);
        bodyNeedsActive = true;
    }

    if (bodyNeedsActive) {
        collisionObject.activate();
    }

    // Shape
    if (SHAPE_MOD_BIT & bitMask) {
        var res = _createShape(buffer, offset);
        var shape = res[0];
        offset = res[1];
        collisionObject.setCollisionShape(shape);
    }
    if (MATERIAL_MOD_BIT & bitMask) {
        collisionObject.setFriction(buffer[offset++]);
        collisionObject.setRestitution(buffer[offset++]);
    }
 
    return offset;
}

function cmd_Step(timeStep, maxSubSteps, fixedTimeStep) {

    var startTime = new Date().getTime();
    g_world.stepSimulation(timeStep, maxSubSteps, fixedTimeStep);
    var stepTime = new Date().getTime() - startTime;

    var nChunk = 3;
    g_stepBuffer.packScalar(nChunk);

    // Sync Motion State
    g_stepBuffer.packScalar(CMD_SYNC_MOTION_STATE);
    var nObjects = 0;
    var nObjectsOffset = g_stepBuffer.offset;
    g_stepBuffer.packScalar(nObjects);

    for (var i = 0; i < g_objectsList.length; i++) {
        var obj = g_objectsList[i];
        if (!obj) {
            continue;
        }
        var collisionObject = obj.collisionObject;
        if (collisionObject.isStaticOrKinematicObject()) {
            continue;
        }
        // Idx
        g_stepBuffer.packScalar(i);
        var motionState = collisionObject.getMotionState();
        motionState.getWorldTransform(obj.transform);

        g_stepBuffer.packVector3(obj.transform.getOrigin());
        g_stepBuffer.packVector4(obj.transform.getRotation());
        nObjects++;
    }
    g_stepBuffer.array[nObjectsOffset] = nObjects;

    // Return step time
    g_stepBuffer.packScalar(CMD_STEP_TIME);
    g_stepBuffer.packScalar(stepTime);

    // Tick callback
    _tickCallback(g_world);

    var array = g_stepBuffer.toFloat32Array();

    postMessage(array.buffer, [array.buffer]);
}

// nmanifolds - [idxA - idxB - ncontacts - [pA - pB - normal]... ]...
function _tickCallback(world) {

    g_stepBuffer.packScalar(CMD_COLLISION_CALLBACK);

    var nManifolds = g_dispatcher.getNumManifolds();
    var nCollision = 0;
    var tickCmdOffset = g_stepBuffer.offset;
    g_stepBuffer.packScalar(0);  //nManifolds place holder

    for (var i = 0; i < nManifolds; i++) {
        var contactManifold = g_dispatcher.getManifoldByIndexInternal(i);
        var obAPtr = contactManifold.getBody0();
        var obBPtr = contactManifold.getBody1();

        var nContacts = contactManifold.getNumContacts();

        if (nContacts > 0) {
            var obAIdx = g_ammoPtrIdxMap[obAPtr];
            var obBIdx = g_ammoPtrIdxMap[obBPtr];

            var obA = g_objectsList[obAIdx];
            var obB = g_objectsList[obBIdx];

            if (obA.hasCallback || obB.hasCallback) {
                var chunkStartOffset = g_stepBuffer.offset;
                if (_packContactManifold(contactManifold, chunkStartOffset, obAIdx, obBIdx)) {
                    nCollision++;
                }
            }
        }
    }

    g_stepBuffer.array[tickCmdOffset] = nCollision;
}

function _packContactManifold(contactManifold, offset, obAIdx, obBIdx) {
    // place holder for idxA, idxB, nContacts
    g_stepBuffer.offset += 3;
    var nActualContacts = 0;
    var nContacts = contactManifold.getNumContacts();
    for (var j = 0; j < nContacts; j++) {
        var cp = contactManifold.getContactPoint(j);

        if (cp.getDistance() <= 0) {
            var pA = cp.getPositionWorldOnA();
            var pB = cp.getPositionWorldOnB();
            var normal = cp.get_m_normalWorldOnB();

            g_stepBuffer.packVector3(pA);
            g_stepBuffer.packVector3(pB);
            g_stepBuffer.packVector3(normal);
            nActualContacts++;
        }
    }

    if (nActualContacts > 0) {
        g_stepBuffer.array[offset] = obAIdx;
        g_stepBuffer.array[offset+1] = obBIdx;
        g_stepBuffer.array[offset+2] = nActualContacts;

        return true;
    } else {
        g_stepBuffer.offset -= 3;
        return false;
    }
}

var rayStart = new Ammo.btVector3();
var rayEnd = new Ammo.btVector3();
function cmd_Raytest(buffer, offset, isClosest) {
    var cbIdx = buffer[offset++];
    rayStart.setValue(buffer[offset++], buffer[offset++], buffer[offset++]);
    rayEnd.setValue(buffer[offset++], buffer[offset++], buffer[offset++]);

    g_rayTestBuffer.offset = 0;
    g_rayTestBuffer.packScalar(1);
    g_rayTestBuffer.packScalar(isClosest ? CMD_RAYTEST_CLOSEST : CMD_RAYTEST_ALL);
    g_rayTestBuffer.packScalar(cbIdx);

    if (isClosest) {
        var callback = new Module.ClosestRayResultCallback(rayStart, rayEnd);
        var colliderIdx = -1;
        g_world.rayTest(rayStart, rayEnd, callback);
        if (callback.hasHit()) {
            var co = callback.get_m_collisionObject();
            colliderIdx = g_ammoPtrIdxMap[co.ptr];
            g_rayTestBuffer.packScalar(colliderIdx);
            // hit point
            g_rayTestBuffer.packVector3(callback.get_m_hitPointWorld());
            // hit normal
            g_rayTestBuffer.packVector3(callback.get_m_hitNormalWorld());
        }

        var array = g_rayTestBuffer.toFloat32Array();
        postMessage(array.buffer, [array.buffer]);
    } else {
        var callback = new Module.AllHitsRayResultCallback(rayStart, rayEnd);
        g_world.rayTest(rayStart, rayEnd, callback);
        if (callback.hasHit()) {
            // TODO
        }
    }

    return offset;
}