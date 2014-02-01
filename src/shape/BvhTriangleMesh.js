define(function (require) {
    
    'use strict';
    
    var Shape = require('../Shape');

    var BvhTriangleMeshShape = Shape.derive({
        geometry : null
    });

    return BvhTriangleMeshShape;
});