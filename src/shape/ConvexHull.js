define(function (require) {
    
    'use strict';
    
    var Shape = require('../Shape');

    var ConvexHullShape = Shape.derive({
        geometry : null
    });

    return ConvexHullShape;
});