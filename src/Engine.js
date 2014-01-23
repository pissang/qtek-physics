// Ammo.js adapter
// https://github.com/kripken/ammo.js
define(function(require) {

    'use strict';

    var Base = require('qtek/core/Base');
    var configStr = require('text!./AmmoEngineConfig');

    var BoxShape = require('./BoxShape');
    var CapsuleShape = require('./CapsuleShape');
    var ConeShape = require('./ConeShape');
    var CylinderShape = require('./CylinderShape');
    var SphereShape = require('./SphereShape');
    var StaticPlaneShape = require('./StaticPlaneShape');
    var ConvexTriangleMeshShape = require('./ConvexTriangleMeshShape');
    var BvhTriangleMeshShape = require('./BvhTriangleMeshShape');
    var ConvexHullShape = require('./ConvexHullShape');
    var QBuffer  = require('./Buffer');
    var ContactPoint = require('./ContactPoint');

    var StaticGeometry = require('qtek/StaticGeometry');
    var DynamicGeometry = require('qtek/DynamicGeometry');

    var Vector3 = require('qtek/math/Vector3');

    var ConfigCtor = new Function(configStr);

    var config = new ConfigCtor();

    var Engine = Base.derive({

        workerUrl : '',

        maxSubSteps : 3,

        fixedTimeStep : 1 / 60,

        _stepTime : 0,

        _isWorkerFree : true

    }, function () {
        this.init();
    }, {

        init : function() {
            this._engineWorker = new Worker(this.workerUrl);
            
            this._colliders = [];
            this._empties = [];
            this._collidersToAdd = [];
            this._collidersToRemove = [];

            this._contacts = [];

            this._cmdBuffer = new QBuffer();

            var self = this;

            this._engineWorker.onmessage = function(e) {
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
                        default:
                    }
                }

                self._isWorkerFree = true;

                self.trigger('afterstep');
            }
        },

        step : function(timeStep) {
            // Wait when the worker is free to use
            if (!this._isWorkerFree) {
                this._stepTime = timeStep;
                return;
            }

            var nChunk = 0;
            this._cmdBuffer.setOffset(0);
            this._cmdBuffer.packScalar(0);

            nChunk += this._doModCollider();
            nChunk += this._doRemoveCollider();
            nChunk += this._doAddCollider();

            // Step
            this._cmdBuffer.packValues(config.CMD_STEP, this._stepTime, this.maxSubSteps, this.fixedTimeStep);
            nChunk++;

            this._cmdBuffer.set(0, nChunk);

            // For example, when transferring an ArrayBuffer from your main app to Worker, the original ArrayBuffer is cleared and no longer usable
            var array = this._cmdBuffer.toFloat32Array();
            this._engineWorker.postMessage(array.buffer, [array.buffer]);

            // Clear forces at the end of each step
            // http://bulletphysics.org/Bullet/phpBB3/viewtopic.php?t=8622
            for (var i = 0; i < this._colliders.length; i++) {
                var collider = this._colliders[i];
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
            this._stepTime = 0;
        },

        addCollider : function(collider) {
            this._collidersToAdd.push(collider);
        },

        removeCollider : function(collider) {
            var idx = this._colliders.indexOf(collider);
            if (idx >= 0) {
                this._collidersToRemove.push(idx);
            }
        },

        _doAddCollider : function() {
            var nChunk = 0;
            for (var i = 0; i < this._collidersToAdd.length; i++) {
                var collider = this._collidersToAdd[i];
                var idx;
                if (this._empties.length > 0) {
                    idx = this._empties.pop();
                    this._colliders[idx] = collider;
                } else {
                    idx = this._colliders.length;
                    this._colliders.push(collider);
                }

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
                this._colliders[idx] = null;
                this._empties.push(idx);

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
            for (var i = 0; i < this._colliders.length; i++) {
                var collider = this._colliders[i];
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
                if (geo instanceof StaticGeometry) {
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
                if (geo instanceof StaticGeometry) {
                    this._cmdBuffer.packArray(geo.attributes.position.value);
                } else {
                    for (var i = 0; i < geo.attributes.position.value.length; i++) {
                        this._cmdBuffer.packArray(geo.attributes.position.value[i]);
                    }
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
                var id = buffer[offset++];

                var collider = this._colliders[id];

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

                var colliderA = this._colliders[idxA];
                var colliderB = this._colliders[idxB];

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
                        this._colliders[i].trigger('collision', contacts);
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
                var collider = this._colliders[idx];
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