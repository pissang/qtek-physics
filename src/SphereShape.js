define(function (require) {
    
    'use strict';
    
    var Shape = require('./Shape');

    var SphereShape = Shape.derive({

        _radius : 1,
        
        _dirty : true
    });

    Object.defineProperty(SphereShape.prototype, 'radius', {
        get : function() {
            return this._radius;
        },
        set : function(value) {
            this._radius = value;
            this._dirty = true;
        }
    });
    
    return SphereShape;
});