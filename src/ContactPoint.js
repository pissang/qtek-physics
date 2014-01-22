define(function(contactPoint) {

    var Vector3 = require('qtek/math/Vector3');

    var ContactPoint = function() {
        this.thisPoint = new Vector3();
        this.otherPoint = new Vector3();

        this.otherCollider = null;
        this.thisCollider = null;

        this.normal = new Vector3(); // normal
    }

    return ContactPoint;
});