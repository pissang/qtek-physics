define(function(require) {
    
    'use strict';
    
    var Base = require('qtek/core/Base');

    var GhostObject = Base.derive({
        shape : null
    });

    return GhostObject;
});