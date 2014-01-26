define( function(require){
    
    var exportsObject = {
	"BoxShape": require('qtek/physics/BoxShape'),
	"Buffer": require('qtek/physics/Buffer'),
	"BvhTriangleMeshShape": require('qtek/physics/BvhTriangleMeshShape'),
	"CapsuleShape": require('qtek/physics/CapsuleShape'),
	"Collider": require('qtek/physics/Collider'),
	"ConeShape": require('qtek/physics/ConeShape'),
	"ContactPoint": require('qtek/physics/ContactPoint'),
	"ConvexHullShape": require('qtek/physics/ConvexHullShape'),
	"ConvexTriangleMeshShape": require('qtek/physics/ConvexTriangleMeshShape'),
	"CylinderShape": require('qtek/physics/CylinderShape'),
	"Engine": require('qtek/physics/Engine'),
	"GhostObject": require('qtek/physics/GhostObject'),
	"Material": require('qtek/physics/Material'),
	"Physics": require('qtek/physics/Physics'),
	"RigidBody": require('qtek/physics/RigidBody'),
	"Shape": require('qtek/physics/Shape'),
	"SphereShape": require('qtek/physics/SphereShape'),
	"StaticPlaneShape": require('qtek/physics/StaticPlaneShape')
};
    
    return exportsObject;
})