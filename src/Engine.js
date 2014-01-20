// Ammo.js adapter
// https://github.com/kripken/ammo.js
define(function(require) {

    var Base = require('qtek/core/Base');
    var configStr = require('text!./AmmoEngineConfig');

    var BoxShape = require('./BoxShape');
    var CapsuleShape = require('./CapsuleShape');
    var ConeShape = require('./ConeShape');
    var CylinderShape = require('./CylinderShape');
    var SphereShape = require('./SphereShape');
    var StaticPlaneShape = require('./StaticPlaneShape');
    var ConvexTriangleMeshShape = require('./ConvexTriangleMeshShape');
    var QBuffer  = require('./Buffer');

    var ConfigCtor = new Function(configStr);

    var config = new ConfigCtor();

    var Engine = Base.derive({

        workerUrl : ''

    }, function () {
        this.init();
    }, {

        init : function() {
            this._engineWorker = new Worker(this.workerUrl);
            
            this._colliders = [];
            this._empties = [];
            this._collidersToAdd = [];
            this._collidersToRemove = [];

            this._cmdBuffer = new QBuffer();

            var self = this;

            this._engineWorker.onmessage = function(e) {
                var buffer = new Float32Array(e.data);
    
                var cmdType = buffer[0];

                switch(cmdType) {
                    case config.CMD_SYNC_MOTION_STATE:
                        self._syncMotionState(buffer, 1);
                        break;
                    default:
                }
            }
        },

        step : function(timeStep, maxSubSteps, fixedTimeStep) {

            var nChunk = 0;
            this._cmdBuffer.setOffset(0);
            this._cmdBuffer.packScalar(0);

            nChunk += this._doModCollider();
            nChunk += this._doRemoveCollider();
            nChunk += this._doAddCollider();

            // Step
            this._cmdBuffer.packValues(config.CMD_STEP, timeStep, maxSubSteps, fixedTimeStep);
            nChunk++;

            this._cmdBuffer.set(0, nChunk);

            // For example, when transferring an ArrayBuffer from your main app to Worker, the original ArrayBuffer is cleared and no longer usable
            var array = this._cmdBuffer.toFloat32Array();
            this._engineWorker.postMessage(array.buffer, [array.buffer]);
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
                this._cmdBuffer.packValues(config.CMD_ADD_RIGIDBODY, idx);

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
                this._cmdBuffer.packValues(config.CMD_REMOVE_RIGIDBODY, idx);
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
                this._cmdBuffer._offset += 3;
                // Header is 32 * 3 bit
                var modBit = this._packCollider(collider);
                this._cmdBuffer._offset -= 3;
                if (modBit !== 0) {
                    // Header
                    // CMD type
                    // id
                    // Mask bit
                    this._cmdBuffer.packValues(config.CMD_MOD_RIGIDBODY, i, modBit);

                    nChunk++;
                }
            }
            return nChunk;
        },

        _packCollider : function(collider, isCreate) {
            var modBit = 0x0;

            if (isCreate || collider._dirty) {
                // Collision Flags
                var collisionFlags = 0x0;
                if (collider._isStatic) {
                    collisionFlags |= config.COLLISION_FLAG_STATIC;
                }
                if (collider._isKinematic) {
                    collisionFlags |= config.COLLISION_FLAG_KINEMATIC;
                }
                this._cmdBuffer.packScalar(collisionFlags);

                modBit |= config.COLLISION_FLAG_MOD_BIT;

                collider._dirty = false;
            }

            // Motion State
            if (isCreate || collider._isKinematic) {
                this._cmdBuffer.packVector3(collider.node.position);
                this._cmdBuffer.packVector4(collider.node.rotation);
                modBit |= config.MOTION_STATE_MOD_BIT;
            }
            var rigidBody = collider.rigidBody;
            // Rigid body data
            for (var i = 0; i < config.RIGID_BODY_PROPS.length; i++) {
                var item = config.RIGID_BODY_PROPS[i];
                var propName = item[0];
                var value = rigidBody[propName];
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
                    // TODO
                    // is mass
                    if (isCreate) {
                        this._cmdBuffer.packScalar(value);
                    }
                }
            }
            var res = this._packShape(rigidBody.shape, isCreate);
            if (res) {
                modBit |= config.SHAPE_MOD_BIT;
            }

            // Material data
            var material = collider.material;
            if (material._dirty || isCreate) {
                modBit |= config.MATERIAL_MOD_BIT;
                for (var i = 0; i < config.MATERIAL_PROPS.length; i++) {
                    var item = config.MATERIAL_PROPS[i];
                    var propName = item[0];
                    var value = material[propName];
                    var size = item[1];
                    if (size === 1) {
                        this._cmdBuffer.packScalar(value);
                    } else {
                        // TODO
                    }
                }
                material._dirty = false;
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
            } else if (shape instanceof ConvexTriangleMeshShape) {
                shapeType = config.SHAPE_CONVEX_TRIANGLE_MESH;
                // TODO
            } else if (shape instanceof StaticPlaneShape) {
                this._cmdBuffer.packScalar(config.SHAPE_STATIC_PLANE);
                this._cmdBuffer.packVector3(shape.plane.normal);
                this._cmdBuffer.packScalar(shape.plane.distance);
            } else {
                shapeType = -1;
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

                var node = collider.node;
                if (node) {
                    node.position.set(buffer[offset++], buffer[offset++], buffer[offset++]);
                    node.rotation.set(buffer[offset++], buffer[offset++], buffer[offset++], buffer[offset++]);
                }
            }
        }
    });

    return Engine;
});