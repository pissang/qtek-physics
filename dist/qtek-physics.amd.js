
define('qtek/physics/qtek-physics.amd',[],function() {
    console.log('Loaded qtek physics module');
    console.log('Author : https://github.com/pissang/');
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
define('qtek/physics/Shape',['require','qtek/core/Base'],function(require) {

    
    
    var Base = require('qtek/core/Base');

    var Shape = Base.derive({
    }, {
        dirty : function() {
            this._dirty = true;
        }
    });

    return Shape;
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
define('qtek/physics/BoxShape',['require','./Shape','qtek/math/Vector3'],function(require) {

    
    
    var Shape = require('./Shape');
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
define('qtek/physics/BvhTriangleMeshShape',['require','./Shape'],function (require) {
    
    
    
    var Shape = require('./Shape');

    var BvhTriangleMeshShape = Shape.derive({
        geometry : null
    });

    return BvhTriangleMeshShape;
});
define('qtek/physics/CapsuleShape',['require','./Shape','qtek/math/Vector3'],function (require) {
    
    
    
    var Shape = require('./Shape');
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
define('qtek/physics/Collider',['require','qtek/core/Base'],function(require) {
    
    
    
    var Base = require('qtek/core/Base');

    var Collider = Base.derive({

        collisionObject : null,

        sceneNode : null,

        physicsMaterial : null,

        isKinematic : false,

        isStatic : false,

        isGhostObject : false,

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
define('qtek/physics/ConeShape',['require','./Shape','qtek/math/Vector3'],function (require) {
    
    
    
    var Shape = require('./Shape');
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
define('qtek/physics/ConvexHullShape',['require','./Shape'],function (require) {
    
    
    
    var Shape = require('./Shape');

    var ConvexHullShape = Shape.derive({
        geometry : null
    });

    return ConvexHullShape;
});
define('qtek/physics/ConvexTriangleMeshShape',['require','./Shape'],function (require) {
    
    
    
    var Shape = require('./Shape');

    var ConvexTriangleMeshShape = Shape.derive({
        geometry : null
    });

    return ConvexTriangleMeshShape;
});
define('qtek/physics/CylinderShape',['require','./Shape','qtek/math/Vector3'],function (require) {
    
    
    
    var Shape = require('./Shape');
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
define('qtek/physics/AmmoEngineConfig.js',[],function () { return '\'use strict\';\n\n// Data format\n// Command are transferred in batches\n// ncmd - [cmd chunk][cmd chunk]...\n// Add rigid body :\n//      ------header------ \n//      cmdtype(1)\n//      idx(1)\n//      32 bit mask(1)\n//          But because it is stored in Float, so it can only use at most 24 bit (TODO)\n//      -------body-------\n//      collision flag(1)\n//      ...\n//      collision shape guid(1)\n//      shape type(1)\n//      ...\n// Remove rigid body:\n//      cmdtype(1)\n//      idx(1)\n//      \n// Mod rigid body :\n//      ------header------\n//      cmdtype(1)\n//      idx(1)\n//      32 bit mask(1)\n//      -------body-------\n//      ...\n//      \n// Step\n//      cmdtype(1)\n//      timeStep(1)\n//      maxSubSteps(1)\n//      fixedTimeStep(1)\nthis.CMD_ADD_COLLIDER = 0;\nthis.CMD_REMOVE_COLLIDER = 1;\nthis.CMD_MOD_COLLIDER = 2;\nthis.CMD_SYNC_MOTION_STATE = 3;\nthis.CMD_STEP_TIME = 4;\nthis.CMD_COLLISION_CALLBACK = 5;\n\nthis.CMD_SYNC_INERTIA_TENSOR = 6;\n\n// Message of step\nthis.CMD_STEP = 10;\n\n// Shape types\nthis.SHAPE_BOX = 0;\nthis.SHAPE_SPHERE = 1;\nthis.SHAPE_CYLINDER = 2;\nthis.SHAPE_CONE = 3;\nthis.SHAPE_CAPSULE = 4;\nthis.SHAPE_CONVEX_TRIANGLE_MESH = 5;\nthis.SHAPE_CONVEX_HULL = 6;\nthis.SHAPE_STATIC_PLANE = 7;\nthis.SHAPE_BVH_TRIANGLE_MESH = 8;\n\n// Rigid Body properties and bit mask\n// 1. Property name\n// 2. Property size\n// 3. Mod bit mask, to check if part of rigid body needs update\nthis.RIGID_BODY_PROPS = [\n    [\'linearVelocity\', 3, 0x1],\n    [\'angularVelocity\', 3, 0x2],\n    [\'linearFactor\', 3, 0x4],\n    [\'angularFactor\', 3, 0x8],\n    [\'centerOfMass\', 3, 0x10],\n    [\'localInertia\', 3, 0x20],\n    [\'massAndDamping\', 3, 0x40],\n    [\'totalForce\', 3, 0x80],\n    [\'totalTorque\', 3, 0x100]\n];\n\nthis.RIGID_BODY_PROP_MOD_BIT = {};\nthis.RIGID_BODY_PROPS.forEach(function(item) {\n    this.RIGID_BODY_PROP_MOD_BIT[item[0]] = item[2];\n}, this);\n\nthis.SHAPE_MOD_BIT = 0x200;\nthis.MATERIAL_MOD_BIT = 0x400;\nthis.COLLISION_FLAG_MOD_BIT = 0x800;\n\nthis.MOTION_STATE_MOD_BIT = 0x1000;\n\nthis.MATERIAL_PROPS = [\n    [\'friction\', 1],\n    [\'bounciness\', 1],\n];\n\n// Collision Flags\nthis.COLLISION_FLAG_STATIC = 0x1;\nthis.COLLISION_FLAG_KINEMATIC = 0x2;\nthis.COLLISION_FLAG_GHOST_OBJECT = 0x4;\n\nthis.COLLISION_FLAG_HAS_CALLBACK = 0x200;\n\n// Collision Status\nthis.COLLISION_STATUS_ENTER = 1;\nthis.COLLISION_STATUS_STAY = 2;\nthis.COLLISION_STATUS_LEAVE = 3;\n';});

define('qtek/physics/SphereShape',['require','./Shape'],function (require) {
    
    
    
    var Shape = require('./Shape');

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

    var Plane = function(normal, distance) {
        this.normal = normal || new Vector3();
        this.distance = distance;
    }

    Plane.prototype = {

        constructor : Plane,

        distanceToPoint : function(point) {
            return vec3.dot(point._array, this.normal._array) - this.distance;
        },

        normalize : function() {
            var invLen = 1 / vec3.len(this.normal._array);
            vec3.scale(this.normal._array, invLen);
            this.distance *= invLen;
        }
    }

    return Plane;
});
define('qtek/physics/StaticPlaneShape',['require','./Shape','qtek/math/Plane'],function(require) {
    
    
    
    var Shape = require('./Shape');
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
// Ammo.js adapter
// https://github.com/kripken/ammo.js
define('qtek/physics/Engine',['require','qtek/core/Base','./AmmoEngineConfig.js','./BoxShape','./CapsuleShape','./ConeShape','./CylinderShape','./SphereShape','./StaticPlaneShape','./ConvexTriangleMeshShape','./BvhTriangleMeshShape','./ConvexHullShape','./Buffer','./ContactPoint','qtek/math/Vector3'],function(require) {

    

    var Base = require('qtek/core/Base');
    var configStr = require('./AmmoEngineConfig.js');

    var BoxShape = require('./BoxShape');
    var CapsuleShape = require('./CapsuleShape');
    var ConeShape = require('./ConeShape');
    var CylinderShape = require('./CylinderShape');
    var SphereShape = require('./SphereShape');
    var StaticPlaneShape = require('./StaticPlaneShape');
    var ConvexTriangleMeshShape = require('./ConvexTriangleMeshShape');
    var BvhTriangleMeshShape = require('./BvhTriangleMeshShape');
    var ConvexHullShape = require('./ConvexHullShape');
    var QBuffer  = require('./Buffer');
    var ContactPoint = require('./ContactPoint');

    var Vector3 = require('qtek/math/Vector3');

    var ConfigCtor = new Function(configStr);

    var config = new ConfigCtor();

    var Engine = Base.derive({

        workerUrl : '',

        maxSubSteps : 3,

        fixedTimeStep : 1 / 60,

        _stepTime : 0,

        _isWorkerFree : true

    }, function () {
        this.init();
    }, {

        init : function() {
            this._engineWorker = new Worker(this.workerUrl);
            
            this._colliders = [];
            this._empties = [];
            this._collidersToAdd = [];
            this._collidersToRemove = [];

            this._contacts = [];

            this._cmdBuffer = new QBuffer();

            var self = this;

            this._engineWorker.onmessage = function(e) {
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
                        default:
                    }
                }

                self._isWorkerFree = true;

                self.trigger('afterstep');
            }
        },

        step : function(timeStep) {
            // Wait when the worker is free to use
            if (!this._isWorkerFree) {
                this._stepTime = timeStep;
                return;
            }

            var nChunk = 0;
            this._cmdBuffer.setOffset(0);
            this._cmdBuffer.packScalar(0);

            nChunk += this._doModCollider();
            nChunk += this._doRemoveCollider();
            nChunk += this._doAddCollider();

            // Step
            this._cmdBuffer.packValues(config.CMD_STEP, this._stepTime, this.maxSubSteps, this.fixedTimeStep);
            nChunk++;

            this._cmdBuffer.set(0, nChunk);

            // For example, when transferring an ArrayBuffer from your main app to Worker, the original ArrayBuffer is cleared and no longer usable
            var array = this._cmdBuffer.toFloat32Array();
            this._engineWorker.postMessage(array.buffer, [array.buffer]);

            // Clear forces at the end of each step
            // http://bulletphysics.org/Bullet/phpBB3/viewtopic.php?t=8622
            for (var i = 0; i < this._colliders.length; i++) {
                var collider = this._colliders[i];
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
            this._stepTime = 0;
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

        _doAddCollider : function() {
            var nChunk = 0;
            for (var i = 0; i < this._collidersToAdd.length; i++) {
                var collider = this._collidersToAdd[i];
                var idx;
                if (this._empties.length > 0) {
                    idx = this._empties.pop();
                    this._colliders[idx] = collider;
                } else {
                    idx = this._colliders.length;
                    this._colliders.push(collider);
                }

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
                this._colliders[idx] = null;
                this._empties.push(idx);

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
            for (var i = 0; i < this._colliders.length; i++) {
                var collider = this._colliders[i];
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
                var id = buffer[offset++];

                var collider = this._colliders[id];

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

                var colliderA = this._colliders[idxA];
                var colliderB = this._colliders[idxB];

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
                        this._colliders[i].trigger('collision', contacts);
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
                var collider = this._colliders[idx];
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
define('qtek/physics/Physics',['require','qtek/core/Base'],function(require) {
    
    
    
    var Base = require('qtek/core/Base');

    var Physics = Base.derive({

        engine : null
    }, {

    });

    return Physics;
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