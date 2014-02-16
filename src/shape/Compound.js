define(function(require) {

    'use strict';

    var Shape = require('../Shape');
    var Vector3 = require('qtek/math/Vector3');
    var Quaternion = require('qtek/math/Quaternion');

    var ChildShape = function(shape, position, rotation) {
        this.shape = shape;
        this.position = position || new Vector3();
        this.rotation = rotation || new Quaternion();
    }

    var CompoundShape = Shape.derive({
        
        _dirty : false

    }, function() {
        this._children = [];
    }, {
        addChildShape : function(shape, position, rotation) {
            this.removeChildShape(shape);
            var childShape = new ChildShape(shape, position, rotation);
            this._children.push(childShape);
            this._dirty = true;

            return childShape;
        },

        removeChildShape : function(shape) {
            for (var i = 0; i < this._children.length; i++) {
                if (this._children[i].shape === shape) {
                    this._children.splice(i, 1);
                    this._dirty = true;
                    return;
                }
            }
        },

        getChildShape : function(shape) {
            for (var i = 0; i < this._children.length; i++) {
                if (this._children[i].shape === shape) {
                    return this._children[i];
                }
            }
        },

        getChildShapeAt : function(i) {
            return this._children[i];
        }
    });
    
    return CompoundShape;
});