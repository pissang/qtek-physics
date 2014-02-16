define( function(require){
    
    var exportsObject = {
	"Buffer": require('qtek/physics/Buffer'),
	"Collider": require('qtek/physics/Collider'),
	"ContactPoint": require('qtek/physics/ContactPoint'),
	"Engine": require('qtek/physics/Engine'),
	"GhostObject": require('qtek/physics/GhostObject'),
	"Material": require('qtek/physics/Material'),
	"Pool": require('qtek/physics/Pool'),
	"RigidBody": require('qtek/physics/RigidBody'),
	"Shape": require('qtek/physics/Shape'),
	"shape": {
		"Box": require('qtek/physics/shape/Box'),
		"BvhTriangleMesh": require('qtek/physics/shape/BvhTriangleMesh'),
		"Capsule": require('qtek/physics/shape/Capsule'),
		"Compound": require('qtek/physics/shape/Compound'),
		"Cone": require('qtek/physics/shape/Cone'),
		"ConvexHull": require('qtek/physics/shape/ConvexHull'),
		"ConvexTriangleMesh": require('qtek/physics/shape/ConvexTriangleMesh'),
		"Cylinder": require('qtek/physics/shape/Cylinder'),
		"Sphere": require('qtek/physics/shape/Sphere'),
		"StaticPlane": require('qtek/physics/shape/StaticPlane')
	}
};
    
    return exportsObject;
})