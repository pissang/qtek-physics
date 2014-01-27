define(function(require) {
    
    'use strict';
    
    var Base = require('qtek/core/Base');

    var Collider = Base.derive({

        collisionObject : null,

        sceneNode : null,

        physicsMaterial : null,

        isKinematic : false,

        isStatic : false,

        isGhostObject : false,

        // Group and collision masks
        // http://bulletphysics.org/mediawiki-1.5.8/index.php/Collision_Filtering#Filtering_collisions_using_masks
        group : 1,

        collisionMask : 1,

        _dirty : true,

        _collisionHasCallback : false
    }, {

        on : function(name, action, context) {
            Base.prototype.on.call(this, name, action, context);
            this._collisionHasCallback = true;
            this._dirty = true;
        },

        off : function(name, action) {
            Base.prototype.off.call(this, name, action);
        },

        hasCollisionCallback : function() {
            return this._collisionHasCallback;
        }
    });

    Collider.events = ['collision'];

    return Collider;
});