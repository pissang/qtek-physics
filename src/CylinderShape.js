define(function (require) {
    
    'use strict';
    
    var Shape = require('./Shape');
    var Vector3 = require('qtek/math/Vector3');

    // TODO margin
    var CylinderShape = Shape.derive({

        halfExtents : null,

        _upAxis : 1,

        _dirty : true,

        _radiusIdx : 0,
        _heightIdx : 1

    }, function() {
        if (!this.halfExtents) {
            this.halfExtents = new Vector3(1, 1, 1)
        }
    });

    Object.defineProperty(CylinderShape.prototype, 'radius', {
        get : function() {
            return this.halfExtents._array[this._radiusIdx];
        },
        set : function(value) {
            this.halfExtents._array[this._radiusIdx] = value;
            this.halfExtents._dirty = true;
        }
    });
    Object.defineProperty(CylinderShape.prototype, 'height', {
        get : function() {
            return this.halfExtents._array[this._heightIdx] * 2;
        },
        set : function(value) {
            this.halfExtents._array[this._heightIdx] = value / 2;
            this.halfExtents._dirty = true;
        }
    });
    Object.defineProperty(CylinderShape.prototype, 'upAxis', {
        set : function(value) {
            switch(value) {
                case 0: // Align along x
                    this._radiusIdx = 1;
                    this._heightIdx = 0;
                    break;
                case 2: // Align along z
                    this._radiusIdx = 0;
                    this._heightIdx = 2;
                    break;
                default: // Align along y
                    this._radiusIdx = 0;
                    this._heightIdx = 1;
            }

            this._upAxis = value;
            this._dirty = true;
        },
        get : function() {
            return this._upAxis;
        }
    });

    return CylinderShape;
})