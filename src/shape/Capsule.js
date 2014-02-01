define(function (require) {
    
    'use strict';
    
    var Shape = require('../Shape');
    var Vector3 = require('qtek/math/Vector3');

    var CapsuleShape = Shape.derive({

        _radius : 1,
        
        _height : 1,

        _dirty : true
    });

    Object.defineProperty(CapsuleShape.prototype, 'radius', {
        get : function() {
            return this._radius;
        },
        set : function(value) {
            this._radius = value;
            this._dirty = true;
        }
    });

    Object.defineProperty(CapsuleShape.prototype, 'height', {
        get : function() {
            return this._height;
        },
        set : function(value) {
            this._height = value;
            this._dirty = true;
        }
    })

    Object.defineProperty(CapsuleShape.prototype, 'halfHeight', {
        get : function() {
            return this._height / 2;
        },
        set : function(value) {
            this._height = value * 2;
            this._dirty = true;
        }
    });

    return CapsuleShape;
})