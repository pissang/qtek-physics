define(function(require) {

    'use strict';
    
    var Base = require('qtek/core/Base');

    var Shape = Base.derive({
    }, {
        dirty : function() {
            this._dirty = true;
        }
    });

    return Shape;
})