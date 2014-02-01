define(function(require) {
    
    'use strict';
    
    var Shape = require('../Shape');
    var Plane = require('qtek/math/Plane');

    var StaticPlaneShape = Shape.derive({

        _dirty : false

    }, function() {
        if (!this.plane) {
            this.plane = new Plane();
            // Plane geometry in qtek is face to the camera
            this.plane.normal.set(0, 0, 1);
            this.plane.distance = 0;
        }
    });

    return StaticPlaneShape;
});