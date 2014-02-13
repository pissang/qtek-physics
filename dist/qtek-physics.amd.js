
define('qtek/physics/qtek-physics.amd',[],function() {
    console.log('Loaded qtek physics module');
    console.log('Author : https://github.com/pissang/');
});
define('qtek/physics/Buffer',['require'],function (require) {
    
    
    
    var Buffer = function() {
        this._data = [];
        this._offset = 0;
    }

    Buffer.prototype.set = function(offset, value) {
        this._data[offset] = value;
    }

    Buffer.prototype.setOffset = function(offset) {
        this._offset = offset;
    }

    Buffer.prototype.toFloat32Array = function() {
        this._data.length = this._offset;
        return new Float32Array(this._data);
    }

    Buffer.prototype.reset = function() {
        this._data = [];
        this._offset = 0;
    }

    Buffer.prototype.packScalar = function(scalar) {
        this._data[this._offset++] = scalar;
    }

    Buffer.prototype.packVector2 = function(v2) {
        this._data[this._offset++] = v2._array[0];
        this._data[this._offset++] = v2._array[1];
    }
    
    Buffer.prototype.packVector3 = function(v3) {
        this._data[this._offset++] = v3._array[0];
        this._data[this._offset++] = v3._array[1];
        this._data[this._offset++] = v3._array[2];
    }

    Buffer.prototype.packVector4 = function(v4) {
        this._data[this._offset++] = v4._array[0];
        this._data[this._offset++] = v4._array[1];
        this._data[this._offset++] = v4._array[2];
        this._data[this._offset++] = v4._array[3];
    }

    Buffer.prototype.packArray = function(arr) {
        for (var i = 0; i < arr.length; i++) {
            this._data[this._offset++] = arr[i];
        }
    }

    Buffer.prototype.packValues = function() {
        this.packArray(arguments);
    }

    return Buffer;
});
define('qtek/core/mixin/derive',['require'],function(require) {



/**
 * derive a sub class from base class
 * @makeDefaultOpt [Object|Function] default option of this sub class, 
                        method of the sub can use this.xxx to access this option
 * @initialize [Function](optional) initialize after the sub class is instantiated
 * @proto [Object](optional) prototype methods/property of the sub class
 *
 * @export{object}
 */
function derive(makeDefaultOpt, initialize/*optional*/, proto/*optional*/) {

    if (typeof initialize == "object") {
        proto = initialize;
        initialize = null;
    }

    var _super = this;

    var propList;
    if (! (makeDefaultOpt instanceof Function)) {
        // Optimize the property iterate if it have been fixed
        propList = [];
        for (var propName in makeDefaultOpt) {
            if (makeDefaultOpt.hasOwnProperty(propName)) {
                propList.push(propName);
            }
        }
    }

    var sub = function(options) {

        // call super constructor
        _super.call(this);

        if (makeDefaultOpt instanceof Function) {
            // call defaultOpt generate function each time
            // if it is a function, So we can make sure each 
            // property in the object is fresh
            extend(this, makeDefaultOpt.call(this));
        } else {
            extendWithPropList(this, makeDefaultOpt, propList);
        }
        
        if (options) {
            extend(this, options);
        }

        if (this.constructor === sub) {
            // initialize function will be called in the order of inherit
            var base = sub;
            var initializers = sub.__initializer__;
            for (var i = 0; i < initializers.length; i++) {
                initializers[i].call(this);
            }
        }
    };
    // save super constructor
    sub.__super__ = _super;
    // initialize function will be called after all the super constructor is called
    if (!_super.__initializer__) {
        sub.__initializer__ = [];
    } else {
        sub.__initializer__ = _super.__initializer__.slice();
    }
    if (initialize) {
        sub.__initializer__.push(initialize);
    }

    var Ctor = function() {};
    Ctor.prototype = _super.prototype;
    sub.prototype = new Ctor();
    sub.prototype.constructor = sub;
    extend(sub.prototype, proto);
    
    // extend the derive method as a static method;
    sub.derive = _super.derive;

    return sub;
}

function extend(target, source) {
    if (!source) {
        return;
    }
    for (var name in source) {
        if (source.hasOwnProperty(name)) {
            target[name] = source[name];
        }
    }
}

function extendWithPropList(target, source, propList) {
    for (var i = 0; i < propList.length; i++) {
        var propName = propList[i];
        target[propName] = source[propName];
    }   
}

return {
    derive : derive
}

});
define('qtek/core/mixin/notifier',[],function() {

    function Handler(action, context) {
        this.action = action;
        this.context = context;
    }

    return{
        trigger : function(name) {
            if (! this.hasOwnProperty('__handlers__')) {
                return;
            }
            if (!this.__handlers__.hasOwnProperty(name)) {
                return;
            }

            var hdls = this.__handlers__[name];
            var l = hdls.length, i = -1, args = arguments;
            // Optimize from backbone
            switch (args.length) {
                case 1: 
                    while (++i < l)
                        hdls[i].action.call(hdls[i].context);
                    return;
                case 2:
                    while (++i < l)
                        hdls[i].action.call(hdls[i].context, args[1]);
                    return;
                case 3:
                    while (++i < l)
                        hdls[i].action.call(hdls[i].context, args[1], args[2]);
                    return;
                case 4:
                    while (++i < l)
                        hdls[i].action.call(hdls[i].context, args[1], args[2], args[3]);
                    return;
                case 5:
                    while (++i < l)
                        hdls[i].action.call(hdls[i].context, args[1], args[2], args[3], args[4]);
                    return;
                default:
                    while (++i < l)
                        hdls[i].action.apply(hdls[i].context, Array.prototype.slice.call(args, 1));
                    return;
            }
        },
        
        on : function(name, action, context/*optional*/) {
            if (!name || !action) {
                return;
            }
            var handlers = this.__handlers__ || (this.__handlers__={});
            if (! handlers[name]) {
                handlers[name] = [];
            } else {
                if (this.has(name, action)) {
                    return;
                }   
            }
            var handler = new Handler(action, context || this);
            handlers[name].push(handler);

            return handler;
        },

        once : function(name, action, context) {
            if (!name || !action) {
                return;
            }
            var self = this;
            function wrapper() {
                self.off(name, wrapper);
                action.apply(this, arguments);
            }
            return this.on(name, wrapper, context);
        },

        // Alias of on('before')
        before : function(name, action, context/*optional*/) {
            if (!name || !action) {
                return;
            }
            name = 'before' + name;
            return this.on(name, action, context);
        },

        // Alias of on('after')
        after : function(name, action, context/*optional*/) {
            if (!name || !action) {
                return;
            }
            name = 'after' + name;
            return this.on(name, action, context);
        },

        // Alias of once('success')
        success : function(action, context/*optional*/) {
            return this.once('success', action, context);
        },

        // Alias of once('error')
        error : function() {
            return this.once('error', action, context);
        },

        off : function(name, action) {
            
            var handlers = this.__handlers__ || (this.__handlers__={});

            if (!action) {
                handlers[name] = [];
                return;
            }
            if (handlers[name]) {
                var hdls = handlers[name];
                // Splice is evil!!
                var retains = [];
                for (var i = 0; i < hdls.length; i++) {
                    if (action && hdls[i].action !== action) {
                        retains.push(hdls[i]);
                    }
                }
                handlers[name] = retains;
            } 
        },

        has : function(name, action) {
            var handlers = this.__handlers__;

            if (! handlers ||
                ! handlers[name]) {
                return false;
            }
            var hdls = handlers[name];
            for (var i = 0; i < hdls.length; i++) {
                if (hdls[i].action === action) {
                    return true;
                }
            }
        }
    }
    
});
define('qtek/core/util',['require'],function(require){
    
    var guid = 0;

	var util = {

		genGUID : function() {
			return ++guid;
		},

        relative2absolute : function(path, basePath) {
            if (!basePath || path.match(/^\//)) {
                return path;
            }
            var pathParts = path.split('/');
            var basePathParts = basePath.split('/');

            var item = pathParts[0];
            while(item === '.' || item === '..') {
                if (item === '..') {
                    basePathParts.pop();
                }
                pathParts.shift();
                item = pathParts[0];
            }
            return basePathParts.join('/') + '/' + pathParts.join('/');
        },

        extend : function(target, source) {
            if (source) {
                for (var name in source) {
                    if (source.hasOwnProperty(name)) {
                        target[name] = source[name];
                    }
                }
            }
            return target;
        },

        defaults : function(target, source) {
            if (source) {
                for (var propName in source) {
                    if (target[propName] === undefined) {
                        target[propName] = source[propName];
                    }
                }
            }
        },

        extendWithPropList : function(target, source, propList) {
            if (source) {
                for (var i = 0; i < propList.length; i++) {
                    var propName = propList[i];
                    target[propName] = source[propName];
                }
            }
            return target;
        },

        defaultsWithPropList : function(target, source, propList) {
            if (source) {
                for (var i = 0; i < propList.length; i++) {
                    var propName = propList[i];
                    if (target[propName] === undefined) {
                        target[propName] = source[propName];
                    }
                }
            }
            return target;
        },

        each : function(obj, iterator, context) {
            if (!(obj && iterator)) {
                return;
            }
            if (obj.forEach) {
                obj.forEach(iterator, context);
            } else if (obj.length === + obj.length) {
                for (var i = 0, len = obj.length; i < len; i++) {
                    iterator.call(context, obj[i], i, obj);
                }
            } else {
                for (var key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        iterator.call(context, obj[key], key, obj);
                    }
                }
            }
        },

        isObject : function(obj) {
            return obj === Object(obj);
        },

        isArray : function(obj) {
            return obj instanceof Array;
        },

        // Can be TypedArray
        isArrayLike : function(obj) {
            if (!obj) {
                return false;
            } else {
                return obj.length === + obj.length;
            }
        },

        clone : function(obj) {
            if (!util.isObject(obj)) {
                return obj;
            } else if (util.isArray(obj)) {
                return obj.slice();
            } else if (util.isArrayLike(obj)) { // is typed array
                var ret = new obj.constructor(obj.length);
                for (var i = 0; i < obj.length; i++) {
                    ret[i] = obj[i];
                }
                return ret;
            } else {
                return util.extend({}, obj);
            }
        }
	}

    return util;
});
define('qtek/core/Base',['require','./mixin/derive','./mixin/notifier','./util'],function(require){

    var deriveMixin = require("./mixin/derive");
    var notifierMixin = require("./mixin/notifier");
    var util = require("./util");

    var Base = function(){
        this.__GUID__ = util.genGUID();
    }
    util.extend(Base, deriveMixin);
    util.extend(Base.prototype, notifierMixin);

    return Base;
});
define('qtek/physics/Collider',['require','qtek/core/Base'],function(require) {
    
    
    
    var Base = require('qtek/core/Base');

    var Collider = Base.derive({

        collisionObject : null,

        sceneNode : null,

        physicsMaterial : null,

        isKinematic : false,

        isStatic : false,

        isGhostObject : false,

        // Group and collision masks
        // http://bulletphysics.org/mediawiki-1.5.8/index.php/Collision_Filtering#Filtering_collisions_using_masks
        group : 1,

        collisionMask : 1,

        _dirty : true,

        _collisionHasCallback : false
    }, {

        on : function(name, action, context) {
            Base.prototype.on.call(this, name, action, context);
            this._collisionHasCallback = true;
            this._dirty = true;
        },

        off : function(name, action) {
            Base.prototype.off.call(this, name, action);
        },

        hasCollisionCallback : function() {
            return this._collisionHasCallback;
        }
    });

    Collider.events = ['collision'];

    return Collider;
});
define('qtek/math/Vector3',['require','glmatrix'],function(require) {
    
    

    var glMatrix = require("glmatrix");
    var vec3 = glMatrix.vec3;

    var Vector3 = function(x, y, z) {
        
        x = x || 0;
        y = y || 0;
        z = z || 0;

        this._array = vec3.fromValues(x, y, z);
        // Dirty flag is used by the Node to determine
        // if the localTransform is updated to latest
        this._dirty = true;
    }

    Vector3.prototype= {

        constructor : Vector3,

        get x() {
            return this._array[0];
        },

        set x(value) {
            this._array[0] = value;
            this._dirty = true;
        },

        get y() {
            return this._array[1];
        },

        set y(value) {
            this._array[1] = value;
            this._dirty = true;
        },

        get z() {
            return this._array[2];
        },

        set z(value) {
            this._array[2] = value;
            this._dirty = true;
        },

        add : function(b) {
            vec3.add(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        set : function(x, y, z) {
            this._array[0] = x;
            this._array[1] = y;
            this._array[2] = z;
            this._dirty = true;
            return this;
        },

        setArray : function(arr) {
            this._array[0] = arr[0];
            this._array[1] = arr[1];
            this._array[2] = arr[2];

            this._dirty = true;
            return this;
        },

        clone : function() {
            return new Vector3( this.x, this.y, this.z );
        },

        copy : function(b) {
            vec3.copy( this._array, b._array );
            this._dirty = true;
            return this;
        },

        cross : function(out, b) {
            vec3.cross(out._array, this._array, b._array);
            return this;
        },

        dist : function(b) {
            return vec3.dist(this._array, b._array);
        },

        distance : function(b) {
            return vec3.distance(this._array, b._array);
        },

        div : function(b) {
            vec3.div(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        divide : function(b) {
            vec3.divide(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        dot : function(b) {
            return vec3.dot(this._array, b._array);
        },

        len : function() {
            return vec3.len(this._array);
        },

        length : function() {
            return vec3.length(this._array);
        },
        /**
         * Perform linear interpolation between a and b
         */
        lerp : function(a, b, t) {
            vec3.lerp(this._array, a._array, b._array, t);
            this._dirty = true;
            return this;
        },

        min : function(b) {
            vec2.min(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        max : function(b) {
            vec2.max(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        mul : function(b) {
            vec3.mul(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        multiply : function(b) {
            vec3.multiply(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        negate : function() {
            vec3.negate(this._array, this._array);
            this._dirty = true;
            return this;
        },

        normalize : function() {
            vec3.normalize(this._array, this._array);
            this._dirty = true;
            return this;
        },

        random : function(scale) {
            vec3.random(this._array, scale);
            this._dirty = true;
            return this;
        },

        scale : function(s) {
            vec3.scale(this._array, this._array, s);
            this._dirty = true;
            return this;
        },
        /**
         * add b by a scaled factor
         */
        scaleAndAdd : function(b, s) {
            vec3.scaleAndAdd(this._array, this._array, b._array, s);
            this._dirty = true;
            return this;
        },

        sqrDist : function(b) {
            return vec3.sqrDist(this._array, b._array);
        },

        squaredDistance : function(b) {
            return vec3.squaredDistance(this._array, b._array);
        },

        sqrLen : function() {
            return vec3.sqrLen(this._array);
        },

        squaredLength : function() {
            return vec3.squaredLength(this._array);
        },

        sub : function(b) {
            vec3.sub(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        subtract : function(b) {
            vec3.subtract(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        transformMat3 : function(m) {
            vec3.transformMat3(this._array, this._array, m._array);
            this._dirty = true;
            return this;
        },

        transformMat4 : function(m) {
            vec3.transformMat4(this._array, this._array, m._array);
            this._dirty = true;
            return this;
        },

        transformQuat : function(q) {
            vec3.transformQuat(this._array, this._array, q._array);
            this._dirty = true;
            return this;
        },

        applyProjection : function(m) {
            var v = this._array;
            m = m._array;

            // Perspective projection
            if (m[15] === 0) {
                var w = -1 / v[2];
                v[0] = m[0] * v[0] * w;
                v[1] = m[5] * v[1] * w;
                v[2] = (m[10] * v[2] + m[14]) * w;
            } else {
                v[0] = m[0] * v[0] + m[12];
                v[1] = m[5] * v[1] + m[13];
                v[2] = m[10] * v[2] + m[14];
            }
            this._dirty = true;

            return this;
        },
        /**
         * Set euler angle from queternion
         */
        setEulerFromQuaternion : function(q) {
            // var sqx = q.x * q.x;
            // var sqy = q.y * q.y;
            // var sqz = q.z * q.z;
            // var sqw = q.w * q.w;
            // this.x = Math.atan2( 2 * ( q.y * q.z + q.x * q.w ), ( -sqx - sqy + sqz + sqw ) );
            // this.y = Math.asin( -2 * ( q.x * q.z - q.y * q.w ) );
            // this.z = Math.atan2( 2 * ( q.x * q.y + q.z * q.w ), ( sqx - sqy - sqz + sqw ) );

            // return this;
        },

        toString : function() {
            return "[" + Array.prototype.join.call(this._array, ",") + "]";
        },
    }

    function clamp( x ) {
        return Math.min( Math.max( x, -1 ), 1 );
    }

    Vector3.POSITIVE_X = new Vector3(1, 0, 0);
    Vector3.NEGATIVE_X = new Vector3(-1, 0, 0);
    Vector3.POSITIVE_Y = new Vector3(0, 1, 0);
    Vector3.NEGATIVE_Y = new Vector3(0, -1, 0);
    Vector3.POSITIVE_Z = new Vector3(0, 0, 1);
    Vector3.NEGATIVE_Z = new Vector3(0, 0, -1);

    Vector3.UP = new Vector3(0, 1, 0);
    Vector3.ZERO = new Vector3(0, 0, 0);

    return Vector3;
} );
define('qtek/physics/ContactPoint',['require','qtek/math/Vector3'],function(contactPoint) {

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
define('qtek/physics/AmmoEngineConfig.js',[],function () { return '\'use strict\';\n\n// Data format\n// Command are transferred in batches\n// ncmd - [cmd chunk][cmd chunk]...\n// Add rigid body :\n//      ------header------ \n//      cmdtype(1)\n//      idx(1)\n//      32 bit mask(1)\n//          But because it is stored in Float, so it can only use at most 24 bit (TODO)\n//      -------body-------\n//      collision flag(1)\n//      ...\n//      collision shape guid(1)\n//      shape type(1)\n//      ...\n// Remove rigid body:\n//      cmdtype(1)\n//      idx(1)\n//      \n// Mod rigid body :\n//      ------header------\n//      cmdtype(1)\n//      idx(1)\n//      32 bit mask(1)\n//      -------body-------\n//      ...\n//      \n// Step\n//      cmdtype(1)\n//      timeStep(1)\n//      maxSubSteps(1)\n//      fixedTimeStep(1)\n\nthis.CMD_ADD_COLLIDER = 1;\nthis.CMD_REMOVE_COLLIDER = 2;\nthis.CMD_MOD_COLLIDER = 3;\nthis.CMD_SYNC_MOTION_STATE = 4;\nthis.CMD_STEP_TIME = 5;\nthis.CMD_COLLISION_CALLBACK = 6;\n\nthis.CMD_SYNC_INERTIA_TENSOR = 7;\n\n// Step\nthis.CMD_STEP = 10;\n// Ray test\nthis.CMD_RAYTEST_CLOSEST = 11;\nthis.CMD_RAYTEST_ALL = 12;\n\n// Shape types\nthis.SHAPE_BOX = 0;\nthis.SHAPE_SPHERE = 1;\nthis.SHAPE_CYLINDER = 2;\nthis.SHAPE_CONE = 3;\nthis.SHAPE_CAPSULE = 4;\nthis.SHAPE_CONVEX_TRIANGLE_MESH = 5;\nthis.SHAPE_CONVEX_HULL = 6;\nthis.SHAPE_STATIC_PLANE = 7;\nthis.SHAPE_BVH_TRIANGLE_MESH = 8;\n\n// Rigid Body properties and bit mask\n// 1. Property name\n// 2. Property size\n// 3. Mod bit mask, to check if part of rigid body needs update\nthis.RIGID_BODY_PROPS = [\n    [\'linearVelocity\', 3, 0x1],\n    [\'angularVelocity\', 3, 0x2],\n    [\'linearFactor\', 3, 0x4],\n    [\'angularFactor\', 3, 0x8],\n    [\'centerOfMass\', 3, 0x10],\n    [\'localInertia\', 3, 0x20],\n    [\'massAndDamping\', 3, 0x40],\n    [\'totalForce\', 3, 0x80],\n    [\'totalTorque\', 3, 0x100]\n];\n\nthis.RIGID_BODY_PROP_MOD_BIT = {};\nthis.RIGID_BODY_PROPS.forEach(function(item) {\n    this.RIGID_BODY_PROP_MOD_BIT[item[0]] = item[2];\n}, this);\n\nthis.SHAPE_MOD_BIT = 0x200;\nthis.MATERIAL_MOD_BIT = 0x400;\nthis.COLLISION_FLAG_MOD_BIT = 0x800;\n\nthis.MOTION_STATE_MOD_BIT = 0x1000;\n\nthis.MATERIAL_PROPS = [\n    [\'friction\', 1],\n    [\'bounciness\', 1],\n];\n\n// Collision Flags\nthis.COLLISION_FLAG_STATIC = 0x1;\nthis.COLLISION_FLAG_KINEMATIC = 0x2;\nthis.COLLISION_FLAG_GHOST_OBJECT = 0x4;\n\nthis.COLLISION_FLAG_HAS_CALLBACK = 0x200;\n\n// Collision Status\nthis.COLLISION_STATUS_ENTER = 1;\nthis.COLLISION_STATUS_STAY = 2;\nthis.COLLISION_STATUS_LEAVE = 3;\n';});

define('qtek/physics/AmmoEngineWorker.js',[],function () { return '\'use strict\';\n\n// TODO\n// importScripts(\'./AmmoEngineConfig.js\');\n\n/********************************************\n            Global Objects\n ********************************************/\n\nfunction PhysicsObject(collisionObject, transform) {\n\n    this.__idx__ = 0;\n\n    this.collisionObject = collisionObject || null;\n    this.transform = transform || null;\n\n    this.collisionStatus = [];\n\n    this.isGhostObject = false;\n    this.hasCallback = false;\n}\n\nvar g_objectsList = [];\nvar g_shapes = {};\n    \n// Map to store the ammo objects which key is the ptr of body\nvar g_ammoPtrIdxMap = {};\n\n// World objects\nvar g_dispatcher = null;\nvar g_world = null;\nvar g_ghostPairCallback = null;\n\n/********************************************\n            Buffer Object\n ********************************************/\n\n function g_Buffer() {\n\n    this.array = [];\n    this.offset = 0;\n}\n\ng_Buffer.prototype = {\n\n    constructor : g_Buffer,\n    \n    packScalar : function(scalar) {\n        this.array[this.offset++] = scalar;\n    },\n\n    packVector2 : function(vector) {\n        this.array[this.offset++] = vector.getX();\n        this.array[this.offset++] = vector.getY();\n    },\n\n    packVector3 : function(vector) {\n        this.array[this.offset++] = vector.getX();\n        this.array[this.offset++] = vector.getY();\n        this.array[this.offset++] = vector.getZ();\n    },\n\n    packVector4 : function(vector) {\n        this.array[this.offset++] = vector.getX();\n        this.array[this.offset++] = vector.getY();\n        this.array[this.offset++] = vector.getZ();\n        this.array[this.offset++] = vector.getW();\n    },\n\n    packMatrix3x3 : function(m3x3) {\n        this.packVector3(m3x3.getColumn(0));\n        this.packVector3(m3x3.getColumn(1));\n        this.packVector3(m3x3.getColumn(2));\n    },\n\n    toFloat32Array : function() {\n        this.array.length = this.offset;\n        return new Float32Array(this.array);\n    }\n}\n\nvar g_stepBuffer = new g_Buffer();\nvar g_inertiaTensorBuffer = new g_Buffer();\nvar g_rayTestBuffer = new g_Buffer();\n\n\n/********************************************\n            Message Dispatcher\n ********************************************/\n\nonmessage = function(e) {\n    // Init the word\n    if (e.data.__init__) {\n        cmd_InitAmmo(e.data.ammoUrl, e.data.gravity);\n        return;\n    }\n\n    var buffer = new Float32Array(e.data);\n    \n    var nChunk = buffer[0];\n\n    var offset = 1;\n    var haveStep = false;\n    var stepTime, maxSubSteps, fixedTimeStep;\n    var addedCollisonObjects = [];\n    for (var i = 0; i < nChunk; i++) {\n        var cmdType = buffer[offset++];\n        // Dispatch\n        switch(cmdType) {\n            case CMD_ADD_COLLIDER:\n                offset = cmd_AddCollisionObject(buffer, offset, addedCollisonObjects);\n                break;\n            case CMD_REMOVE_COLLIDER:\n                offset = cmd_RemoveCollisionObject(buffer, offset);\n                break;\n            case CMD_MOD_COLLIDER:\n                offset = cmd_ModCollisionObject(buffer, offset);\n                break;\n            case CMD_STEP:\n                haveStep = true;\n                stepTime = buffer[offset++];\n                maxSubSteps = buffer[offset++];\n                fixedTimeStep = buffer[offset++];\n                break;\n            case CMD_RAYTEST_ALL:\n            case CMD_RAYTEST_CLOSEST:\n                offset = cmd_Raytest(buffer, offset, cmdType === CMD_RAYTEST_CLOSEST);\n                break;\n            default:\n        }\n    }\n\n    // Sync back inertia tensor\n    // Calculating torque needs this stuff\n    if (addedCollisonObjects.length > 0) { \n        g_inertiaTensorBuffer.offset = 0;\n        g_inertiaTensorBuffer.packScalar(1); // nChunk\n        g_inertiaTensorBuffer.packScalar(CMD_SYNC_INERTIA_TENSOR);   // Command\n        g_inertiaTensorBuffer.packScalar(0); // nBody\n        var nBody = 0;\n        for (var i = 0; i < addedCollisonObjects.length; i++) {\n            var co = addedCollisonObjects[i];\n            var body = co.collisionObject;\n            if (body.getInvInertiaTensorWorld) {\n                var m3x3 = body.getInvInertiaTensorWorld();\n                g_inertiaTensorBuffer.packScalar(co.__idx__);\n                g_inertiaTensorBuffer.packMatrix3x3(m3x3);\n                nBody++;\n            }\n        }\n        g_inertiaTensorBuffer.array[2] = nBody;\n        var array = g_inertiaTensorBuffer.toFloat32Array();\n        postMessage(array.buffer, [array.buffer]);\n    }\n\n    // Lazy execute\n    if (haveStep) {\n        g_stepBuffer.offset = 0;\n        cmd_Step(stepTime, maxSubSteps, fixedTimeStep);\n    }\n}\n\n/********************************************\n            Util Functions\n ********************************************/\n\nfunction _unPackVector3(buffer, offset) {\n    return new Ammo.btVector3(buffer[offset++], buffer[offset++], buffer[offset]);\n}\n\nfunction _setVector3(vec, buffer, offset) {\n    vec.setValue(buffer[offset++], buffer[offset++], buffer[offset++]);\n    return offset;\n}\n\nfunction _setVector4(vec, buffer, offset) {\n    vec.setValue(buffer[offset++], buffer[offset++], buffer[offset++], buffer[offset++]);\n    return offset;\n}\n\nfunction _createShape(buffer, offset) {\n    // Shape\n    var shapeId = buffer[offset++];\n    var shapeType = buffer[offset++];\n    var shape = g_shapes[shapeId];\n    if (!shape) {\n        switch(shapeType) {\n            case SHAPE_SPHERE:\n                shape = new Ammo.btSphereShape(buffer[offset++]);\n                break;\n            case SHAPE_BOX:\n                shape = new Ammo.btBoxShape(_unPackVector3(buffer, offset));\n                offset += 3;\n                break;\n            case SHAPE_CYLINDER:\n                shape = new Ammo.btCylinderShape(_unPackVector3(buffer, offset));\n                offset += 3;\n                break;\n            case SHAPE_CONE:\n                shape = new Ammo.btConeShape(buffer[offset++], buffer[offset++]);\n                break;\n            case SHAPE_CAPSULE:\n                shape = new Ammo.btCapsuleShape(buffer[offset++], buffer[offset++]);\n                break;\n            case SHAPE_CONVEX_TRIANGLE_MESH:\n            case SHAPE_BVH_TRIANGLE_MESH:\n                var nTriangles = buffer[offset++];\n                var nVertices = buffer[offset++];\n                var indexStride = 3 * 4;\n                var vertexStride = 3 * 4;\n                \n                var triangleIndices = buffer.subarray(offset, offset + nTriangles * 3);\n                offset += nTriangles * 3;\n                var indicesPtr = Ammo.allocate(indexStride * nTriangles, \'i32\', Ammo.ALLOC_NORMAL);\n                for (var i = 0; i < triangleIndices.length; i++) {\n                    Ammo.setValue(indicesPtr + i * 4, triangleIndices[i], \'i32\');\n                }\n\n                var vertices = buffer.subarray(offset, offset + nVertices * 3);\n                offset += nVertices * 3;\n                var verticesPtr = Ammo.allocate(vertexStride * nVertices, \'float\', Ammo.ALLOC_NORMAL);\n                for (var i = 0; i < vertices.length; i++) {\n                    Ammo.setValue(verticesPtr + i * 4, vertices[i], \'float\');\n                }\n\n                var indexVertexArray = new Ammo.btTriangleIndexVertexArray(nTriangles, indicesPtr, indexStride, nVertices, verticesPtr, vertexStride);\n                // TODO Cal AABB ?\n                if (shapeType === SHAPE_CONVEX_TRIANGLE_MESH) {\n                    shape = new Ammo.btConvexTriangleMeshShape(indexVertexArray, true);\n                } else {\n                    shape = new Ammo.btBvhTriangleMeshShape(indexVertexArray, true, true);\n                }\n                break;\n            case SHAPE_CONVEX_HULL:\n                var nPoints = buffer[offset++];\n                var stride = 3 * 4;\n                var points = buffer.subarray(offset, offset + nPoints * 3);\n                offset += nPoints * 3;\n                var pointsPtr = Ammo.allocate(stride * nPoints, \'float\', Ammo.ALLOC_NORMAL);\n                for (var i = 0; i < points.length; i++) {\n                    Ammo.setValue(pointsPtr + i * 4, points[i], \'float\');\n                }\n\n                shape = new Ammo.btConvexHullShape(pointsPtr, nPoints, stride);\n                break;\n            case SHAPE_STATIC_PLANE:\n                var normal = _unPackVector3(buffer, offset);\n                offset+=3;\n                shape = new Ammo.btStaticPlaneShape(normal, buffer[offset++]);\n                break;\n            default:\n                throw new Error(\'Unknown type \' + shapeType);\n                break;\n        }\n\n        g_shapes[shapeId] = shape;\n    } else {\n        switch(shapeType) {\n            case SHAPE_SPHERE:\n                offset++;\n                break;\n            case SHAPE_BOX:\n            case SHAPE_CYLINDER:\n                offset += 3;\n                break;\n            case SHAPE_CONE:\n            case SHAPE_CAPSULE:\n                offset += 2;\n                break;\n            case SHAPE_CONVEX_TRIANGLE_MESH:\n            case SHAPE_BVH_TRIANGLE_MESH:\n                var nTriangles = buffer[offset++];\n                var nVertices = buffer[offset++];\n                offset += nTriangles * 3 + nVertices * 3;\n                break;\n            case SHAPE_CONVEX_HULL:\n                var nPoints = buffer[offset++];\n                offset += nPoints * 3;\n                break;\n            case SHAPE_STATIC_PLANE:\n                offset += 4;\n                break;\n            default:\n                throw new Error(\'Unknown type \' + shapeType);\n                break;\n        }\n    }\n\n    return [shape, offset];\n}\n\n/********************************************\n                COMMANDS\n ********************************************/\n\nfunction cmd_InitAmmo(ammoUrl, gravity) {\n    importScripts(ammoUrl);\n    if (!gravity) {\n        gravity = [0, -10, 0];\n    }\n\n    var broadphase = new Ammo.btDbvtBroadphase();\n    var collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();\n    g_dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);\n    var solver = new Ammo.btSequentialImpulseConstraintSolver();\n    g_world = new Ammo.btDiscreteDynamicsWorld(g_dispatcher, broadphase, solver, collisionConfiguration);\n    g_world.setGravity(new Ammo.btVector3(gravity[0], gravity[1], gravity[2]));\n\n    postMessage({\n        __init__ : true\n    });\n}\n\nfunction cmd_AddCollisionObject(buffer, offset, out) {\n    var idx = buffer[offset++];\n    var bitMask = buffer[offset++];\n\n    var collisionFlags = buffer[offset++];\n    var isGhostObject = COLLISION_FLAG_GHOST_OBJECT & collisionFlags;\n    var hasCallback = COLLISION_FLAG_HAS_CALLBACK & collisionFlags;\n\n    var group = buffer[offset++];\n    var collisionMask = buffer[offset++];\n\n    if (MOTION_STATE_MOD_BIT & bitMask) {\n        var origin = new Ammo.btVector3(buffer[offset++], buffer[offset++], buffer[offset++]);\n        var quat = new Ammo.btQuaternion(buffer[offset++], buffer[offset++], buffer[offset++], buffer[offset++]);\n        var transform = new Ammo.btTransform(quat, origin);\n    } else {\n        var transform = new Ammo.btTransform();\n    }\n\n    if (!isGhostObject) {\n        var motionState = new Ammo.btDefaultMotionState(transform);\n\n        if (RIGID_BODY_PROP_MOD_BIT.linearVelocity & bitMask) {\n            var linearVelocity = _unPackVector3(buffer, offset);\n            offset += 3;\n        }\n        if (RIGID_BODY_PROP_MOD_BIT.angularVelocity & bitMask) {\n            var angularVelocity = _unPackVector3(buffer, offset);\n            offset += 3;\n        }\n        if (RIGID_BODY_PROP_MOD_BIT.linearFactor & bitMask) {\n            var linearFactor = _unPackVector3(buffer, offset);\n            offset += 3;\n        }\n        if (RIGID_BODY_PROP_MOD_BIT.angularFactor & bitMask) {\n            var angularFactor = _unPackVector3(buffer, offset);\n            offset += 3;\n        }\n        if (RIGID_BODY_PROP_MOD_BIT.centerOfMass & bitMask) {\n            // TODO\n            // centerOfMass = _unPackVector3(buffer, offset);\n            offset += 3;\n        }\n        if (RIGID_BODY_PROP_MOD_BIT.localInertia & bitMask) {\n            var localInertia = _unPackVector3(buffer, offset);\n            offset += 3;\n        }\n        if (RIGID_BODY_PROP_MOD_BIT.massAndDamping & bitMask) {\n            var massAndDamping = _unPackVector3(buffer, offset);\n            offset += 3;\n        }\n        if (RIGID_BODY_PROP_MOD_BIT.totalForce & bitMask) {\n            var totalForce = _unPackVector3(buffer, offset);\n            offset += 3;\n        }\n        if (RIGID_BODY_PROP_MOD_BIT.totalTorque & bitMask) {\n            var totalTorque = _unPackVector3(buffer, offset);\n            offset += 3;\n        }\n    }\n\n    var res = _createShape(buffer, offset);\n    var shape = res[0];\n    offset = res[1];\n\n    if (massAndDamping) {\n        var mass = massAndDamping.getX();\n    } else {\n        var mass = 0;\n    }\n\n    var physicsObject;\n    if (!isGhostObject) {\n        if (!localInertia) {\n            localInertia = new Ammo.btVector3(0, 0, 0);\n            if (mass !== 0) { // Is dynamic\n                shape.calculateLocalInertia(mass, localInertia);\n            }\n        }\n        var rigidBodyInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, shape, localInertia);\n        var rigidBody = new Ammo.btRigidBody(rigidBodyInfo);\n\n        rigidBody.setCollisionFlags(collisionFlags);\n\n        linearVelocity && rigidBody.setLinearVelocity(linearVelocity);\n        angularVelocity && rigidBody.setAngularVelocity(angularVelocity);\n        linearFactor && rigidBody.setLinearFactor(linearFactor);\n        angularFactor && rigidBody.setAngularFactor(angularFactor);\n        if (massAndDamping) {\n            rigidBody.setDamping(massAndDamping.getY(), massAndDamping.getZ());\n        }\n        totalForce && rigidBody.applyCentralForce(totalForce);\n        totalTorque && rigidBody.applyTorque(totalTorque);\n\n        rigidBody.setFriction(buffer[offset++]);\n        rigidBody.setRestitution(buffer[offset++]);\n\n        physicsObject = new PhysicsObject(rigidBody, transform);\n        physicsObject.hasCallback = hasCallback;\n        g_objectsList[idx] = physicsObject;\n        g_ammoPtrIdxMap[rigidBody.ptr] = idx;\n        // TODO\n        // g_world.addRigidBody(rigidBody, group, collisionMask);\n        g_world.addRigidBody(rigidBody);\n    } else {\n        // TODO What\'s the difference of Pair Caching Ghost Object ?\n        var ghostObject = new Ammo.btPairCachingGhostObject();\n        ghostObject.setCollisionShape(shape);\n        ghostObject.setWorldTransform(transform);\n\n        physicsObject = new PhysicsObject(ghostObject, transform);\n        physicsObject.hasCallback = hasCallback;\n        physicsObject.isGhostObject = true;\n        g_objectsList[idx] = physicsObject;\n        // TODO\n        // g_world.addCollisionObject(ghostObject, group, collisionMask);\n        g_world.addCollisionObject(ghostObject);\n\n        g_ammoPtrIdxMap[ghostObject.ptr] = idx;\n        // TODO\n        if (!g_ghostPairCallback) {\n            g_ghostPairCallback = new Ammo.btGhostPairCallback();\n            g_world.getPairCache().setInternalGhostPairCallback(g_ghostPairCallback);\n        }\n    }\n\n    physicsObject.__idx__ = idx;\n    out.push(physicsObject);\n\n    return offset;\n}\n\n\n// TODO destroy ?\nfunction cmd_RemoveCollisionObject(buffer, offset) {\n    var idx = buffer[offset++];\n    var obj = g_objectsList[idx];\n    g_objectsList[idx] = null;\n    if (obj.isGhostObject) {\n        g_world.removeCollisionObject(obj.collisionObject);\n    } else {\n        g_world.removeRigidBody(obj.collisionObject);\n    }\n    return offset;\n}\n\nfunction cmd_ModCollisionObject(buffer, offset) {\n    var idx = buffer[offset++];\n    var bitMask = buffer[offset++];\n\n    var obj = g_objectsList[idx];\n    var collisionObject = obj.collisionObject;\n    var bodyNeedsActive = false;\n\n    if (COLLISION_FLAG_MOD_BIT & bitMask) {\n        var collisionFlags = buffer[offset++];\n        collisionObject.setCollisionFlags(collisionFlags);\n\n        obj.hasCallback = collisionFlags & COLLISION_FLAG_HAS_CALLBACK;\n        obj.isGhostObject = collisionFlags & COLLISION_FLAG_GHOST_OBJECT;\n    }\n    if (MOTION_STATE_MOD_BIT & bitMask) {\n        var motionState = collisionObject.getMotionState();\n        var transform = obj.transform;\n        motionState.getWorldTransform(transform);\n        offset = _setVector3(transform.getOrigin(), buffer, offset);\n        offset = _setVector4(transform.getRotation(), buffer, offset);\n        motionState.setWorldTransform(transform);\n    }\n\n    if (RIGID_BODY_PROP_MOD_BIT.linearVelocity & bitMask) {\n        offset = _setVector3(collisionObject.getLinearVelocity(), buffer, offset);\n        bodyNeedsActive = true;\n    }\n    if (RIGID_BODY_PROP_MOD_BIT.angularVelocity & bitMask) {\n        offset = _setVector3(collisionObject.getAngularVelocity(), buffer, offset);\n        bodyNeedsActive = true;\n    }\n    if (RIGID_BODY_PROP_MOD_BIT.linearFactor & bitMask) {\n        offset = _setVector3(collisionObject.getLinearFactor(), buffer, offset);\n    }\n    if (RIGID_BODY_PROP_MOD_BIT.angularFactor & bitMask) {\n        offset = _setVector3(collisionObject.getAngularFactor(), buffer, offset);\n    }\n    if (RIGID_BODY_PROP_MOD_BIT.centerOfMass & bitMask) {\n        // TODO\n        offset += 3;\n    }\n    if (RIGID_BODY_PROP_MOD_BIT.localInertia & bitMask) {\n        // TODO\n        offset += 3;\n    }\n    if (RIGID_BODY_PROP_MOD_BIT.massAndDamping & bitMask) {\n        // TODO MASS\n        var mass = buffer[offset++];\n        collisionObject.setDamping(buffer[offset++], buffer[offset++]);\n    }\n    if (RIGID_BODY_PROP_MOD_BIT.totalForce & bitMask) {\n        offset = _setVector3(collisionObject.getTotalForce(), buffer, offset);\n        bodyNeedsActive = true;\n    }\n    if (RIGID_BODY_PROP_MOD_BIT.totalTorque & bitMask) {\n        offset = _setVector3(collisionObject.getTotalTorque(), buffer, offset);\n        bodyNeedsActive = true;\n    }\n\n    if (bodyNeedsActive) {\n        collisionObject.activate();\n    }\n\n    // Shape\n    if (SHAPE_MOD_BIT & bitMask) {\n        var res = _createShape(buffer, offset);\n        var shape = res[0];\n        offset = res[1];\n        collisionObject.setCollisionShape(shape);\n    }\n    if (MATERIAL_MOD_BIT & bitMask) {\n        collisionObject.setFriction(buffer[offset++]);\n        collisionObject.setRestitution(buffer[offset++]);\n    }\n \n    return offset;\n}\n\nfunction cmd_Step(timeStep, maxSubSteps, fixedTimeStep) {\n\n    var startTime = new Date().getTime();\n    g_world.stepSimulation(timeStep, maxSubSteps, fixedTimeStep);\n    var stepTime = new Date().getTime() - startTime;\n\n    var nChunk = 3;\n    g_stepBuffer.packScalar(nChunk);\n\n    // Sync Motion State\n    g_stepBuffer.packScalar(CMD_SYNC_MOTION_STATE);\n    var nObjects = 0;\n    var nObjectsOffset = g_stepBuffer.offset;\n    g_stepBuffer.packScalar(nObjects);\n\n    for (var i = 0; i < g_objectsList.length; i++) {\n        var obj = g_objectsList[i];\n        if (!obj) {\n            continue;\n        }\n        var collisionObject = obj.collisionObject;\n        if (collisionObject.isStaticOrKinematicObject()) {\n            continue;\n        }\n        // Idx\n        g_stepBuffer.packScalar(i);\n        var motionState = collisionObject.getMotionState();\n        motionState.getWorldTransform(obj.transform);\n\n        g_stepBuffer.packVector3(obj.transform.getOrigin());\n        g_stepBuffer.packVector4(obj.transform.getRotation());\n        nObjects++;\n    }\n    g_stepBuffer.array[nObjectsOffset] = nObjects;\n\n    // Return step time\n    g_stepBuffer.packScalar(CMD_STEP_TIME);\n    g_stepBuffer.packScalar(stepTime);\n\n    // Tick callback\n    _tickCallback(g_world);\n\n    var array = g_stepBuffer.toFloat32Array();\n\n    postMessage(array.buffer, [array.buffer]);\n}\n\n// nmanifolds - [idxA - idxB - ncontacts - [pA - pB - normal]... ]...\nfunction _tickCallback(world) {\n\n    g_stepBuffer.packScalar(CMD_COLLISION_CALLBACK);\n\n    var nManifolds = g_dispatcher.getNumManifolds();\n    var nCollision = 0;\n    var tickCmdOffset = g_stepBuffer.offset;\n    g_stepBuffer.packScalar(0);  //nManifolds place holder\n\n    for (var i = 0; i < nManifolds; i++) {\n        var contactManifold = g_dispatcher.getManifoldByIndexInternal(i);\n        var obAPtr = contactManifold.getBody0();\n        var obBPtr = contactManifold.getBody1();\n\n        var nContacts = contactManifold.getNumContacts();\n\n        if (nContacts > 0) {\n            var obAIdx = g_ammoPtrIdxMap[obAPtr];\n            var obBIdx = g_ammoPtrIdxMap[obBPtr];\n\n            var obA = g_objectsList[obAIdx];\n            var obB = g_objectsList[obBIdx];\n\n            if (obA.hasCallback || obB.hasCallback) {\n                var chunkStartOffset = g_stepBuffer.offset;\n                if (_packContactManifold(contactManifold, chunkStartOffset, obAIdx, obBIdx)) {\n                    nCollision++;\n                }\n            }\n        }\n    }\n\n    g_stepBuffer.array[tickCmdOffset] = nCollision;\n}\n\nfunction _packContactManifold(contactManifold, offset, obAIdx, obBIdx) {\n    // place holder for idxA, idxB, nContacts\n    g_stepBuffer.offset += 3;\n    var nActualContacts = 0;\n    var nContacts = contactManifold.getNumContacts();\n    for (var j = 0; j < nContacts; j++) {\n        var cp = contactManifold.getContactPoint(j);\n\n        if (cp.getDistance() <= 0) {\n            var pA = cp.getPositionWorldOnA();\n            var pB = cp.getPositionWorldOnB();\n            var normal = cp.get_m_normalWorldOnB();\n\n            g_stepBuffer.packVector3(pA);\n            g_stepBuffer.packVector3(pB);\n            g_stepBuffer.packVector3(normal);\n            nActualContacts++;\n        }\n    }\n\n    if (nActualContacts > 0) {\n        g_stepBuffer.array[offset] = obAIdx;\n        g_stepBuffer.array[offset+1] = obBIdx;\n        g_stepBuffer.array[offset+2] = nActualContacts;\n\n        return true;\n    } else {\n        g_stepBuffer.offset -= 3;\n        return false;\n    }\n}\n\nvar rayStart = null;\nvar rayEnd = null;\nfunction cmd_Raytest(buffer, offset, isClosest) {\n    if (!rayStart) {\n        rayStart = new Ammo.btVector3();\n        rayEnd = new Ammo.btVector3();\n    }\n    var cbIdx = buffer[offset++];\n    rayStart.setValue(buffer[offset++], buffer[offset++], buffer[offset++]);\n    rayEnd.setValue(buffer[offset++], buffer[offset++], buffer[offset++]);\n\n    g_rayTestBuffer.offset = 0;\n    g_rayTestBuffer.packScalar(1);\n    g_rayTestBuffer.packScalar(isClosest ? CMD_RAYTEST_CLOSEST : CMD_RAYTEST_ALL);\n    g_rayTestBuffer.packScalar(cbIdx);\n\n    if (isClosest) {\n        var callback = new Module.ClosestRayResultCallback(rayStart, rayEnd);\n        var colliderIdx = -1;\n        g_world.rayTest(rayStart, rayEnd, callback);\n        if (callback.hasHit()) {\n            var co = callback.get_m_collisionObject();\n            colliderIdx = g_ammoPtrIdxMap[co.ptr];\n            g_rayTestBuffer.packScalar(colliderIdx);\n            // hit point\n            g_rayTestBuffer.packVector3(callback.get_m_hitPointWorld());\n            // hit normal\n            g_rayTestBuffer.packVector3(callback.get_m_hitNormalWorld());\n        }\n\n        var array = g_rayTestBuffer.toFloat32Array();\n        postMessage(array.buffer, [array.buffer]);\n    } else {\n        var callback = new Module.AllHitsRayResultCallback(rayStart, rayEnd);\n        g_world.rayTest(rayStart, rayEnd, callback);\n        if (callback.hasHit()) {\n            // TODO\n        }\n    }\n\n    return offset;\n}';});

define('qtek/physics/Shape',['require','qtek/core/Base'],function(require) {

    
    
    var Base = require('qtek/core/Base');

    var Shape = Base.derive({}, {
        dirty : function() {
            this._dirty = true;
        }
    });

    return Shape;
});
define('qtek/physics/shape/Box',['require','../Shape','qtek/math/Vector3'],function(require) {

    
    
    var Shape = require('../Shape');
    var Vector3 = require('qtek/math/Vector3');

    var BoxShape = Shape.derive({
        
        halfExtents : null

    }, function() {

        if (!this.halfExtents) {
            this.halfExtents = new Vector3(1, 1, 1);
        }

    });

    Object.defineProperty(BoxShape.prototype, 'width', {
        get : function() {
            return this.halfExtents._array[0] * 2;
        },
        set : function(value) {
            this.halfExtents._array[0] = value / 2;
            this.halfExtents._dirty = true;
        }
    });
    Object.defineProperty(BoxShape.prototype, 'height', {
        get : function() {
            return this.halfExtents._array[1] * 2;
        },
        set : function(value) {
            this.halfExtents._array[1] = value / 2;
            this.halfExtents._dirty = true;
        }
    });
    Object.defineProperty(BoxShape.prototype, 'depth', {
        get : function() {
            return this.halfExtents._array[2] * 2;
        },
        set : function(value) {
            this.halfExtents._array[2] = value / 2;
            this.halfExtents._dirty = true;
        }
    });

    return BoxShape;
});
define('qtek/physics/shape/Capsule',['require','../Shape','qtek/math/Vector3'],function (require) {
    
    
    
    var Shape = require('../Shape');
    var Vector3 = require('qtek/math/Vector3');

    var CapsuleShape = Shape.derive({

        _radius : 1,
        
        _height : 1,

        _dirty : true
    });

    Object.defineProperty(CapsuleShape.prototype, 'radius', {
        get : function() {
            return this._radius;
        },
        set : function(value) {
            this._radius = value;
            this._dirty = true;
        }
    });

    Object.defineProperty(CapsuleShape.prototype, 'height', {
        get : function() {
            return this._height;
        },
        set : function(value) {
            this._height = value;
            this._dirty = true;
        }
    })

    Object.defineProperty(CapsuleShape.prototype, 'halfHeight', {
        get : function() {
            return this._height / 2;
        },
        set : function(value) {
            this._height = value * 2;
            this._dirty = true;
        }
    });

    return CapsuleShape;
});
define('qtek/physics/shape/Cone',['require','../Shape','qtek/math/Vector3'],function (require) {
    
    
    
    var Shape = require('../Shape');
    var Vector3 = require('qtek/math/Vector3');

    var ConeShape = Shape.derive({

        _radius : 1,
        
        _height : 1,

        _dirty : true
    });

    Object.defineProperty(ConeShape.prototype, 'radius', {
        get : function() {
            return this._radius;
        },
        set : function(value) {
            this._radius = value;
            this._dirty = true;
        }
    });
    Object.defineProperty(ConeShape.prototype, 'height', {
        get : function() {
            return this._height;
        },
        set : function(value) {
            this._height = value;
            this._dirty = true;
        }
    });

    return ConeShape;
});
define('qtek/physics/shape/Cylinder',['require','../Shape','qtek/math/Vector3'],function (require) {
    
    
    
    var Shape = require('../Shape');
    var Vector3 = require('qtek/math/Vector3');

    // TODO margin
    var CylinderShape = Shape.derive({

        halfExtents : null,

        _upAxis : 1,

        _dirty : true,

        _radiusIdx : 0,
        _heightIdx : 1

    }, function() {
        if (!this.halfExtents) {
            this.halfExtents = new Vector3(1, 1, 1)
        }
    });

    Object.defineProperty(CylinderShape.prototype, 'radius', {
        get : function() {
            return this.halfExtents._array[this._radiusIdx];
        },
        set : function(value) {
            this.halfExtents._array[this._radiusIdx] = value;
            this.halfExtents._dirty = true;
        }
    });
    Object.defineProperty(CylinderShape.prototype, 'height', {
        get : function() {
            return this.halfExtents._array[this._heightIdx] * 2;
        },
        set : function(value) {
            this.halfExtents._array[this._heightIdx] = value / 2;
            this.halfExtents._dirty = true;
        }
    });
    Object.defineProperty(CylinderShape.prototype, 'upAxis', {
        set : function(value) {
            switch(value) {
                case 0: // Align along x
                    this._radiusIdx = 1;
                    this._heightIdx = 0;
                    break;
                case 2: // Align along z
                    this._radiusIdx = 0;
                    this._heightIdx = 2;
                    break;
                default: // Align along y
                    this._radiusIdx = 0;
                    this._heightIdx = 1;
            }

            this._upAxis = value;
            this._dirty = true;
        },
        get : function() {
            return this._upAxis;
        }
    });

    return CylinderShape;
});
define('qtek/physics/shape/Sphere',['require','../Shape'],function (require) {
    
    
    
    var Shape = require('../Shape');

    var SphereShape = Shape.derive({

        _radius : 1,
        
        _dirty : true
    });

    Object.defineProperty(SphereShape.prototype, 'radius', {
        get : function() {
            return this._radius;
        },
        set : function(value) {
            this._radius = value;
            this._dirty = true;
        }
    });
    
    return SphereShape;
});
define('qtek/math/Plane',['require','./Vector3','glmatrix'],function(require) {

    var Vector3 = require('./Vector3');
    var glmatrix = require('glmatrix');
    var vec3 = glmatrix.vec3;
    var mat4 = glmatrix.mat4;
    var vec4 = glmatrix.vec4;

    var Plane = function(normal, distance) {
        this.normal = normal || new Vector3(0, 1, 0);
        this.distance = distance || 0;
    }

    Plane.prototype = {

        constructor : Plane,

        distanceToPoint : function(point) {
            return vec3.dot(point._array, this.normal._array) - this.distance;
        },

        projectPoint : function(point, out) {
            if (!out) {
                out = new Vector3();
            }
            var d = this.distanceToPoint(point);
            vec3.scaleAndAdd(out._array, point._array, this.normal._array, -d);
            out._dirty = true;
            return out;
        },

        normalize : function() {
            var invLen = 1 / vec3.len(this.normal._array);
            vec3.scale(this.normal._array, invLen);
            this.distance *= invLen;

            return this;
        },

        intersectFrustum : function(frustum) {
            // Check if all coords of frustum is on plane all under plane
            var coords = frustum.vertices;
            var normal = this.normal._array;
            var onPlane = vec3.dot(coords[0]._array, normal) > this.distance;
            for (var i = 1; i < 8; i++) {
                if ((vec3.dot(coords[i]._array, normal) > this.distance) != onPlane) {
                    return true;
                } 
            }
        },

        intersectLine : (function() {
            var rd = vec3.create();
            return function(start, end, out) {
                var d0 = this.distanceToPoint(start);
                var d1 = this.distanceToPoint(end);
                if ((d0 > 0 && d1 > 0) || (d0 < 0 && d1 < 0)) {
                    return null;
                }
                // Ray intersection
                var pn = this.normal._array;
                var d = this.distance;
                var ro = start._array;
                // direction
                vec3.sub(rd, end._array, start._array);
                vec3.normalize(rd, rd);

                var divider = vec3.dot(pn, rd);
                // ray is parallel to the plane
                if (divider == 0) {
                    return null;
                }
                if (!out) {
                    out = new Vector3();
                }
                var t = (vec3.dot(pn, ro) - d) / divider;
                vec3.scaleAndAdd(out._array, ro, rd, -t);
                out._dirty = true;
                return out;
            };
        })(),

        applyTransform : (function() {
            var inverseTranspose = mat4.create();
            var normalv4 = vec4.create();
            var pointv4 = vec4.create();
            pointv4[3] = 1;
            return function(m4) {
                m4 = m4._array;
                // Transform point on plane
                vec3.scale(pointv4, this.normal._array, this.distance);
                vec4.transformMat4(pointv4, pointv4, m4);
                this.distance = vec3.dot(pointv4, this.normal._array);
                // Transform plane normal
                mat4.invert(inverseTranspose, m4);
                mat4.transpose(inverseTranspose, inverseTranspose);
                normalv4[3] = 0;
                vec3.copy(normalv4, this.normal._array);
                vec4.transformMat4(normalv4, normalv4, inverseTranspose);
                vec3.copy(this.normal._array, normalv4);

                return this;
            }
        })(),

        copy : function(plane) {
            vec3.copy(this.normal._array, plane.normal._array);
            this.normal._dirty = true;
            this.distance = plane.distance;
            return this;
        },

        clone : function() {
            var plane = new Plane();
            plane.copy(this);
            return plane;
        }
    }

    return Plane;
});
define('qtek/physics/shape/StaticPlane',['require','../Shape','qtek/math/Plane'],function(require) {
    
    
    
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
define('qtek/physics/shape/ConvexTriangleMesh',['require','../Shape'],function (require) {
    
    
    
    var Shape = require('../Shape');

    var ConvexTriangleMeshShape = Shape.derive({
        geometry : null
    });

    return ConvexTriangleMeshShape;
});
define('qtek/physics/shape/BvhTriangleMesh',['require','../Shape'],function (require) {
    
    
    
    var Shape = require('../Shape');

    var BvhTriangleMeshShape = Shape.derive({
        geometry : null
    });

    return BvhTriangleMeshShape;
});
define('qtek/physics/shape/ConvexHull',['require','../Shape'],function (require) {
    
    
    
    var Shape = require('../Shape');

    var ConvexHullShape = Shape.derive({
        geometry : null
    });

    return ConvexHullShape;
});
define('qtek/physics/Pool',['require'],function (require) {
    
    function Pool() {

        this._size = 0;

        this._data = [];

        this._empties = [];
    }

    Pool.prototype.add = function(obj) {
        var idx;
        if (this._empties.length > 0) {
            idx = this._empties.pop();
            this._data[idx] = obj;
        } else {
            idx = this._data.length;
            this._data.push(obj);
        }
        this._size++;

        return idx;
    }

    Pool.prototype.remove = function(obj) {
        var idx = this._data.indexOf(obj);
        this.removeAt(idx);
        this._size--;
    }

    Pool.prototype.removeAt = function(idx) {
        this._data[idx] = null;
        this._empties.push(idx);
    }

    Pool.prototype.getAt = function(idx) {
        return this._data[idx];
    }

    Pool.prototype.getIndex = function(obj) {
        return this._data.indexOf(obj);
    }

    Pool.prototype.getAll = function() {
        return this._data;
    }

    Pool.prototype.refresh = function() {
        var newData = [];
        for (var i = 0; i < this._data.length; i++) {
            if (this._data[i] !== null) {
                newData.push(this._data[i]);
            }
        }
        this._data = newData;
    }

    Pool.prototype.each = function(callback, context) {
        for (var i = 0; i < this._data.length; i++) {
            if (this._data[i] !== null) {
                callback.call(context || this, this._data[i], i);
            }
        }
        this._data = newData;
    }

    return Pool;
});
// Ammo.js adapter
// https://github.com/kripken/ammo.js
define('qtek/physics/Engine',['require','qtek/core/Base','qtek/core/util','./AmmoEngineConfig.js','./AmmoEngineWorker.js','./shape/Box','./shape/Capsule','./shape/Cone','./shape/Cylinder','./shape/Sphere','./shape/StaticPlane','./shape/ConvexTriangleMesh','./shape/BvhTriangleMesh','./shape/ConvexHull','./Buffer','./Pool','./ContactPoint','qtek/math/Vector3'],function(require) {

    

    var Base = require('qtek/core/Base');
    var util = require('qtek/core/util');
    var configStr = require('./AmmoEngineConfig.js');
    // Using inline web worker
    // http://www.html5rocks.com/en/tutorials/workers/basics/#toc-inlineworkers
    // Put the script together instead of using importScripts
    var workerScript = require('./AmmoEngineWorker.js');
    var finalWorkerScript = [configStr, workerScript].join('\n');
    var workerBlob = new Blob([finalWorkerScript]);
    // Undefine the module and release the memory
    finalWorkerScript = null;
    workerScript = null;

    var BoxShape = require('./shape/Box');
    var CapsuleShape = require('./shape/Capsule');
    var ConeShape = require('./shape/Cone');
    var CylinderShape = require('./shape/Cylinder');
    var SphereShape = require('./shape/Sphere');
    var StaticPlaneShape = require('./shape/StaticPlane');
    var ConvexTriangleMeshShape = require('./shape/ConvexTriangleMesh');
    var BvhTriangleMeshShape = require('./shape/BvhTriangleMesh');
    var ConvexHullShape = require('./shape/ConvexHull');
    var QBuffer  = require('./Buffer');
    var QPool = require('./Pool');
    var ContactPoint = require('./ContactPoint');

    var Vector3 = require('qtek/math/Vector3');

    var ConfigCtor = new Function(configStr);
    var config = new ConfigCtor();

    var Engine = Base.derive(function() {

        return {

            ammoUrl : '',

            gravity : new Vector3(0, -10, 0),

            maxSubSteps : 3,

            fixedTimeStep : 1 / 60,

            _stepTime : 0,

            _isWorkerInited : true,
            _isWorkerFree : true,
            _accumalatedTime : 0,

            _colliders : new QPool(),

            _collidersToAdd : [],
            _collidersToRemove : [],

            _contacts : [],

            _callbacks : new QPool(),

            _cmdBuffer : new QBuffer(),

            _rayTestBuffer : new QBuffer()
        }

    }, function () {
        this.init();
    }, {

        init : function() {
            var workerBlobUrl = window.URL.createObjectURL(workerBlob);
            this._engineWorker = new Worker(workerBlobUrl);
            // TODO more robust
            var ammoUrl = util.relative2absolute(this.ammoUrl, window.location.href.split('/').slice(0, -1).join('/'));
            this._engineWorker.postMessage({
                __init__ : true,
                ammoUrl : ammoUrl,
                gravity : [this.gravity.x, this.gravity.y, this.gravity.z]
            });

            var self = this;

            this._engineWorker.onmessage = function(e) {
                if (e.data.__init__) {
                    this._isWorkerInited = true;
                    return;
                }

                var buffer = new Float32Array(e.data);

                var nChunk = buffer[0];
                var offset = 1;
                for (var i = 0; i < nChunk; i++) {
                    var cmdType = buffer[offset++];

                    switch(cmdType) {
                        case config.CMD_SYNC_MOTION_STATE:
                            offset = self._syncMotionState(buffer, offset);
                            break;
                        case config.CMD_STEP_TIME:
                            self._stepTime = buffer[offset++];
                            // console.log(self._stepTime);
                            break;
                        case config.CMD_COLLISION_CALLBACK:
                            offset = self._dispatchCollisionCallback(buffer, offset);
                            break;
                        case config.CMD_SYNC_INERTIA_TENSOR:
                            offset = self._syncInertiaTensor(buffer, offset);
                            break;
                        case config.CMD_RAYTEST_ALL:
                        case config.CMD_RAYTEST_CLOSEST:
                            offset = self._rayTestCallback(buffer, offset, cmdType === config.CMD_RAYTEST_CLOSEST);
                            break;
                        default:
                    }
                }

                self._isWorkerFree = true;

                self.trigger('afterstep');
            }
        },

        step : function(timeStep) {
            if (!this._isWorkerInited) {
                return;
            }
            // Wait until the worker is free to use
            if (!this._isWorkerFree) {
                this._accumalatedTime += timeStep;
                return;
            } else {
                this._accumalatedTime = timeStep;
            }

            var nChunk = 0;
            this._cmdBuffer.setOffset(0);
            this._cmdBuffer.packScalar(0);

            nChunk += this._doModCollider();
            nChunk += this._doRemoveCollider();
            nChunk += this._doAddCollider();

            // Step
            this._cmdBuffer.packValues(config.CMD_STEP, this._accumalatedTime, this.maxSubSteps, this.fixedTimeStep);
            nChunk++;

            this._cmdBuffer.set(0, nChunk);

            // For example, when transferring an ArrayBuffer from your main app to Worker, the original ArrayBuffer is cleared and no longer usable
            var array = this._cmdBuffer.toFloat32Array();
            this._engineWorker.postMessage(array.buffer, [array.buffer]);

            // Clear forces at the end of each step
            // http://bulletphysics.org/Bullet/phpBB3/viewtopic.php?t=8622
            var colliders = this._colliders.getAll();
            for (var i = 0; i < colliders.length; i++) {
                var collider = colliders[i];
                if (collider === null) {
                    continue;
                }
                // TODO isKnematic ??? 
                if (!(collider.isStatic || collider.isKinematic || collider.isGhostObject)) {
                    var body = collider.collisionObject;
                    body.totalForce._array[0] = 0;
                    body.totalForce._array[1] = 0;
                    body.totalForce._array[2] = 0;
                    body.totalTorque._array[0] = 0;
                    body.totalTorque._array[1] = 0;
                    body.totalTorque._array[2] = 0;
                }
            }

            this._isWorkerFree = false;
        },

        addCollider : function(collider) {
            this._collidersToAdd.push(collider);
        },

        removeCollider : function(collider) {
            var idx = this._colliders.indexOf(collider);
            if (idx >= 0) {
                this._collidersToRemove.push(idx);
            }
        },

        rayTest : function(start, end, callback, closest) {
            var idx = this._callbacks.add(callback);
            this._rayTestBuffer.setOffset(0);
            this._rayTestBuffer.packScalar(1);  // nChunk
            if (closest || closest === undefined) {
                this._rayTestBuffer.packScalar(config.CMD_RAYTEST_CLOSEST);
            } else {
                this._rayTestBuffer.packScalar(config.CMD_RAYTEST_ALL);
            }
            this._rayTestBuffer.packScalar(idx);
            this._rayTestBuffer.packVector3(start);
            this._rayTestBuffer.packVector3(end);

            var array = this._rayTestBuffer.toFloat32Array();
            this._engineWorker.postMessage(array.buffer, [array.buffer]);
        },

        _rayTestCallback : function(buffer, offset, isClosest) {
            var idx = buffer[offset++];
            var callback = this._callbacks.getAt(idx);
            var colliderIdx = buffer[offset++];
            var collider = null, hitPoint = null, hitNormal = null;
            if (colliderIdx >= 0) {
                var collider = this._colliders.getAt(colliderIdx);
                var hitPoint = new Vector3(buffer[offset++], buffer[offset++], buffer[offset++]);
                var hitNormal = new Vector3(buffer[offset++], buffer[offset++], buffer[offset++]);
            }
            callback && callback(collider, hitPoint, hitNormal);
            this._callbacks.removeAt(idx);
            return offset;
        },

        _doAddCollider : function() {
            var nChunk = 0;
            for (var i = 0; i < this._collidersToAdd.length; i++) {
                var collider = this._collidersToAdd[i];
                var idx = this._colliders.add(collider);
                // Head
                // CMD type
                // id
                this._cmdBuffer.packValues(config.CMD_ADD_COLLIDER, idx);

                var bitMaskOffset = this._cmdBuffer._offset++;
                var bitMask = this._packCollider(collider, true);
                this._cmdBuffer.set(bitMaskOffset, bitMask);

                nChunk++;
            }
            this._collidersToAdd.length = 0;

            return nChunk;
        },

        _doRemoveCollider : function() {
            var nChunk = 0;
            for (var i = 0; i < this._collidersToRemove.length; i++) {
                var idx = this._collidersToRemove[i];
                this._colliders.removeAt(idx);

                // Header
                // CMD type
                // Id
                this._cmdBuffer.packValues(config.CMD_REMOVE_COLLIDER, idx);
                nChunk++;
            }
            this._collidersToRemove.length = 0;

            return nChunk;
        },

        _doModCollider : function() {
            var nChunk = 0;
            // Find modified rigid bodies
            var colliders = this._colliders.getAll();
            for (var i = 0; i < colliders.length; i++) {
                var collider = colliders[i];
                if (collider === null) {
                    continue;
                }
                var chunkOffset = this._cmdBuffer._offset;
                // Header is 3 * 4 byte
                this._cmdBuffer._offset += 3;
                var modBit = this._packCollider(collider);
                if (modBit !== 0) {
                    // Header
                    // CMD type
                    // id
                    // Mask bit
                    this._cmdBuffer.set(chunkOffset, config.CMD_MOD_COLLIDER);
                    this._cmdBuffer.set(chunkOffset+1, i);
                    this._cmdBuffer.set(chunkOffset+2, modBit);

                    nChunk++;
                } else {
                    this._cmdBuffer._offset -= 3;
                }
            }
            return nChunk;
        },

        _packCollider : function(collider, isCreate) {
            var modBit = 0x0;

            if (isCreate || collider._dirty) {
                // Collision Flags
                var collisionFlags = 0x0;
                if (collider.isStatic) {
                    collisionFlags |= config.COLLISION_FLAG_STATIC;
                }
                if (collider.isKinematic) {
                    collisionFlags |= config.COLLISION_FLAG_KINEMATIC;
                }
                if (collider.isGhostObject) {
                    collisionFlags |= config.COLLISION_FLAG_GHOST_OBJECT;
                }
                if (collider._collisionHasCallback) {
                    collisionFlags |= config.COLLISION_FLAG_HAS_CALLBACK;
                }
                this._cmdBuffer.packScalar(collisionFlags);

                modBit |= config.COLLISION_FLAG_MOD_BIT;

                collider._dirty = false;
            }

            if (isCreate) {
                // Collision masks
                // TODO change after create
                this._cmdBuffer.packScalar(collider.group);
                this._cmdBuffer.packScalar(collider.collisionMask);
            }

            //  Motion State 
            if (isCreate || collider.isKinematic) {
                this._cmdBuffer.packVector3(collider.sceneNode.position);
                this._cmdBuffer.packVector4(collider.sceneNode.rotation);
                modBit |= config.MOTION_STATE_MOD_BIT;
            }

            var collisionObject = collider.collisionObject;
            // Collision object is not a ghost object
            if (!collider.isGhostObject) {
                // Rigid body data
                for (var i = 0; i < config.RIGID_BODY_PROPS.length; i++) {
                    var item = config.RIGID_BODY_PROPS[i];
                    var propName = item[0];
                    var value = collisionObject[propName];
                    var size = item[1];
                    if (value === undefined || value === null) {
                        continue;
                    }
                    if (size > 1) {
                        if (value._dirty || isCreate) {
                            if (size === 3) {
                                this._cmdBuffer.packVector3(value);
                            } else if(size === 4) {
                                this._cmdBuffer.packVector4(value);
                            }
                            modBit |= item[2];
                            value._dirty = false;
                        }   
                    } else {
                        console.warn('TODO');
                    }
                }
            }

            var res = this._packShape(collisionObject.shape, isCreate);
            if (res) {
                modBit |= config.SHAPE_MOD_BIT;
            }

            // Material data (collision object is not a ghost object)
            if (!collider.isGhostObject) {
                var physicsMaterial = collider.physicsMaterial;
                if (physicsMaterial._dirty || isCreate) {
                    modBit |= config.MATERIAL_MOD_BIT;
                    for (var i = 0; i < config.MATERIAL_PROPS.length; i++) {
                        var item = config.MATERIAL_PROPS[i];
                        var propName = item[0];
                        var value = physicsMaterial[propName];
                        var size = item[1];
                        if (size === 1) {
                            this._cmdBuffer.packScalar(value);
                        } else {
                            // TODO
                        }
                    }
                    physicsMaterial._dirty = false;
                }
            }

            return modBit;
        },

        _packShape : function(shape, isCreate) {
            // Check dirty
            if (!isCreate) {
                if (! (shape.halfExtents && shape.halfExtents._dirty) || shape._dirty) {
                    return false;
                }
            }
            this._cmdBuffer.packScalar(shape.__GUID__);
            if (shape instanceof BoxShape) {
                this._cmdBuffer.packScalar(config.SHAPE_BOX);
                this._cmdBuffer.packVector3(shape.halfExtents);
            } else if (shape instanceof SphereShape) {
                this._cmdBuffer.packScalar(config.SHAPE_SPHERE);
                this._cmdBuffer.packScalar(shape._radius);
            } else if (shape instanceof CylinderShape) {
                this._cmdBuffer.packScalar(config.SHAPE_CYLINDER);
                this._cmdBuffer.packVector3(shape.halfExtents);
            } else if (shape instanceof ConeShape) {
                this._cmdBuffer.packScalar(config.SHAPE_CONE);
                this._cmdBuffer.packScalar(shape._radius);
                this._cmdBuffer.packScalar(shape._height);
            } else if (shape instanceof CapsuleShape) {
                this._cmdBuffer.packScalar(config.SHAPE_CAPSULE);
                this._cmdBuffer.packScalar(shape._radius);
                this._cmdBuffer.packScalar(shape._height);
            } else if (shape instanceof StaticPlaneShape) {
                this._cmdBuffer.packScalar(config.SHAPE_STATIC_PLANE);
                this._cmdBuffer.packVector3(shape.plane.normal);
                this._cmdBuffer.packScalar(shape.plane.distance);
            } else if ((shape instanceof ConvexTriangleMeshShape) || (shape instanceof BvhTriangleMeshShape)) {
                if (shape instanceof ConvexTriangleMeshShape) {
                    this._cmdBuffer.packScalar(config.SHAPE_CONVEX_TRIANGLE_MESH);
                } else {
                    this._cmdBuffer.packScalar(config.SHAPE_BVH_TRIANGLE_MESH);
                }

                var geo = shape.geometry;
                // nTriangles - nVertices - indices - vertices 
                this._cmdBuffer.packScalar(geo.getFaceNumber());
                this._cmdBuffer.packScalar(geo.getVertexNumber());
                // Static Geometry
                if (geo.isStatic()) {
                    this._cmdBuffer.packArray(geo.faces);
                    this._cmdBuffer.packArray(geo.attributes.position.value);
                } else {
                    for (var i = 0; i < geo.faces.length; i++) {
                        this._cmdBuffer.packArray(geo.faces[i]);
                    }
                    for (var i = 0; i < geo.attributes.position.value.length; i++) {
                        this._cmdBuffer.packArray(geo.attributes.position.value[i]);
                    }
                }
            } else if (shape instanceof ConvexHullShape) {
                this._cmdBuffer.packScalar(config.SHAPE_CONVEX_HULL);
                var geo = shape.geometry;
                // nPoints - points
                this._cmdBuffer.packScalar(geo.getVertexNumber());
                // Static Geometry
                if (geo.isStatic()) {
                    this._cmdBuffer.packArray(geo.attributes.position.value);
                } else {
                    for (var i = 0; i < geo.attributes.position.value.length; i++) {
                        this._cmdBuffer.packArray(geo.attributes.position.value[i]);
                    }
                }
            }

            if (shape.halfExtents) {
                shape.halfExtents._dirty = false;
            }
            shape._dirty = false;

            return true;
        },

        _syncMotionState : function(buffer, offset) {
            var nObjects = buffer[offset++];

            for (var i = 0; i < nObjects; i++) {
                var idx = buffer[offset++];

                var collider = this._colliders.getAt(idx);

                var node = collider.sceneNode;
                if (node) {
                    node.position.set(buffer[offset++], buffer[offset++], buffer[offset++]);
                    node.rotation.set(buffer[offset++], buffer[offset++], buffer[offset++], buffer[offset++]);
                }
            }

            return offset;
        },

        _dispatchCollisionCallback : function(buffer, offset) {
            
            var nCollision = buffer[offset++];

            for (var i = 0; i < this._contacts.length; i++) {
                if (this._contacts[i]) {
                    this._contacts[i].length = 0;
                }
            }

            for (var i = 0; i < nCollision; i++) {
                var idxA = buffer[offset++];
                var idxB = buffer[offset++];

                var colliderA = this._colliders.getAt(idxA);
                var colliderB = this._colliders.getAt(idxB);

                if (!this._contacts[idxA]) {
                    this._contacts[idxA] = [];
                }
                if (!this._contacts[idxB]) {
                    this._contacts[idxB] = [];
                }

                var nContacts = buffer[offset++];

                var contactPoint0, contactPoint1;
                for (var j = 0; j < nContacts; j++) {
                    if (colliderA.hasCollisionCallback()) {
                        var contactPoint0 = new ContactPoint();
                        contactPoint0.thisPoint.set(buffer[offset++], buffer[offset++], buffer[offset++]);
                        contactPoint0.otherPoint.set(buffer[offset++], buffer[offset++], buffer[offset++]);
                        contactPoint0.normal.set(buffer[offset++], buffer[offset++], buffer[offset++]);
                        contactPoint0.otherCollider = colliderB;
                        contactPoint0.thisCollider = colliderA;

                        this._contacts[idxA].push(contactPoint0);
                    }  else {
                        contactPoint0 = null;
                    }
                    if (colliderB.hasCollisionCallback()) {
                        var contactPoint1 = new ContactPoint();
                        if (contactPoint0) {
                            contactPoint1.thisPoint.copy(contactPoint0.otherPoint);
                            contactPoint1.otherPoint.copy(contactPoint0.thisPoint);
                            contactPoint1.normal.copy(contactPoint0.normal).negate();
                        } else {
                            contactPoint1.thisPoint.set(buffer[offset++], buffer[offset++], buffer[offset++]);
                            contactPoint1.otherPoint.set(buffer[offset++], buffer[offset++], buffer[offset++]);
                            contactPoint1.normal.set(buffer[offset++], buffer[offset++], buffer[offset++]);
                        }
                        contactPoint1.thisCollider = colliderB;
                        contactPoint1.otherCollider = colliderA;

                        this._contacts[idxB].push(contactPoint1);
                    }
                }

                for (var i = 0; i < this._contacts.length; i++) {
                    var contacts = this._contacts[i];
                    if (contacts && contacts.length) {
                        var collider = this._colliders.getAt(i);
                        collider.trigger('collision', contacts);
                    }
                }

            }
            return offset;
        },

        // Calculate the inertia tensor in the worker and sync back
        _syncInertiaTensor : function(buffer, offset) {
            var nBody = buffer[offset++];
            for (var i = 0; i < nBody; i++) {
                var idx = buffer[offset++];
                var collider = this._colliders.getAt(idx);
                var body = collider.collisionObject;

                var m = body.invInertiaTensorWorld._array;

                for (var j= 0; j < 9; j++) {
                    m[j] = buffer[offset++];
                }
            }
            return offset;
        }
    });

    return Engine;
});
define('qtek/physics/GhostObject',['require','qtek/core/Base'],function(require) {
    
    
    
    var Base = require('qtek/core/Base');

    var GhostObject = Base.derive({
        shape : null
    });

    return GhostObject;
});
// Physics material description
define('qtek/physics/Material',['require','qtek/core/Base'],function (require) {
    
    
    
    var Base = require('qtek/core/Base');

    var Material = Base.derive({

        _friction : 0.5,

        _bounciness : 0.3,

        _dirty : true
    });

    Object.defineProperty(Material.prototype, 'friction', {
        get : function() {
            return this._friction;
        },
        set : function(value) {
            this._friction = value;
            this._dirty = true;
        }
    });

    Object.defineProperty(Material.prototype, 'bounciness', {
        get : function() {
            return this._bounciness;
        },
        set : function(value) {
            this._friction = value;
            this._dirty = true;
        }
    });

    return Material;
});
define('qtek/math/Quaternion',['require','glmatrix'],function(require) {

    

    var glMatrix = require("glmatrix");
    var quat = glMatrix.quat;

    var Quaternion = function(x, y, z, w) {

        x = x || 0;
        y = y || 0;
        z = z || 0;
        w = w === undefined ? 1 : w;

        this._array = quat.fromValues(x, y, z, w);
        // Dirty flag is used by the Node to determine
        // if the matrix is updated to latest
        this._dirty = true;
    }

    Quaternion.prototype = {

        constructor : Quaternion,

        get x() {
            return this._array[0];
        },

        set x(value) {
            this._array[0] = value;
            this._dirty = true;
        },

        get y() {
            this._array[1] = value;
            this._dirty = true;
        },

        set y(value) {
            return this._array[1];
        },

        get z() {
            return this._array[2];
        },

        set z(value) {
            this._array[2] = value;
            this._dirty = true;
        },

        get w() {
            return this._array[3];
        },

        set w(value) {
            this._array[3] = value;
            this._dirty = true;
        },

        add : function(b) {
            quat.add( this._array, this._array, b._array );
            this._dirty = true;
            return this;
        },

        calculateW : function() {
            quat.calculateW(this._array, this._array);
            this._dirty = true;
            return this;
        },

        set : function(x, y, z, w) {
            this._array[0] = x;
            this._array[1] = y;
            this._array[2] = z;
            this._array[3] = w;
            this._dirty = true;
            return this;
        },

        setArray : function(arr) {
            this._array[0] = arr[0];
            this._array[1] = arr[1];
            this._array[2] = arr[2];
            this._array[3] = arr[3];

            this._dirty = true;
            return this;
        },

        clone : function() {
            return new Quaternion( this.x, this.y, this.z, this.w );
        },

        /**
         * Calculates the conjugate of a quat If the quaternion is normalized, 
         * this function is faster than quat.inverse and produces the same result.
         */
        conjugate : function() {
            quat.conjugate(this._array, this._array);
            this._dirty = true;
            return this;
        },

        copy : function(b) {
            quat.copy( this._array, b._array );
            this._dirty = true;
            return this;
        },

        dot : function(b) {
            return quat.dot(this._array, b._array);
        },

        fromMat3 : function(m) {
            quat.fromMat3(this._array, m._array);
            this._dirty = true;
            return this;
        },

        fromMat4 : (function() {
            var mat3 = glMatrix.mat3;
            var m3 = mat3.create();
            return function(m) {
                mat3.fromMat4(m3, m._array);
                // Not like mat4, mat3 in glmatrix seems to be row-based
                mat3.transpose(m3, m3);
                quat.fromMat3(this._array, m3);
                this._dirty = true;
                return this;
            }
        })(),

        identity : function() {
            quat.identity(this._array);
            this._dirty = true;
            return this;
        },

        invert : function() {
            quat.invert(this._array, this._array);
            this._dirty = true;
            return this;
        },

        len : function() {
            return quat.len(this._array);
        },

        length : function() {
            return quat.length(this._array);
        },

        lerp : function(a, b, t) {
            quat.lerp(this._array, a._array, b._array, t);
            this._dirty = true;
            return this;
        },

        mul : function(b) {
            quat.mul(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        mulLeft : function() {
            quat.multiply(this._array, a._array, this._array);
            this._dirty = true;
            return this;
        },

        multiply : function(b) {
            quat.multiply(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        multiplyLeft : function(a) {
            quat.multiply(this._array, a._array, this._array);
            this._dirty = true;
            return this;
        },

        normalize : function() {
            quat.normalize(this._array, this._array);
            this._dirty = true;
            return this;
        },

        rotateX : function(rad) {
            quat.rotateX(this._array, this._array, rad); 
            this._dirty = true;
            return this;
        },

        rotateY : function(rad) {
            quat.rotateY(this._array, this._array, rad);
            this._dirty = true;
            return this;
        },

        rotateZ : function(rad) {
            quat.rotateZ(this._array, this._array, rad);
            this._dirty = true;
            return this;
        },

        rotationTo : function(a, b) {
            quat.rotationTo(this._array, a._array, b._array);
            this._dirty = true;
            return this;
        },

        setAxisAngle : function(axis /*Vector3*/, rad) {
            quat.setAxisAngle(this._array, axis._array, rad);
            this._dirty = true;
            return this;
        },

        slerp : function(a, b, t) {
            quat.slerp(this._array, a._array, b._array, t);
            this._dirty = true;
            return this;
        },

        sqrLen : function() {
            return quat.sqrLen(this._array);
        },

        squaredLength : function() {
            return quat.squaredLength(this._array);
        },
        /**
         * Set quaternion from euler angle
         */
        setFromEuler : function(v) {
            
        },

        toString : function() {
            return "[" + Array.prototype.join.call(this._array, ",") + "]";
        }
    }

    return Quaternion;
} );
define('qtek/math/Matrix3',['require','glmatrix'],function(require) {

    

    var glMatrix = require("glmatrix");
    var mat3 = glMatrix.mat3;

    function makeProperty(n) {
        return {
            configurable : false,
            set : function(value) {
                this._array[n] = value;
                this._dirty = true;
            },
            get : function() {
                return this._array[n];
            }
        }
    }

    var Matrix3 = function() {

        this._array = mat3.create();
    };

    Matrix3.prototype = {

        constructor : Matrix3,

        adjoint : function() {
            mat3.adjoint(this._array, this._array);
            return this;
        },
        clone : function() {
            return (new Matrix3()).copy(this);
        },
        copy : function(b) {
            mat3.copy(this._array, b._array);
            return this;
        },
        determinant : function() {
            return mat3.determinant(this._array);
        },
        fromMat2d : function(a) {
            return mat3.fromMat2d(this._array, a._array);
        },
        fromMat4 : function(a) {
            return mat3.fromMat4(this._array, a._array);
        },
        fromQuat : function(q) {
            mat3.fromQuat(this._array, q._array);
            return this;
        },
        identity : function() {
            mat3.identity(this._array);
            return this;
        },
        invert : function() {
            mat3.invert(this._array, this._array);
            return this;
        },
        mul : function(b) {
            mat3.mul(this._array, this._array, b._array);
            return this;
        },
        mulLeft : function(b) {
            mat3.mul(this._array, b._array, this._array);
            return this;
        },
        multiply : function(b) {
            mat3.multiply(this._array, this._array, b._array);
            return this;
        },
        multiplyLeft : function(b) {
            mat3.multiply(this._array, b._array, this._array);
            return this;
        },
        /**
         * Calculates a 3x3 normal matrix (transpose inverse) from the 4x4 matrix
         */
        normalFromMat4 : function(a) {
            mat3.normalFromMat4(this._array, a._array);
            return this;
        },
        transpose : function() {
            mat3.transpose(this._array, this._array);
            return this;
        },
        toString : function() {
            return "[" + Array.prototype.join.call(this._array, ",") + "]";
        }
    }

    return Matrix3;
});
define('qtek/physics/RigidBody',['require','qtek/core/Base','qtek/math/Vector3','qtek/math/Quaternion','glmatrix','qtek/math/Matrix3'],function(require) {
    
    
    
    var Base = require('qtek/core/Base');
    var Vector3 = require('qtek/math/Vector3');
    var Quaternion = require('qtek/math/Quaternion');
    var glMatrix = require('glmatrix');
    var vec3 = glMatrix.vec3;

    var Matrix3 = require('qtek/math/Matrix3');

    var RigidBody = Base.derive(function() {
        return {

            shape : null,
            
            linearVelocity : new Vector3(),

            angularVelocity : new Vector3(),

            localInertia : null,

            centerOfMass : null,

            linearFactor : new Vector3(1, 1, 1),
            
            angularFactor : new Vector3(1, 1, 1),

            totalForce : new Vector3(0, 0, 0),

            totalTorque : new Vector3(0, 0, 0),
            // x : mass,
            //      Fixed object if mass is 0
            //      Dynamic if mass is positive
            // y : linearDamping
            // z : angularDamping
            massAndDamping : new Vector3(),

            invInertiaTensorWorld : new Matrix3()
        };
    }, {

        applyForce : (function() {
            var torque = new Vector3();
            var scaledForce = new Vector3();
            return function(force, relPos) {
                vec3.mul(scaledForce._array, force._array, this.linearFactor._array);
                this.totalForce.add(scaledForce);
                if (relPos) {
                    vec3.cross(torque._array, relPos._array, scaledForce._array);
                    this.applyTorque(torque);
                }
            }
        })(),

        applyTorque : (function() {
            var scaledTorque = new Vector3();
            return function(torque) {
                vec3.mul(scaledTorque._array, torque._array, this.angularFactor._array);
                this.totalTorque.add(scaledTorque);
            }
        })(),

        applyImpulse : (function() {
            var torqueImpulse = new Vector3();
            var scaledImpulse = new Vector3();
            return function(impulse, relPos) {
                if (this.mass !== 0) {
                    vec3.mul(scaledImpulse._array, impulse._array, this.linearFactor._array);
                    this.linearVelocity.scaleAndAdd(scaledImpulse, 1 / this.mass);
                    if (relPos) {
                        vec3.cross(torqueImpulse._array, relPos._array, scaledImpulse._array);
                        this.applyTorqueImpulse(torqueImpulse);
                    }
                }
            }
        })(),

        applyTorqueImpulse : (function() {
            var scaledTorqueImpuse = new Vector3();
            return function(torqueImpulse) {
                vec3.mul(scaledTorqueImpuse._array, torqueImpulse._array, this.angularFactor._array);
                vec3.transformMat3(this.angularVelocity._array, scaledTorqueImpuse._array, this.invInertiaTensorWorld._array);
                this.angularVelocity._dirty = true;
            }
        })(),

        clearForces : function() {
            this.totalForce.set(0, 0, 0);
            this.totalTorque.set(0, 0, 0);
        }
    });

    Object.defineProperty(RigidBody.prototype, 'mass', {
        get : function() {
            return this.massAndDamping._array[0];
        },
        set : function(value) {
            this.massAndDamping._array[0] = value;
            this.massAndDamping._dirty = true;
        }
    });
    Object.defineProperty(RigidBody.prototype, 'linearDamping', {
        get : function() {
            return this.massAndDamping._array[1];
        },
        set : function(value) {
            this.massAndDamping._array[1] = value;
            this.massAndDamping._dirty = true;
        }
    });
    Object.defineProperty(RigidBody.prototype, 'angularDamping', {
        get : function() {
            return this.massAndDamping._array[2];
        },
        set : function(value) {
            this.massAndDamping._array[2] = value;
            this.massAndDamping._dirty = true;
        }
    });

    return RigidBody;
});