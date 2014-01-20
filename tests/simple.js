define(function(require) {

    var Engine = require('Engine');
    var Collider = require('Collider');
    var RigidBody = require('RigidBody');
    var BoxShape = require('BoxShape');
    var SphereShape = require('SphereShape');
    var CylinderShape = require('CylinderShape');
    var CapsuleShape = require('CapsuleShape');
    var ConeShape = require('ConeShape');
    var StaticPlaneShape = require('StaticPlaneShape');
    var PhysicsMaterial = require("Material");

    var qtek = require('qtek/qtek');

    var engine = new Engine({
        workerUrl : '../src/AmmoEngineWorker'
    });
    var renderer = new qtek.Renderer({
        canvas : document.getElementById('Main')
    });
    renderer.resize(window.innerWidth, window.innerHeight);
    
    var animation = new qtek.animation.Animation();
    animation.start();
    
    var scene = new qtek.Scene();
    var camera = new qtek.camera.Perspective({
        aspect : renderer.width / renderer.height
    });
    camera.position.set(0, 10, 30);
    camera.lookAt(qtek.math.Vector3.ZERO);

    var light = new qtek.light.Directional();
    light.position.set(1, 1, 1);
    light.lookAt(qtek.math.Vector3.ZERO);
    scene.add(light);

    var planeMesh = new qtek.Mesh({
        material : new qtek.Material({
            shader : qtek.shader.library.get('buildin.physical')
        }),
        geometry : new qtek.geometry.Plane(),
        scale : new qtek.math.Vector3(100, 100, 1)
    });

    planeMesh.rotation.rotateX(-Math.PI / 2);


    var floorBody = new RigidBody({
        shape : new StaticPlaneShape()
    });
    engine.addCollider(new Collider({
        rigidBody : floorBody,
        material : new PhysicsMaterial(),
        node : planeMesh,
        isStatic : true
    }));
    scene.add(planeMesh);
    
    for (var i = 0; i < 400; i++) {
        
        var cubeMesh = new qtek.Mesh({
            material : new qtek.Material({
                shader : qtek.shader.library.get('buildin.physical')
            }),
            geometry : new qtek.geometry.Cube(),
            position : new qtek.math.Vector3(20 - Math.random() * 40, Math.random() * 40, 20 - Math.random() * 40)
        });
        cubeMesh.material.set('color', [Math.random(), Math.random(), Math.random()]);
        scene.add(cubeMesh);

        var cubeBody = new RigidBody({
            shape : new BoxShape({
                halfExtents : new qtek.math.Vector3(1, 1, 1)
            }),
            mass : 1
        });

        engine.addCollider(new Collider({
            rigidBody : cubeBody,
            material : new PhysicsMaterial(),
            node : cubeMesh
        }));
    }

    var control = new qtek.plugin.OrbitControl({
        target : camera,
        domElement : renderer.canvas
    });
    animation.on('frame', function(dTime) {
        control.update(dTime);
        engine.step(dTime / 1000, Math.ceil(dTime / 1000 * 60), 1 / 60);
        renderer.render(scene, camera);
    });
});