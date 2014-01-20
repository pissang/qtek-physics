// Physics material description
define(function (require) {
    
    'use strict';
    
    var Base = require('qtek/core/Base');

    var Material = Base.derive({

        _friction : 0.5,

        _bounciness : 0.3,

        _dirty : true
    });

    Object.defineProperty(Material.prototype, 'friction', {
        get : function() {
            return this._friction;
        },
        set : function(value) {
            this._friction = value;
            this._dirty = true;
        }
    });

    Object.defineProperty(Material.prototype, 'bounciness', {
        get : function() {
            return this._bounciness;
        },
        set : function(value) {
            this._friction = value;
            this._dirty = true;
        }
    });

    return Material;
})