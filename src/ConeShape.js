define(function (require) {
    
    'use strict';
    
    var Shape = require('./Shape');
    var Vector3 = require('qtek/math/Vector3');

    var ConeShape = Shape.derive({

        _radius : 1,
        
        _height : 1,

        _dirty : true
    });

    Object.defineProperty(ConeShape.prototype, 'radius', {
        get : function() {
            return this._radius;
        },
        set : function(value) {
            this._radius = value;
            this._dirty = true;
        }
    });
    Object.defineProperty(ConeShape.prototype, 'height', {
        get : function() {
            return this._height;
        },
        set : function(value) {
            this._height = value;
            this._dirty = true;
        }
    });

    return ConeShape;
})