define(function (require) {
    
    'use strict';
    
    var Buffer = function() {
        this._data = [];
        this._offset = 0;
    }

    Buffer.prototype.set = function(offset, value) {
        this._data[offset] = value;
    }

    Buffer.prototype.setOffset = function(offset) {
        this._offset = offset;
    }

    Buffer.prototype.toFloat32Array = function() {
        this._data.length = this._offset;
        return new Float32Array(this._data);
    }

    Buffer.prototype.reset = function() {
        this._data = [];
        this._offset = 0;
    }

    Buffer.prototype.packScalar = function(scalar) {
        this._data[this._offset++] = scalar;
    }

    Buffer.prototype.packVector2 = function(v2) {
        this._data[this._offset++] = v2._array[0];
        this._data[this._offset++] = v2._array[1];
    }
    
    Buffer.prototype.packVector3 = function(v3) {
        this._data[this._offset++] = v3._array[0];
        this._data[this._offset++] = v3._array[1];
        this._data[this._offset++] = v3._array[2];
    }

    Buffer.prototype.packVector4 = function(v4) {
        this._data[this._offset++] = v4._array[0];
        this._data[this._offset++] = v4._array[1];
        this._data[this._offset++] = v4._array[2];
        this._data[this._offset++] = v4._array[3];
    }

    Buffer.prototype.packArray = function(arr) {
        for (var i = 0; i < arr.length; i++) {
            this._data[this._offset++] = arr[i];
        }
    }

    Buffer.prototype.packValues = function() {
        this.packArray(arguments);
    }

    return Buffer;
});