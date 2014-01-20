define(function (require) {
    
    'use strict';
    
    var Shape = require('./Shape');

    var ConvexTriangleMeshShape = Shape.derive({
        geometry : null
    });

    return ConvexTriangleMeshShape;
});