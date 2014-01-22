define(function(require) {
    
    'use strict';
    
    var Base = require('qtek/core/Base');
    var Vector3 = require('qtek/math/Vector3');
    var Quaternion = require('qtek/math/Quaternion');

    var RigidBody = Base.derive({

        shape : null,
        
        // Fixed object if mass is 0
        // Dynamic if mass is positive
        mass : 0,

        linearVelocity : null,

        angularVelocity : null,

        localInertia : null,

        centerOfMass : null

    }, function() {
        if (!this.linearFactor) {
            this.linearFactor = new Vector3(1, 1, 1);
        }
        if (!this.angularFactor) {
            this.angularFactor = new Vector3(1, 1, 1);
        }
    }, {

        applyForce : function() {},

        applyImpulse : function() {}
    });

    return RigidBody;
});