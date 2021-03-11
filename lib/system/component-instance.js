var Internals = require('./shared/internals');
var MeshError = require('./shared/mesh-error');
var EventEmitter = require('events').EventEmitter;
var depWarned0 = false; // $happn.mesh.*
var utilities = require('./utilities');
var _ = require('lodash');

module.exports = ComponentInstance;

function ComponentInstance() {
  this.localEventEmitter = new EventEmitter();
  this.semver = require('happner-client').semver;
}

ComponentInstance.prototype.clearCachedBoundExchange = function() {
  if (!this.boundExchangeCache) return;
  return this.boundExchangeCache.clear();
};

ComponentInstance.prototype.initializeCachedBoundExchange = function(mesh, componentName) {
  this.boundExchangeCache =
    mesh.happn.server.services.cache.__caches['happner-bound-exchange' + componentName] ||
    mesh.happn.server.services.cache.new('happner-bound-exchange' + componentName, {
      type: 'LRU',
      cache: {
        max: mesh.config.boundExchangeCacheSize || 10000
      }
    });
  this.clearCachedBoundExchange();
  //ensure if security changes, we discard bound exchanges
  mesh.happn.server.services.security.on(
    'security-data-changed',
    this.clearCachedBoundExchange.bind(this)
  );
};

ComponentInstance.prototype.getCachedBoundExchange = function(origin) {
  if (!this.boundExchangeCache) return null;
  return this.boundExchangeCache.getSync(origin.username, {
    clone: false
  });
};

ComponentInstance.prototype.setCachedBoundExchange = function(origin, exchange) {
  if (!this.boundExchangeCache) return exchange;
  this.boundExchangeCache.setSync(origin.username, exchange, {
    clone: false
  });
  return exchange;
};

ComponentInstance.prototype.originBindingNecessary = function(mesh, origin) {
  //dont delegate authority to _ADMIN, no origin is an internal call:
  if (!origin || origin.username === '_ADMIN') return false;
  //not a secure mesh:
  if (!mesh.config.happn.secure) return false;
  //authority delegation not set up on component, and not set up on the server
  if (
    (!this.config.security || this.config.security.authorityDelegationOn == null) &&
    !mesh.config.authorityDelegationOn
  )
    return false;
  //authority delegation explicitly set not to happen for this component
  if (this.config.security && this.config.security.authorityDelegationOn === false) return false;

  return true;
};

const bindToOrigin = function(root, mesh, origin) {
  if (!this.originBindingNecessary(mesh, origin)) return this;

  var bound = this.getCachedBoundExchange(origin);
  if (bound) return bound;

  bound = Object.assign({}, this);

  bound.data = this.secureDataBoundToOrigin(mesh.data, this.name, origin);
  bound.exchange = this.secureExchangeBoundToOrigin(this.exchange, origin);
  bound.event = this.secureEventBoundToOrigin(this.event, origin);

  if (mesh.serializer) {
    Object.defineProperty(bound, 'serializer', {
      value: mesh._mesh.serializer
    });
  }

  if (this.config.accessLevel === 'root') {
    Object.defineProperty(bound, '_root', {
      get: function() {
        return root;
      },
      enumerable: true
    });
  }

  if (this.config.accessLevel === 'mesh' || this.config.accessLevel === 'root') {
    Object.defineProperty(bound, '_mesh', {
      get: function() {
        return mesh;
      },
      enumerable: true
    });
  }

  return this.setCachedBoundExchange(origin, bound);
};

ComponentInstance.prototype.secureExchangeBoundToOriginMethods = function(
  component,
  boundComponent,
  origin
) {
  if (typeof component !== 'object') return;

  Object.keys(component).forEach(methodName => {
    if (typeof component[methodName] === 'function') {
      boundComponent[methodName] = component[methodName].bind({
        $self: component[methodName],
        $origin: origin
      });
      return;
    }
    if (typeof component[methodName] === 'object') {
      boundComponent[methodName] = {};
      return this.secureExchangeBoundToOriginMethods(
        component[methodName],
        boundComponent[methodName],
        origin
      );
    }
    boundComponent[methodName] = component[methodName];
  });
};

ComponentInstance.prototype.secureExchangeBoundToOrigin = function(exchange, origin) {
  const boundExchange = {};
  Object.keys(exchange).forEach(componentName => {
    if (componentName === '$call') {
      boundExchange.$call = Internals._createDecoupledCall(boundExchange);
      return;
    }
    boundExchange[componentName] = {};
    this.secureExchangeBoundToOriginMethods(
      exchange[componentName],
      boundExchange[componentName],
      origin
    );
  });
  return boundExchange;
};

ComponentInstance.prototype.secureEventBoundToOrigin = function(event, origin) {
  const boundEvent = {};

  Object.keys(event).forEach(function(componentName) {
    //special $call method - not an event api
    if (componentName === '$call') return;
    boundEvent[componentName] = {};
    if (event[componentName].__endpoint) {
      boundEvent[componentName] = Internals._getSubscriber(
        event[componentName].__endpoint,
        event[componentName].__domain,
        componentName,
        origin.username
      );
      return;
    }
    Object.keys(event[componentName]).forEach(function(subComponentName) {
      if (event[componentName][subComponentName].__endpoint)
        boundEvent[componentName][subComponentName] = Internals._getSubscriber(
          event[componentName][subComponentName].__endpoint,
          event[componentName][subComponentName].__domain,
          subComponentName,
          origin.username
        );
    });
  });
  return boundEvent;
};

ComponentInstance.prototype.secureDataBoundToOrigin = function(meshData, componentName, origin) {
  var securedMeshData = {};

  securedMeshData.__persistedPath = '/_data/' + componentName;

  securedMeshData.getPath = function(path) {
    if (!path) throw new Error('invalid path: ' + path);
    if (path[0] !== '/') path = '/' + path;

    return this.__persistedPath + path;
  };

  securedMeshData.noConnection = function() {
    return [1, 6].indexOf(meshData.status) === -1;
  };

  securedMeshData.on = function(path, options, handler, callback) {
    if (typeof options === 'function') {
      callback = handler;
      handler = options;
      options = {};
    }

    if (!options) options = {};
    options.onBehalfOf = origin.username;

    if (this.noConnection())
      return callback(
        new Error(
          'client state not active or connected, on:' + path + ', component:' + componentName
        )
      );
    if (path === '*') path = '**';

    return meshData.on(this.getPath(path), options, handler, callback);
  };

  securedMeshData.off = function(listenerRef, callback) {
    if (this.noConnection())
      return callback(
        new Error(
          'client state not active or connected, off ref:' +
            listenerRef +
            ', component:' +
            componentName
        )
      );

    if (typeof listenerRef === 'number') return meshData.off(listenerRef, callback);

    return meshData.off(this.getPath(listenerRef), callback);
  };

  securedMeshData.offAll = function(callback) {
    if (this.noConnection())
      return callback(
        new Error('client state not active or connected, offAll, component:' + componentName)
      );

    //we cannot do a true offAll, otherwise we get no message back
    return meshData.offPath(this.getPath('*'), callback);
  };

  securedMeshData.offPath = function(path, callback) {
    if (this.noConnection())
      return callback(
        new Error(
          'client state not active or connected, offPath:' + path + ', component:' + componentName
        )
      );

    return meshData.offPath(this.getPath(path), callback);
  };

  securedMeshData.get = function(path, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    if (this.noConnection())
      return callback(
        new Error(
          'client state not active or connected, get:' + path + ', component:' + componentName
        )
      );

    if (!options) options = {};
    options.onBehalfOf = origin.username;

    return meshData.get(this.getPath(path), options, callback);
  };

  securedMeshData.count = function(path, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    if (this.noConnection())
      return callback(
        new Error(
          'client state not active or connected, get:' + path + ', component:' + componentName
        )
      );

    if (!options) options = {};
    options.onBehalfOf = origin.username;

    return meshData.count(this.getPath(path), options, callback);
  };

  securedMeshData.getPaths = function(path, callback) {
    if (this.noConnection())
      return callback(
        new Error(
          'client state not active or connected, getPaths:' + path + ', component:' + componentName
        )
      );
    return meshData.getPaths(this.getPath(path), { onBehalfOf: origin.username }, callback);
  };

  securedMeshData.set = function(path, data, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    if (this.noConnection())
      return callback(
        new Error(
          'client state not active or connected, set:' + path + ', component:' + componentName
        )
      );
    if (!options) options = {};
    options.onBehalfOf = origin.username;

    return meshData.set(this.getPath(path), data, options, callback);
  };

  securedMeshData.increment = function(path, gauge, increment, callback) {
    if (typeof increment === 'function') {
      callback = increment;
      increment = gauge;
      gauge = 'counter';
    }

    if (typeof gauge === 'function') {
      callback = gauge;
      increment = 1;
      gauge = 'counter';
    }

    if (this.noConnection())
      return callback(
        new Error(
          'client state not active or connected, increment:' + path + ', component:' + componentName
        )
      );
    //TODO: get paths needs to be done by origin
    return meshData.increment(
      this.getPath(path),
      gauge,
      increment,
      { onBehalfOf: origin.username },
      callback
    );
  };

  securedMeshData.setSibling = function(path, data, callback) {
    if (this.noConnection())
      return callback(
        new Error(
          'client state not active or connected, setSibling:' +
            path +
            ', component:' +
            componentName
        )
      );
    //TODO: get paths needs to be done by origin
    return meshData.setSibling(this.getPath(path), data, { onBehalfOf: origin.username }, callback);
  };

  securedMeshData.remove = function(path, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    if (this.noConnection())
      return callback(
        new Error(
          'client state not active or connected, remove:' + path + ', component:' + componentName
        )
      );
    if (!options) options = {};
    options.onBehalfOf = origin.username;
    return meshData.remove(this.getPath(path), options, callback);
  };

  return securedMeshData;
};

ComponentInstance.prototype.secureData = function(meshData, componentName) {
  var securedMeshData = {};
  securedMeshData.__persistedPath = '/_data/' + componentName;

  securedMeshData.getPath = function(path) {
    if (!path) throw new Error('invalid path: ' + path);
    if (path[0] !== '/') path = '/' + path;

    return this.__persistedPath + path;
  };

  securedMeshData.noConnection = function() {
    return [1, 6].indexOf(meshData.status) === -1;
  };

  securedMeshData.on = function(path, options, handler, callback) {
    if (typeof options === 'function') {
      callback = handler;
      handler = options;
      options = {};
    }

    if (!options) options = {};

    if (this.noConnection())
      return callback(
        new Error(
          'client state not active or connected, on:' + path + ', component:' + componentName
        )
      );

    if (path === '*') path = '**';

    return meshData.on(this.getPath(path), options, handler, callback);
  };

  securedMeshData.off = function(listenerRef, callback) {
    if (this.noConnection())
      return callback(
        new Error(
          'client state not active or connected, off ref:' +
            listenerRef +
            ', component:' +
            componentName
        )
      );

    if (typeof listenerRef === 'number') return meshData.off(listenerRef, callback);

    return meshData.off(this.getPath(listenerRef), callback);
  };

  securedMeshData.offAll = function(callback) {
    if (this.noConnection())
      return callback(
        new Error('client state not active or connected, offAll, component:' + componentName)
      );

    //we cannot do a true offAll, otherwise we get no message back
    return meshData.offPath(this.getPath('*'), callback);
  };

  securedMeshData.offPath = function(path, callback) {
    if (this.noConnection())
      return callback(
        new Error(
          'client state not active or connected, offPath:' + path + ', component:' + componentName
        )
      );

    return meshData.offPath(this.getPath(path), callback);
  };

  securedMeshData.get = function(path, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    if (this.noConnection())
      return callback(
        new Error(
          'client state not active or connected, get:' + path + ', component:' + componentName
        )
      );

    return meshData.get(this.getPath(path), options, callback);
  };

  securedMeshData.count = function(path, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    if (this.noConnection())
      return callback(
        new Error(
          'client state not active or connected, get:' + path + ', component:' + componentName
        )
      );

    return meshData.count(this.getPath(path), options, callback);
  };

  securedMeshData.getPaths = function(path, callback) {
    if (this.noConnection())
      return callback(
        new Error(
          'client state not active or connected, getPaths:' + path + ', component:' + componentName
        )
      );

    return meshData.getPaths(this.getPath(path), callback);
  };

  securedMeshData.set = function(path, data, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    if (this.noConnection())
      return callback(
        new Error(
          'client state not active or connected, set:' + path + ', component:' + componentName
        )
      );
    return meshData.set(this.getPath(path), data, options, callback);
  };

  securedMeshData.increment = function(path, gauge, increment, callback) {
    if (typeof increment === 'function') {
      callback = increment;
      increment = gauge;
      gauge = 'counter';
    }

    if (typeof gauge === 'function') {
      callback = gauge;
      increment = 1;
      gauge = 'counter';
    }

    if (this.noConnection())
      return callback(
        new Error(
          'client state not active or connected, increment:' + path + ', component:' + componentName
        )
      );

    return meshData.increment(this.getPath(path), gauge, increment, callback);
  };

  securedMeshData.setSibling = function(path, data, callback) {
    if (this.noConnection())
      return callback(
        new Error(
          'client state not active or connected, setSibling:' +
            path +
            ', component:' +
            componentName
        )
      );

    return meshData.setSibling(this.getPath(path), data, callback);
  };

  securedMeshData.remove = function(path, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    if (this.noConnection())
      return callback(
        new Error(
          'client state not active or connected, remove:' + path + ', component:' + componentName
        )
      );

    return meshData.remove(this.getPath(path), options, callback);
  };

  return securedMeshData;
};

ComponentInstance.prototype.initialize = function(name, root, mesh, module, config, callback) {
  this.README = this.README; // make visible
  this.name = name;
  this.config = config;

  this.info = {
    mesh: {}, // name,
    happn: {} // address, options
  };

  this.log = mesh._mesh.log.createLogger(this.name);
  this.Mesh = require('../mesh'); // local Mesh definition avaliable on $happn
  this.log.$$DEBUG('create instance');

  this.initializeCachedBoundExchange(mesh._mesh, this.name);

  var _this = this;

  Object.defineProperty(_this, 'mesh', {
    get: function() {
      if (depWarned0) return _this;
      _this.log.warn('Use of $happn.mesh.* is deprecated. Use $happn.*');
      try {
        _this.log.warn(' - at %s', mesh.getCallerTo('componentInstance.js'));
      } catch (e) {
        // do nothing
      }
      depWarned0 = true;
      return _this;
    }
  });

  Object.defineProperty(_this, '__authorizeOriginMethod', {
    get: function() {
      return function(methodName, origin, callback) {
        if (!_this.originBindingNecessary(mesh._mesh, origin)) return callback(null, true);

        var subscribeMask = _this.__getSubscribeMask();
        var permissionPath = subscribeMask.substring(0, subscribeMask.length - 1) + methodName;

        mesh._mesh.happn.server.services.security.__getOnBehalfOfSession(
          {
            user: {
              username: '_ADMIN'
            }
          },
          origin.username,
          function(e, originSession) {
            if (e) return callback(e);
            mesh._mesh.happn.server.services.security.authorize(
              originSession,
              permissionPath,
              'set',
              function(e, authorized) {
                if (e) return callback(e);
                if (!authorized)
                  return callback(
                    mesh._mesh.happn.server.services.error.AccessDeniedError(
                      'unauthorized',
                      'request on behalf of: ' + origin.username
                    )
                  );
                callback();
              }
            );
          }
        );
      };
    },
    enumerable: true
  });

  Object.defineProperty(_this, 'tools', {
    get: function() {
      return mesh.tools;
    },
    enumerable: true
  });

  var defaults;

  //TODO, here are the module.packaged settings

  if (typeof (defaults = module.instance.$happner) === 'object') {
    if (defaults.config && defaults.config.component) {
      Object.keys((defaults = defaults.config.component)).forEach(key => {
        // - Defaulting applies only to the 'root' keys nested immediately
        //   under the 'component' config
        // - Does not merge.
        // - Each key in the default is only used if the corresponding key is
        //   not present in the inbound config.
        if (typeof this.config[key] === 'undefined') {
          this.config[key] = JSON.parse(JSON.stringify(defaults[key]));
        }
      });
    }
  }

  Object.defineProperty(this.info.mesh, 'name', {
    enumerable: true,
    value: mesh._mesh.config.name
  });

  Object.defineProperty(this.info.mesh, 'domain', {
    enumerable: true,
    value: mesh._mesh.config.domain
  });

  Object.defineProperty(this.info.happn, 'address', {
    enumerable: true,
    get: function() {
      var address = mesh._mesh.happn.server.server.address();
      // TODO: ideally this value would come from the actual server, not the config
      try {
        address.protocol = mesh._mesh.config.happn.services.transport.config.mode;
      } catch (e) {
        address.protocol = 'http';
      }
      return address;
    }
  });

  Object.defineProperty(this.info.happn, 'options', {
    enumerable: true,
    get: function() {
      return mesh._mesh.config.happn.setOptions; // TODO: should rather point to actual happn options,
      //        it may have defaulted more than we passed in.
    }
  });

  if (mesh._mesh.serializer) {
    Object.defineProperty(this, 'serializer', {
      value: mesh._mesh.serializer
    });
  }

  if (config.accessLevel === 'root') {
    Object.defineProperty(this, '_root', {
      get: function() {
        return root;
      },
      enumerable: true
    });
  }

  if (config.accessLevel === 'mesh' || config.accessLevel === 'root') {
    Object.defineProperty(this, '_mesh', {
      get: function() {
        return mesh._mesh;
      },
      enumerable: true
    });
  }

  try {
    // Each component has it's own exchange
    // to allow happner-cluster to replace components with the proper from elsewhere in the cluster
    // without affecting other components.
    //
    // this.exchange = mesh.exchange;
    // this.event = mesh.event;
    //
    // they are loaded as a last step in mesh.js (See mesh._initializeComponents)
    this.exchange = {};
    this.event = {};
    this.localEvent = {};
    this.asAdmin = this; //in case we use $happn.asAdmin but have not bound to origin

    this.data = this.secureData(mesh._mesh.data, this.name);

    Object.defineProperty(this, 'bindToOrigin', {
      get: function() {
        return bindToOrigin.bind(this, root, mesh._mesh);
      },
      enumerable: true
    });

    this._loadModule(module);
    this._attach(config, mesh._mesh, callback);
  } catch (err) {
    callback(new MeshError('Failed to initialize component', err));
  }
};

ComponentInstance.prototype.on = function(event, handler) {
  try {
    this.log.debug('component on called', event);
    return this.localEventEmitter.on(event, handler);
  } catch (e) {
    this.log.debug('component on error', e);
  }
};

ComponentInstance.prototype.offEvent = function(event, handler) {
  try {
    this.log.debug('component offEvent called', event);
    return this.localEventEmitter.offEvent(event, handler);
  } catch (e) {
    this.log.debug('component offEvent error', e);
  }
};

ComponentInstance.prototype.emitEvent = function(event, data) {
  try {
    this.log.debug('component emitEvent called', event);
    return this.localEventEmitter.emit(event, data);
  } catch (e) {
    this.log.debug('component emitEvent error', e);
  }
};

ComponentInstance.prototype.describe = function(cached) {
  var _this = this;

  if (!cached || !this.description) {
    Object.defineProperty(this, 'description', {
      value: {
        name: _this.name,
        version: _this.module.version,
        methods: {},
        routes: {}
      },
      configurable: true
    });

    var webMethods = {}; // accum list of webMethods to exclude from exhange methods description

    if (this.config.web && this.config.web.routes) {
      var routes = this.config.web.routes;
      Object.keys(routes).forEach(function(routePath) {
        var route = routes[routePath];

        if (route instanceof Array)
          route.forEach(function(method) {
            webMethods[method] = 1;
            route = method; // last in route array is used to determine type: static || mware
          });
        else webMethods[route] = 1;

        if (routePath === 'static') routePath = '/';
        else if (_this.name === 'www' && routePath === 'global') return;
        else if (_this.name === 'www' && routePath !== 'global') routePath = '/' + routePath;
        else if (routePath === 'resources' && _this.name === 'resources')
          routePath = '/' + routePath;
        else routePath = '/' + _this.name + '/' + routePath;

        _this.description.routes[routePath] = {};
        _this.description.routes[routePath].type = route === 'static' ? 'static' : 'mware';
      });
    }

    // build description.events (components events)
    if (this.config.events)
      this.description.events = JSON.parse(JSON.stringify(this.config.events));
    else this.description.events = {};

    if (this.config.data) this.description.data = JSON.parse(JSON.stringify(this.config.data));
    else this.description.data = {};

    // build description.methods (component's web routes)
    var getMethodDefn = function(config, methodName) {
      if (!config.schema) return;
      if (!config.schema.methods) return;
      if (!config.schema.methods[methodName]) return;
      return config.schema.methods[methodName];
    };

    //get all methods that are not inherited from Object, Stream, and EventEmitter
    const methodNames = utilities.getAllMethodNames(this.module.instance, {
      ignoreInheritedNativeMethods: true
    });

    for (var methodName of methodNames) {
      var method = this.module.instance[methodName];
      var methodDefined = getMethodDefn(this.config, methodName);

      if (method.$happner && method.$happner.ignore && !methodDefined) continue;
      if (methodName.indexOf('_') === 0 && !methodDefined) continue;

      if (!this.config.schema || (this.config.schema && !this.config.schema.exclusive)) {
        // no schema or not exclusive, allow all (except those filtered above and those that are webMethods)
        if (webMethods[methodName]) continue;
        this.description.methods[methodName] = methodDefined = methodDefined || {};
        if (!methodDefined.parameters) {
          this._defaultParameters(method, methodDefined);
        }
        continue;
      }

      if (methodDefined) {
        // got schema and exclusive is true (per filter in previous if) and have definition
        this.description.methods[methodName] = methodDefined;
        if (!methodDefined.parameters) {
          this._defaultParameters(method, methodDefined);
        }
      }
    }
  }
  return this.description;
};

ComponentInstance.prototype._inject = function(methodDefn, parameters, origin) {
  // must inject left to right otherwise subsequent left inject slides preceding right inject rightward
  if (typeof methodDefn.$happnSeq !== 'undefined' && typeof methodDefn.$originSeq !== 'undefined') {
    if (methodDefn.$happnSeq < methodDefn.$originSeq) {
      parameters.splice(methodDefn.$happnSeq, 0, this.bindToOrigin(origin));
      parameters.splice(methodDefn.$originSeq, 0, origin);
      return;
    }
    parameters.splice(methodDefn.$originSeq, 0, origin);
    parameters.splice(methodDefn.$happnSeq, 0, this.bindToOrigin(origin));
    return;
  }

  if (typeof methodDefn.$happnSeq !== 'undefined')
    parameters.splice(methodDefn.$happnSeq, 0, this.bindToOrigin(origin));
  if (typeof methodDefn.$originSeq !== 'undefined')
    parameters.splice(methodDefn.$originSeq, 0, origin);
};

ComponentInstance.prototype.__callBackWithError = function(category, message, callback) {
  const error = new Error(message);
  this.log.warn(category, error);
  if (callback) return callback(error);
  throw error;
};

ComponentInstance.prototype._loadModule = function(module) {
  var _this = this;

  Object.defineProperty(this, 'module', {
    // property: to remove internal components from view.
    value: module
  });

  Object.defineProperty(this, 'operate', {
    value: function(methodName, parameters, callback, origin, version) {
      _this.__authorizeOriginMethod(methodName, origin, function(e) {
        if (e) return callback(e);

        try {
          var callbackIndex = -1;
          var callbackCalled = false;

          _this.stats.component[_this.name].calls++;

          const methodSchema = _this.description.methods[methodName];
          const methodDefn = _this.module.instance[methodName];

          if (!methodSchema || typeof methodDefn !== 'function') {
            return _this.__callBackWithError(
              'Missing method',
              `Call to unconfigured method [${_this.name}.${methodName}()]`,
              callback
            );
          }

          if (version != null && !_this.semver.coercedSatisfies(_this.module.version, version)) {
            return _this.__callBackWithError(
              'Component version mismatch',
              `Call to unconfigured method [${_this.name}.${methodName}]: request version [${version}] does not match component version [${_this.module.version}]`,
              callback
            );
          }

          _this.log.$$TRACE('operate( %s', methodName);
          _this.log.$$TRACE('parameters ', parameters);
          _this.log.$$TRACE('methodSchema ', methodSchema);

          if (callback) {
            if (methodSchema.type === 'sync-promise') {
              try {
                _this._inject(methodDefn, parameters, origin);

                var result = methodDefn.apply(_this.module.instance, parameters);
                return callback(null, [null, result]);
              } catch (syncPromiseError) {
                return callback(null, [syncPromiseError]);
              }
            }

            for (var i in methodSchema.parameters) {
              if (methodSchema.parameters[i].type === 'callback') callbackIndex = i;
            }

            var callbackProxy = function() {
              if (callbackCalled)
                return _this.log.error(
                  'Callback invoked more than once for method %s',
                  methodName,
                  callback.toString()
                );

              callbackCalled = true;
              callback(null, Array.prototype.slice.apply(arguments));
            };

            callbackProxy.$origin = origin;

            if (callbackIndex === -1) {
              parameters.push(callbackProxy);
            } else {
              parameters.splice(callbackIndex, 1, callbackProxy);
            }
          }

          _this._inject(methodDefn, parameters, origin);

          let returnObject = methodDefn.apply(_this.module.instance, parameters);

          if (utilities.isPromise(returnObject)) {
            if (callbackIndex > -1 && utilities.isPromise(returnObject))
              _this.log.warn('method has been configured as a promise with a callback...');
            else {
              returnObject
                .then(function(result) {
                  if (callbackProxy) callbackProxy(null, result);
                })
                .catch(function(err) {
                  if (callbackProxy) callbackProxy(err);
                });
            }
          }
        } catch (callFailedError) {
          _this.log.error('Call to method %s failed', methodName, callFailedError);
          _this.stats.component[_this.name].errors++;

          if (callback) callback(callFailedError);
        }
      });
    }
  });
};

ComponentInstance.prototype._defaultParameters = function(method, methodSchema) {
  if (!methodSchema.parameters) methodSchema.parameters = [];
  utilities
    .getFunctionParameters(method)
    .filter(function(argName) {
      return argName !== '$happn' && argName !== '$origin';
    })
    .map(function(argName) {
      methodSchema.parameters.push({
        name: argName
      });
    });
};

ComponentInstance.prototype._discardMessage = function(reason, message) {
  this.log.error('message discarded: %s', reason, message);
};

ComponentInstance.prototype._hasNext = function(methodDefn) {
  var parameters = utilities.getFunctionParameters(methodDefn);
  return parameters.indexOf('next') >= 0;
};

ComponentInstance.prototype._getWebOrigin = function(mesh, params) {
  var cookieName = null;

  try {
    cookieName = mesh.config.happn.services.connect.config.middleware.security.cookieName;
  } catch (e) {
    // do nothing
  } //do nothing

  return mesh.happn.server.services.security.sessionFromRequest(params[0], {
    cookieName: cookieName
  });
};

ComponentInstance.prototype._runWithInjection = function(args, mesh, methodDefn) {
  var _this = this;

  var parameters = Array.prototype.slice.call(args);
  var origin = _this._getWebOrigin(mesh, parameters);

  _this._inject(methodDefn, parameters, origin);

  methodDefn.apply(_this.module.instance, parameters);
};

ComponentInstance.prototype._attachRouteTarget = function(
  mesh,
  meshRoutePath,
  componentRoutePath,
  targetMethod
) {
  var serve;
  var connect = mesh.happn.server.connect;
  var methodDefn =
    typeof targetMethod === 'function' ? targetMethod : this.module.instance[targetMethod];
  var componentRef = componentRoutePath.substring(1);
  var _this = this;

  if (typeof methodDefn !== 'function')
    throw new Error(
      `Middleware target ${_this.name}:${targetMethod} not a function or null, check your happner web routes config`
    );

  if (typeof methodDefn.$happnSeq !== 'undefined' || typeof methodDefn.$originSeq !== 'undefined') {
    if (this._hasNext(methodDefn)) {
      serve = function() {
        // preserve next in signature for connect
        _this._runWithInjection(arguments, mesh, methodDefn);
      };
    } else {
      serve = function() {
        _this._runWithInjection(arguments, mesh, methodDefn);
      };
    }
  } else {
    serve = methodDefn.bind(this.module.instance);
  }

  connect.use(meshRoutePath, serve);
  connect.use(componentRoutePath, serve);

  this.log.debug(`attached web route for component ${this.name}: ${meshRoutePath}`);

  // tag for _detatch() to be able to remove middleware when removing component
  serve.__tag = this.name;

  if (!mesh.config.web) return;
  if (!mesh.config.web.routes) return;

  // attach this as root middleware if configured
  Object.keys(mesh.config.web.routes).forEach(function(mountRoute) {
    var mountPoint = mesh.config.web.routes[mountRoute];
    if (componentRef !== mountPoint) return;
    connect.use(mountRoute, function(req, res, next) {
      req.rootWebRoute = mountRoute;
      req.componentWebRoute = mountPoint;
      serve(req, res, next);
    });
  });
};

ComponentInstance.prototype.__createSetOptions = function(originId, options) {
  if (this.config.directResponses)
    return _.merge(
      {
        targetClients: [originId]
      },
      options
    );
  else return options;
};

ComponentInstance.prototype.__raiseOnEmitError = function(e) {
  this.emitEvent('on-emit-error', e);
};

ComponentInstance.prototype.__raiseOnEmitOK = function(response) {
  this.emitEvent('on-emit-ok', response);
};

ComponentInstance.prototype.__raiseOnPublishError = function(e) {
  this.emitEvent('on-publish-error', e);
};

ComponentInstance.prototype.__raiseOnPublishOK = function(response) {
  this.emitEvent('on-publish-ok', response);
};

ComponentInstance.prototype.__getSubscribeMask = function() {
  return '/_exchange/requests/' + this.info.mesh.domain + '/' + this.name + '/*';
};

ComponentInstance.prototype.__reply = function(
  callbackAddress,
  callbackPeer,
  response,
  options,
  mesh
) {
  let client = mesh.data;
  if (callbackPeer) {
    // for cluster the set is performed back at the originating peer
    try {
      client = mesh.happn.server.services.orchestrator.peers[callbackPeer].client;
    } catch (e) {
      // no peer at callback (race conditions on servers stopping and starting) dead end...
      this.log.error('Failure on callback, missing peer', e);
      return;
    }
  }
  client.publish(callbackAddress, response, options, e => {
    if (e) {
      var logMessage = 'Failure to set callback data on address ' + callbackAddress;
      if (e.message && e.message === 'client is disconnected')
        return this.log.warn(logMessage + ':client is disconnected');
      this.log.error(logMessage, e);
    }
  });
};

ComponentInstance.prototype._attach = function(config, mesh, callback) {
  //attach module to the transport layer

  this.log.$$DEBUG('_attach()');

  var _this = this;

  _this.emit = function(key, data, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    if (options == null) options = {};
    if (options.noStore == null) options.noStore = true;

    options.meta = {
      componentVersion: _this.module.version
    };
    _this.stats.component[_this.name].emits++;

    var eventKey = '/_events/' + _this.info.mesh.domain + '/' + _this.name + '/';

    if ([1, 3].indexOf(options.consistency) > -1) {
      options.onPublished = function(e, results) {
        if (e) return _this.__raiseOnPublishError(e);
        _this.__raiseOnPublishOK(results);
      };
    }
    mesh.data.set(eventKey + key, data, options, function(e, response) {
      if (e) return _this.__raiseOnEmitError(e);
      _this.__raiseOnEmitOK(response);
      if (callback) callback(e, response);
    });
  };

  _this.emitLocal = function(key, data, callback) {
    // differs from .emit() in that the publish does not replicate into the cluster
    _this.stats.component[_this.name].emits++;
    var eventKey = '/_events/' + _this.info.mesh.domain + '/' + _this.name + '/';

    mesh.data.set(
      eventKey + key,
      data,
      {
        noStore: true,
        noCluster: true,
        meta: {
          componentVersion: _this.module.version
        }
      },
      callback
    );
  };

  if (config.web && config.web.routes) {
    try {
      Object.keys(config.web.routes).forEach(function(route) {
        var routeTarget = config.web.routes[route];
        var meshRoutePath = '/' + _this.info.mesh.name + '/' + _this.name + '/' + route;
        var componentRoutePath = '/' + _this.name + '/' + route;

        if (Array.isArray(routeTarget)) {
          routeTarget.map(function(targetMethod) {
            _this._attachRouteTarget(mesh, meshRoutePath, componentRoutePath, targetMethod, route);
          });
        } else {
          _this._attachRouteTarget(mesh, meshRoutePath, componentRoutePath, routeTarget, route);
        }
      });
    } catch (e) {
      _this.log.error('Failure to attach web methods', e);
      return callback(e);
    }
  }

  var subscribeMask = _this.__getSubscribeMask();

  _this.log.$$TRACE('data.on( ' + subscribeMask);
  mesh.data.on(
    subscribeMask,
    {
      event_type: 'set'
    },
    function(publication, meta) {
      _this.log.$$TRACE('received request at %s', subscribeMask);
      var message = publication;
      var method = meta.path.split('/').pop();

      if (_this.serializer && typeof _this.serializer.__decode === 'function') {
        message.args = _this.serializer.__decode(message.args, {
          req: true,
          res: false,
          at: {
            mesh: _this.info.mesh.name,
            component: _this.name
          },
          meta: meta
        });
      }

      var args = Array.isArray(message.args) ? message.args.slice(0, message.args.length) : [];

      if (!message.callbackAddress) return _this._discardMessage('No callback address', message);

      _this.operate(
        method,
        args,
        function(e, responseArguments) {
          var serializedError;

          if (e) {
            // error objects cant be sent / received  (serialize)
            serializedError = {
              message: e.message,
              name: e.name
            };

            Object.keys(e).forEach(function(key) {
              serializedError[key] = e[key];
            });

            _this.log.$$TRACE('operate( reply( ERROR %s', message.callbackAddress);

            return _this.__reply(
              message.callbackAddress,
              message.callbackPeer,
              {
                status: 'failed',
                args: [serializedError]
              },
              _this.info.happn.options,
              mesh
            );
          }

          var response = {
            status: 'ok',
            args: responseArguments
          };

          if (responseArguments[0] instanceof Error) {
            response.status = 'error';

            var responseError = responseArguments[0];

            serializedError = {
              message: responseError.message,
              name: responseError.name
            };

            Object.keys(responseError).forEach(function(key) {
              serializedError[key] = responseError[key];
            });

            responseArguments[0] = serializedError;
          }

          if (_this.serializer && typeof _this.serializer.__encode === 'function') {
            response.args = _this.serializer.__encode(response.args, {
              req: false,
              res: true,
              src: {
                mesh: _this.info.mesh.name,
                component: _this.name
              },
              meta: meta,
              opts: _this.__createSetOptions(publication.origin.id, _this.info.happn.options)
            });
          }

          // Populate response to the callback address
          _this.log.$$TRACE('operate( reply( RESULT %s', message.callbackAddress);

          var options = _this.__createSetOptions(publication.origin.id, _this.info.happn.options);
          _this.__reply(message.callbackAddress, message.callbackPeer, response, options, mesh);
        },
        meta.eventOrigin || message.origin,
        message.version
      );
    },
    function(e) {
      callback(e);
    }
  );
};

ComponentInstance.prototype._detatch = function(mesh, callback) {
  //
  // mesh._mesh
  this.log.$$DEBUG('_detatch() removing component from mesh');

  var _this = this;
  var connect = mesh.happn.server.connect;
  var name = this.name;

  // Remove this component's middleware from the connect stack.

  var toRemove = connect.stack

    .map(function(mware, i) {
      if (mware.handle.__tag !== name) return -1;
      return i;
    })

    .filter(function(i) {
      return i >= 0;
    })

    // splice starting from the back end so that array size change does not offset

    .reverse();

  toRemove.forEach(function(i) {
    _this.log.$$TRACE('removing mware at %s', connect.stack[i].route);
    connect.stack.splice(i, 1);
  });

  // Remove this component's request listener from the happn

  var listenAddress = '/_exchange/requests/' + this.info.mesh.domain + '/' + this.name + '/';
  var subscribeMask = listenAddress + '*';

  _this.log.$$TRACE('removing request listener %s', subscribeMask);

  mesh.data.offPath(subscribeMask, function(e) {
    if (e) _this.log.warn('half detatched, failed to remove request listener %s', subscribeMask, e);
    callback(e);
  });
};

// terminal: inline help $happn.README
ComponentInstance.prototype.README = function() {
  /*
   </br>
   ## This is the Component Instance
   It is available in the terminal at **$happn**. From modules, it is optionally
   injected (by argument name) into functions as **$happn**.
   It has access to the **Exchange**, **Event** and **Data** APIs as well as some
   built in utilities and informations.
   ### Examples
   __node> $happn.name
   'terminal'
   __node> $happn.constructor.name
   'ComponentInstance'
   __node> $happn.log.warn('blah blah')
   **[ WARN]** - 13398ms home (terminal) blah blah
   __node> $happn.info
   __node> $happn.config
   __node> $happn.data.README
   __node> $happn.event.README
   __node> $happn.exchange.README
   __node> $happn._mesh.*  // only with 'mesh'||'root' accessLevel
   __node> $happn._root.*  // only with 'root' accessLevel
   */
};
