define(function(require) {
    
    'use strict';
    
    var Base = require('qtek/core/Base');

    var Collider = Base.derive({

        rigidBody : null,

        node : null,

        material : null,

        _isKinematic : false,

        _isStatic : false,

        _dirty : true
    });

    Object.defineProperty(Collider.prototype, 'isKinematic', {
        get : function() {
            return this._isKinematic;
        },
        set : function(value) {
            this._isKinematic = value;
            this._dirty = true;
        }
    });

    Object.defineProperty(Collider.prototype, 'isStatic', {
        get : function() {
            return this._isStatic;
        },
        set : function(value) {
            this._isStatic = value;
            this._dirty = true;
        }
    });


    return Collider;
});