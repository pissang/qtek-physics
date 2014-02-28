define(function (require) {
    
    function Pool() {

        this._size = 0;

        this._data = [];

        this._empties = [];
    }

    Pool.prototype.add = function(obj) {
        var idx;
        if (this._empties.length > 0) {
            idx = this._empties.pop();
            this._data[idx] = obj;
        } else {
            idx = this._data.length;
            this._data.push(obj);
        }
        this._size++;

        return idx;
    }

    Pool.prototype.remove = function(obj) {
        var idx = this._data.indexOf(obj);
        this.removeAt(idx);
        this._size--;
    }

    Pool.prototype.removeAt = function(idx) {
        this._data[idx] = null;
        this._empties.push(idx);
    }

    Pool.prototype.removeAll = function() {
        this._data = [];
        this._empties = [];
        this._size = 0;
    }

    Pool.prototype.getAt = function(idx) {
        return this._data[idx];
    }

    Pool.prototype.getIndex = function(obj) {
        return this._data.indexOf(obj);
    }

    Pool.prototype.getAll = function() {
        return this._data;
    }

    Pool.prototype.refresh = function() {
        var newData = [];
        for (var i = 0; i < this._data.length; i++) {
            if (this._data[i] !== null) {
                newData.push(this._data[i]);
            }
        }
        this._data = newData;
    }

    Pool.prototype.each = function(callback, context) {
        for (var i = 0; i < this._data.length; i++) {
            if (this._data[i] !== null) {
                callback.call(context || this, this._data[i], i);
            }
        }
        this._data = newData;
    }

    return Pool;
});