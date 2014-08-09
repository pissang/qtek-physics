// Ammo.js adapter
// https://github.com/kripken/ammo.js
define(function(require) {

    'use strict';

    var Base = require('qtek/core/Base');
    var util = require('qtek/core/util');
    var configStr = require('text!./AmmoEngineConfig.js');
    // Using inline web worker
    // http://www.html5rocks.com/en/tutorials/workers/basics/#toc-inlineworkers
    // Put the script together instead of using importScripts
    var workerScript = require('text!./AmmoEngineWorker.js');
    var finalWorkerScript = [configStr, workerScript].join('\n');
    var workerBlob = new Blob([finalWorkerScript]);
    // Undefine the module and release the memory
    finalWorkerScript = null;
    workerScript = null;

    var BoxShape = require('./shape/Box');
    var CapsuleShape = require('./shape/Capsule');
    var ConeShape = require('./shape/Cone');
    var CylinderShape = require('./shape/Cylinder');
    var SphereShape = require('./shape/Sphere');
    var StaticPlaneShape = require('./shape/StaticPlane');
    var ConvexTriangleMeshShape = require('./shape/ConvexTriangleMesh');
    var BvhTriangleMeshShape = require('./shape/BvhTriangleMesh');
    var ConvexHullShape = require('./shape/ConvexHull');
    var CompoundShape = require('./shape/Compound');
    var QBuffer  = require('./Buffer');
    var QPool = require('./Pool');
    var ContactPoint = require('./ContactPoint');

    var Vector3 = require('qtek/math/Vector3');

    var ConfigCtor = new Function(configStr);
    var config = new ConfigCtor();

    var Engine = Base.derive(function() {

        return {

            ammoUrl : '',

            gravity : new Vector3(0, -10, 0),

            maxSubSteps : 3,

            fixedTimeStep : 1 / 60,

            _stepTime : 0,

            _isWorkerInited : false,
            _isWorkerFree : true,
            _accumalatedTime : 0,

            _colliders : new QPool(),

            _collidersToAdd : [],
            _collidersToRemove : [],

            _contacts : [],

            _callbacks : new QPool(),

            _cmdBuffer : new QBuffer(),

            _rayTestBuffer : new QBuffer()
        }

    }, {

        init : function() {
            var workerBlobUrl = window.URL.createObjectURL(workerBlob);
            this._engineWorker = new Worker(workerBlobUrl);
            // TODO more robust
            var ammoUrl = this.ammoUrl;
            if (ammoUrl.indexOf('http') != 0) {
                ammoUrl = util.relative2absolute(this.ammoUrl, window.location.href.split('/').slice(0, -1).join('/'));
            }
            this._engineWorker.postMessage({
                __init__ : true,
                ammoUrl : ammoUrl,
                gravity : [this.gravity.x, this.gravity.y, this.gravity.z]
            });

            var self = this;

            this._engineWorker.onmessage = function(e) {
                if (e.data.__init__) {
                    self._isWorkerInited = true;
                    return;
                }

                var buffer = new Float32Array(e.data);

                var nChunk = buffer[0];
                var offset = 1;
                for (var i = 0; i < nChunk; i++) {
                    var cmdType = buffer[offset++];

                    switch(cmdType) {
                        case config.CMD_SYNC_MOTION_STATE:
                            offset = self._syncMotionState(buffer, offset);
                            break;
                        case config.CMD_STEP_TIME:
                            self._stepTime = buffer[offset++];
                            // console.log(self._stepTime);
                            break;
                        case config.CMD_COLLISION_CALLBACK:
                            offset = self._dispatchCollisionCallback(buffer, offset);
                            break;
                        case config.CMD_SYNC_INERTIA_TENSOR:
                            offset = self._syncInertiaTensor(buffer, offset);
                            break;
                        case config.CMD_RAYTEST_ALL:
                        case config.CMD_RAYTEST_CLOSEST:
                            offset = self._rayTestCallback(buffer, offset, cmdType === config.CMD_RAYTEST_CLOSEST);
                            break;
                        default:
                    }
                }

                self._isWorkerFree = true;

                self.trigger('afterstep');
            }
        },

        step : function(timeStep) {
            if (!this._isWorkerInited) {
                return;
            }
            // Wait until the worker is free to use
            if (!this._isWorkerFree) {
                this._accumalatedTime += timeStep;
                return;
            } else {
                this._accumalatedTime = timeStep;
            }

            var nChunk = 0;
            this._cmdBuffer.setOffset(0);
            this._cmdBuffer.packScalar(0);

            nChunk += this._doModCollider();
            nChunk += this._doRemoveCollider();
            nChunk += this._doAddCollider();

            // Step
            this._cmdBuffer.packValues(config.CMD_STEP, this._accumalatedTime, this.maxSubSteps, this.fixedTimeStep);
            nChunk++;

            this._cmdBuffer.set(0, nChunk);

            // For example, when transferring an ArrayBuffer from your main app to Worker, the original ArrayBuffer is cleared and no longer usable
            var array = this._cmdBuffer.toFloat32Array();
            this._engineWorker.postMessage(array.buffer, [array.buffer]);

            // Clear forces at the end of each step
            // http://bulletphysics.org/Bullet/phpBB3/viewtopic.php?t=8622
            var colliders = this._colliders.getAll();
            for (var i = 0; i < colliders.length; i++) {
                var collider = colliders[i];
                if (collider === null) {
                    continue;
                }
                // TODO isKnematic ??? 
                if (!(collider.isStatic || collider.isKinematic || collider.isGhostObject)) {
                    var body = collider.collisionObject;
                    body.totalForce._array[0] = 0;
                    body.totalForce._array[1] = 0;
                    body.totalForce._array[2] = 0;
                    body.totalTorque._array[0] = 0;
                    body.totalTorque._array[1] = 0;
                    body.totalTorque._array[2] = 0;
                }
            }

            this._isWorkerFree = false;
        },

        addCollider : function(collider) {
            this._collidersToAdd.push(collider);
        },

        removeCollider : function(collider) {
            var idx = this._colliders.getIndex(collider);
            if (idx >= 0) {
                this._collidersToRemove.push(idx);
            }
        },

        rayTest : function(start, end, callback, closest) {
            var idx = this._callbacks.add(callback);
            this._rayTestBuffer.setOffset(0);
            this._rayTestBuffer.packScalar(1);  // nChunk
            if (closest || closest === undefined) {
                this._rayTestBuffer.packScalar(config.CMD_RAYTEST_CLOSEST);
            } else {
                this._rayTestBuffer.packScalar(config.CMD_RAYTEST_ALL);
            }
            this._rayTestBuffer.packScalar(idx);
            this._rayTestBuffer.packVector3(start);
            this._rayTestBuffer.packVector3(end);

            var array = this._rayTestBuffer.toFloat32Array();
            this._engineWorker.postMessage(array.buffer, [array.buffer]);
        },

        dispose : function() {
            this._colliders.removeAll();
            this._callbacks.removeAll();
            this._collidersToAdd = [];
            this._collidersToRemove = [];
            this._contacts = [];
            this._engineWorker.terminate()
            this._engineWorker = null;

            this._isWorkerInited = false;
        },

        _rayTestCallback : function(buffer, offset, isClosest) {
            var idx = buffer[offset++];
            var callback = this._callbacks.getAt(idx);
            var colliderIdx = buffer[offset++];
            var collider = null, hitPoint = null, hitNormal = null;
            if (colliderIdx >= 0) {
                var collider = this._colliders.getAt(colliderIdx);
                var hitPoint = new Vector3(buffer[offset++], buffer[offset++], buffer[offset++]);
                var hitNormal = new Vector3(buffer[offset++], buffer[offset++], buffer[offset++]);
            }
            callback && callback(collider, hitPoint, hitNormal);
            this._callbacks.removeAt(idx);
            return offset;
        },

        _doAddCollider : function() {
            var nChunk = 0;
            for (var i = 0; i < this._collidersToAdd.length; i++) {
                var collider = this._collidersToAdd[i];
                var idx = this._colliders.add(collider);
                // Head
                // CMD type
                // id
                this._cmdBuffer.packValues(config.CMD_ADD_COLLIDER, idx);

                var bitMaskOffset = this._cmdBuffer._offset++;
                var bitMask = this._packCollider(collider, true);
                this._cmdBuffer.set(bitMaskOffset, bitMask);

                nChunk++;
            }
            this._collidersToAdd.length = 0;

            return nChunk;
        },

        _doRemoveCollider : function() {
            var nChunk = 0;
            for (var i = 0; i < this._collidersToRemove.length; i++) {
                var idx = this._collidersToRemove[i];
                this._colliders.removeAt(idx);

                // Header
                // CMD type
                // Id
                this._cmdBuffer.packValues(config.CMD_REMOVE_COLLIDER, idx);
                nChunk++;
            }
            this._collidersToRemove.length = 0;

            return nChunk;
        },

        _doModCollider : function() {
            var nChunk = 0;
            // Find modified rigid bodies
            var colliders = this._colliders.getAll();
            for (var i = 0; i < colliders.length; i++) {
                var collider = colliders[i];
                if (collider === null) {
                    continue;
                }
                var chunkOffset = this._cmdBuffer._offset;
                // Header is 3 * 4 byte
                this._cmdBuffer._offset += 3;
                var modBit = this._packCollider(collider);
                if (modBit !== 0) {
                    // Header
                    // CMD type
                    // id
                    // Mask bit
                    this._cmdBuffer.set(chunkOffset, config.CMD_MOD_COLLIDER);
                    this._cmdBuffer.set(chunkOffset+1, i);
                    this._cmdBuffer.set(chunkOffset+2, modBit);

                    nChunk++;
                } else {
                    this._cmdBuffer._offset -= 3;
                }
            }
            return nChunk;
        },

        _packCollider : function(collider, isCreate) {
            var modBit = 0x0;

            if (isCreate || collider._dirty) {
                // Collision Flags
                var collisionFlags = 0x0;
                if (collider.isStatic) {
                    collisionFlags |= config.COLLISION_FLAG_STATIC;
                }
                if (collider.isKinematic) {
                    collisionFlags |= config.COLLISION_FLAG_KINEMATIC;
                }
                if (collider.isGhostObject) {
                    collisionFlags |= config.COLLISION_FLAG_GHOST_OBJECT;
                }
                if (collider._collisionHasCallback) {
                    collisionFlags |= config.COLLISION_FLAG_HAS_CALLBACK;
                }
                this._cmdBuffer.packScalar(collisionFlags);

                modBit |= config.COLLISION_FLAG_MOD_BIT;

                collider._dirty = false;
            }

            if (isCreate) {
                // Collision masks
                // TODO change after create
                this._cmdBuffer.packScalar(collider.group);
                this._cmdBuffer.packScalar(collider.collisionMask);
            }

            //  Motion State 
            if (isCreate || collider.isKinematic) {
                this._cmdBuffer.packVector3(collider.sceneNode.position);
                this._cmdBuffer.packVector4(collider.sceneNode.rotation);
                modBit |= config.MOTION_STATE_MOD_BIT;
            }

            var collisionObject = collider.collisionObject;
            // Collision object is not a ghost object
            if (!collider.isGhostObject) {
                // Rigid body data
                for (var i = 0; i < config.RIGID_BODY_PROPS.length; i++) {
                    var item = config.RIGID_BODY_PROPS[i];
                    var propName = item[0];
                    var value = collisionObject[propName];
                    var size = item[1];
                    if (value === undefined || value === null) {
                        continue;
                    }
                    if (size > 1) {
                        if (value._dirty || isCreate) {
                            if (size === 3) {
                                this._cmdBuffer.packVector3(value);
                            } else if(size === 4) {
                                this._cmdBuffer.packVector4(value);
                            }
                            modBit |= item[2];
                            value._dirty = false;
                        }   
                    } else {
                        console.warn('TODO');
                    }
                }
            }

            var res = this._packShape(collisionObject.shape, isCreate);
            if (res) {
                modBit |= config.SHAPE_MOD_BIT;
            }

            // Material data (collision object is not a ghost object)
            if (!collider.isGhostObject) {
                var physicsMaterial = collider.physicsMaterial;
                if (physicsMaterial._dirty || isCreate) {
                    modBit |= config.MATERIAL_MOD_BIT;
                    for (var i = 0; i < config.MATERIAL_PROPS.length; i++) {
                        var item = config.MATERIAL_PROPS[i];
                        var propName = item[0];
                        var value = physicsMaterial[propName];
                        var size = item[1];
                        if (size === 1) {
                            this._cmdBuffer.packScalar(value);
                        } else {
                            // TODO
                        }
                    }
                    physicsMaterial._dirty = false;
                }
            }

            return modBit;
        },

        _packShape : function(shape, isCreate) {
            // Check dirty
            if (!isCreate) {
                if (! (shape.halfExtents && shape.halfExtents._dirty) || shape._dirty) {
                    return false;
                }
            }
            this._cmdBuffer.packScalar(shape.__GUID__);
            if (shape instanceof BoxShape) {
                this._cmdBuffer.packScalar(config.SHAPE_BOX);
                this._cmdBuffer.packVector3(shape.halfExtents);
            } else if (shape instanceof SphereShape) {
                this._cmdBuffer.packScalar(config.SHAPE_SPHERE);
                this._cmdBuffer.packScalar(shape._radius);
            } else if (shape instanceof CylinderShape) {
                this._cmdBuffer.packScalar(config.SHAPE_CYLINDER);
                this._cmdBuffer.packVector3(shape.halfExtents);
            } else if (shape instanceof ConeShape) {
                this._cmdBuffer.packScalar(config.SHAPE_CONE);
                this._cmdBuffer.packScalar(shape._radius);
                this._cmdBuffer.packScalar(shape._height);
            } else if (shape instanceof CapsuleShape) {
                this._cmdBuffer.packScalar(config.SHAPE_CAPSULE);
                this._cmdBuffer.packScalar(shape._radius);
                this._cmdBuffer.packScalar(shape._height);
            } else if (shape instanceof StaticPlaneShape) {
                this._cmdBuffer.packScalar(config.SHAPE_STATIC_PLANE);
                this._cmdBuffer.packVector3(shape.plane.normal);
                this._cmdBuffer.packScalar(shape.plane.distance);
            } else if ((shape instanceof ConvexTriangleMeshShape) || (shape instanceof BvhTriangleMeshShape)) {
                if (shape instanceof ConvexTriangleMeshShape) {
                    this._cmdBuffer.packScalar(config.SHAPE_CONVEX_TRIANGLE_MESH);
                } else {
                    this._cmdBuffer.packScalar(config.SHAPE_BVH_TRIANGLE_MESH);
                }

                var geo = shape.geometry;
                // nTriangles - nVertices - indices - vertices 
                this._cmdBuffer.packScalar(geo.getFaceNumber());
                this._cmdBuffer.packScalar(geo.getVertexNumber());
                // Static Geometry
                if (geo.isStatic()) {
                    this._cmdBuffer.packArray(geo.faces);
                    this._cmdBuffer.packArray(geo.attributes.position.value);
                } else {
                    for (var i = 0; i < geo.faces.length; i++) {
                        this._cmdBuffer.packArray(geo.faces[i]);
                    }
                    for (var i = 0; i < geo.attributes.position.value.length; i++) {
                        this._cmdBuffer.packArray(geo.attributes.position.value[i]);
                    }
                }
            } else if (shape instanceof ConvexHullShape) {
                this._cmdBuffer.packScalar(config.SHAPE_CONVEX_HULL);
                var geo = shape.geometry;
                // nPoints - points
                this._cmdBuffer.packScalar(geo.getVertexNumber());
                // Static Geometry
                if (geo.isStatic()) {
                    this._cmdBuffer.packArray(geo.attributes.position.value);
                } else {
                    for (var i = 0; i < geo.attributes.position.value.length; i++) {
                        this._cmdBuffer.packArray(geo.attributes.position.value[i]);
                    }
                }
            } else if (shape instanceof CompoundShape) {
                this._cmdBuffer.packScalar(config.SHAPE_COMPOUND);
                this._cmdBuffer.packScalar(shape._children.length);
                for (var i = 0; i < shape._children.length; i++) {
                    var child = shape._children[i];
                    this._cmdBuffer.packVector3(child.position);
                    this._cmdBuffer.packVector4(child.rotation);
                    // Always pack child
                    this._packShape(child.shape, true);
                }
            }

            if (shape.halfExtents) {
                shape.halfExtents._dirty = false;
            }
            shape._dirty = false;

            return true;
        },

        _syncMotionState : function(buffer, offset) {
            var nObjects = buffer[offset++];

            for (var i = 0; i < nObjects; i++) {
                var idx = buffer[offset++];

                var collider = this._colliders.getAt(idx);

                var node = collider.sceneNode;
                if (node) {
                    node.position.set(buffer[offset++], buffer[offset++], buffer[offset++]);
                    node.rotation.set(buffer[offset++], buffer[offset++], buffer[offset++], buffer[offset++]);
                }
            }

            return offset;
        },

        _dispatchCollisionCallback : function(buffer, offset) {
            
            var nCollision = buffer[offset++];

            for (var i = 0; i < this._contacts.length; i++) {
                if (this._contacts[i]) {
                    this._contacts[i].length = 0;
                }
            }

            for (var i = 0; i < nCollision; i++) {
                var idxA = buffer[offset++];
                var idxB = buffer[offset++];

                var colliderA = this._colliders.getAt(idxA);
                var colliderB = this._colliders.getAt(idxB);

                if (!this._contacts[idxA]) {
                    this._contacts[idxA] = [];
                }
                if (!this._contacts[idxB]) {
                    this._contacts[idxB] = [];
                }

                var nContacts = buffer[offset++];

                var contactPoint0, contactPoint1;
                for (var j = 0; j < nContacts; j++) {
                    if (colliderA.hasCollisionCallback()) {
                        var contactPoint0 = new ContactPoint();
                        contactPoint0.thisPoint.set(buffer[offset++], buffer[offset++], buffer[offset++]);
                        contactPoint0.otherPoint.set(buffer[offset++], buffer[offset++], buffer[offset++]);
                        contactPoint0.normal.set(buffer[offset++], buffer[offset++], buffer[offset++]);
                        contactPoint0.otherCollider = colliderB;
                        contactPoint0.thisCollider = colliderA;

                        this._contacts[idxA].push(contactPoint0);
                    }  else {
                        contactPoint0 = null;
                    }
                    if (colliderB.hasCollisionCallback()) {
                        var contactPoint1 = new ContactPoint();
                        if (contactPoint0) {
                            contactPoint1.thisPoint.copy(contactPoint0.otherPoint);
                            contactPoint1.otherPoint.copy(contactPoint0.thisPoint);
                            contactPoint1.normal.copy(contactPoint0.normal).negate();
                        } else {
                            contactPoint1.thisPoint.set(buffer[offset++], buffer[offset++], buffer[offset++]);
                            contactPoint1.otherPoint.set(buffer[offset++], buffer[offset++], buffer[offset++]);
                            contactPoint1.normal.set(buffer[offset++], buffer[offset++], buffer[offset++]);
                        }
                        contactPoint1.thisCollider = colliderB;
                        contactPoint1.otherCollider = colliderA;

                        this._contacts[idxB].push(contactPoint1);
                    }
                }

                for (var i = 0; i < this._contacts.length; i++) {
                    var contacts = this._contacts[i];
                    if (contacts && contacts.length) {
                        var collider = this._colliders.getAt(i);
                        collider.trigger('collision', contacts);
                    }
                }

            }
            return offset;
        },

        // Calculate the inertia tensor in the worker and sync back
        _syncInertiaTensor : function(buffer, offset) {
            var nBody = buffer[offset++];
            for (var i = 0; i < nBody; i++) {
                var idx = buffer[offset++];
                var collider = this._colliders.getAt(idx);
                var body = collider.collisionObject;

                var m = body.invInertiaTensorWorld._array;

                for (var j= 0; j < 9; j++) {
                    m[j] = buffer[offset++];
                }
            }
            return offset;
        }
    });

    return Engine;
});