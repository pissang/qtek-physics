define(function(require) {

    'use strict';
    
    var Shape = require('../Shape');
    var Vector3 = require('qtek/math/Vector3');

    var BoxShape = Shape.derive({
        
        halfExtents : null

    }, function() {

        if (!this.halfExtents) {
            this.halfExtents = new Vector3(1, 1, 1);
        }

    });

    Object.defineProperty(BoxShape.prototype, 'width', {
        get : function() {
            return this.halfExtents._array[0] * 2;
        },
        set : function(value) {
            this.halfExtents._array[0] = value / 2;
            this.halfExtents._dirty = true;
        }
    });
    Object.defineProperty(BoxShape.prototype, 'height', {
        get : function() {
            return this.halfExtents._array[1] * 2;
        },
        set : function(value) {
            this.halfExtents._array[1] = value / 2;
            this.halfExtents._dirty = true;
        }
    });
    Object.defineProperty(BoxShape.prototype, 'depth', {
        get : function() {
            return this.halfExtents._array[2] * 2;
        },
        set : function(value) {
            this.halfExtents._array[2] = value / 2;
            this.halfExtents._dirty = true;
        }
    });

    return BoxShape;
})