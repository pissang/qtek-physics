define(function(require) {
    
    'use strict';
    
    var Base = require('qtek/core/Base');
    var Vector3 = require('qtek/math/Vector3');
    var Quaternion = require('qtek/math/Quaternion');
    var glMatrix = require('glmatrix');
    var vec3 = glMatrix.vec3;

    var RigidBody = Base.derive(function() {
        return {

            shape : null,
            
            linearVelocity : new Vector3(),

            angularVelocity : new Vector3(),

            localInertia : null,

            centerOfMass : null,

            linearFactor : new Vector3(1, 1, 1),
            
            angularFactor : new Vector3(1, 1, 1),

            totalForce : new Vector3(0, 0, 0),

            totalTorque : new Vector3(0, 0, 0),
            // x : mass,
            //      Fixed object if mass is 0
            //      Dynamic if mass is positive
            // y : linearDamping
            // z : angularDamping
            massAndDamping : new Vector3()
        };
    }, {

        applyForce : (function() {
            var torque = new Vector3();
            var scaledForce = new Vector3();
            return function(force, relPos) {
                vec3.mul(scaledForce._array, force._array, this.linearFactor._array);
                this.totalForce.add(scaledForce);
                if (relPos) {
                    vec3.cross(torque._array, relPos._array, scaledForce._array);
                    this.applyTorque(torque);
                }
            }
        })(),

        applyTorque : (function() {
            var scaledTorque = new Vector3();
            return function(torque) {
                vec3.mul(scaledTorque._array, torque._array, this.angularFactor._array);
                this.totalTorque.add(scaledTorque);
            }
        })(),

        applyImpulse : (function() {
            var torqueImpulse = new Vector3();
            var scaledImpulse = new Vector3();
            return function(impulse, relPos) {
                if (this.mass !== 0) {
                    vec3.mul(scaledImpulse._array, impulse._array, this.linearFactor._array);
                    this.linearVelocity.scaleAndAdd(scaledImpulse, 1 / this.mass);
                    if (relPos) {
                        vec3.cross(torqueImpulse._array, relPos._array, scaledImpulse._array);
                        this.applyTorque(torqueImpulse);
                    }
                }
            }
        })(),

        applyTorqueImpulse : (function() {
            var scaledTorqueImpuse = new Vector3();
            return function(torqueImpulse) {
                // TODO
            }
        })(),

        clearForces : function() {
            this.totalForce.set(0, 0, 0);
            this.totalTorque.set(0, 0, 0);
        }
    });

    Object.defineProperty(RigidBody.prototype, 'mass', {
        get : function() {
            return this.massAndDamping._array[0];
        },
        set : function(value) {
            this.massAndDamping._array[0] = value;
            this.massAndDamping._dirty = true;
        }
    });
    Object.defineProperty(RigidBody.prototype, 'linearDamping', {
        get : function() {
            return this.massAndDamping._array[1];
        },
        set : function(value) {
            this.massAndDamping._array[1] = value;
            this.massAndDamping._dirty = true;
        }
    });
    Object.defineProperty(RigidBody.prototype, 'angularDamping', {
        get : function() {
            return this.massAndDamping._array[2];
        },
        set : function(value) {
            this.massAndDamping._array[2] = value;
            this.massAndDamping._dirty = true;
        }
    });

    return RigidBody;
});