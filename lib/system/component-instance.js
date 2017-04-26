var MeshError = require('./shared/mesh-error');
var EventEmitter = require('events').EventEmitter;
var path = require('path');
var depWarned0 = false;  // $happn.mesh.*
var fs = require('fs');
var utilities = require('./utilities');
var _ = require('lodash');

module.exports = ComponentInstance;

function ComponentInstance() {
  this.localEventEmitter = new EventEmitter();
}

ComponentInstance.prototype.secureData = function (meshData, componentName) {

  var securedMeshData = {};
  securedMeshData.__persistedPath = '/_data/' + componentName;

  securedMeshData.getPath = function (path) {
    if (!path)
      throw new Error('invalid path: ' + path);

    if (path[0] != '/')
      path = '/' + path;

    return this.__persistedPath + path;
  };

  securedMeshData.on = function (path, parameters, handler, callback) {
    return meshData.on(this.getPath(path), parameters, handler, callback);
  };

  securedMeshData.off = function (listenerRef, callback) {

    if (typeof listenerRef == "number")
      return meshData.off(listenerRef, callback);

    return meshData.off(this.getPath(listenerRef), callback);
  };

  securedMeshData.offAll = function (callback) {
    //we cannot do a true offAll, otherwise we get no message back
    return meshData.offPath(this.getPath('*'), callback);
  };

  securedMeshData.offPath = function (path, callback) {

    return meshData.offPath(this.getPath(path), callback);
  };

  securedMeshData.get = function (path, parameters, callback) {
    return meshData.get(this.getPath(path), parameters, callback);
  };

  securedMeshData.getPaths = function (path, callback) {
    return meshData.getPaths(this.getPath(path), callback);
  };

  securedMeshData.set = function (path, data, parameters, callback) {
    return meshData.set(this.getPath(path), data, parameters, callback);
  };

  securedMeshData.setSibling = function (path, data, callback) {
    return meshData.setSibling(this.getPath(path), data, callback);
  };

  securedMeshData.remove = function (path, parameters, callback) {
    return meshData.remove(this.getPath(path), parameters, callback);
  };

  return securedMeshData;
};

ComponentInstance.prototype.initialize = function (name, root, mesh, module, config, callback) {

  this.README = this.README; // make visible
  this.name = name;
  this.config = {};

  this.info = {

    mesh: {},      // name,
    happn: {} // address, options

  };

  this.log = mesh._mesh.log.createLogger(this.name);
  this.Mesh = require('../mesh'); // local Mesh definition avaliable on $happn
  this.log.$$DEBUG('create instance');

  var _this = this;

  Object.defineProperty(_this, 'mesh', {
    get: function () {
      if (depWarned0) return _this;
      _this.log.warn('Use of $happn.mesh.* is deprecated. Use $happn.*');
      try {
        _this.log.warn(' - at %s', mesh.getCallerTo('componentInstance.js'));
      } catch (e) {
      }
      depWarned0 = true;
      return _this;
    }
  });

  Object.defineProperty(_this, 'tools', {
    get: function () {
      return mesh.tools;
    },
    enumerable: true,
  })

  var defaults;

  //TODO, here are the module.packaged settings

  if (typeof (defaults = module.instance.$happner) == 'object') {

    if (defaults.config && defaults.config.component) {
      Object.keys(defaults = defaults.config.component)
        .forEach(function (key) {
          // - Defaulting applies only to the 'root' keys nested immediately
          //   under the 'component' config
          // - Does not merge.
          // - Each key in the default is only used if the corresponding key is
          //   not present in the inbound config.
          if (typeof config[key] == 'undefined') {
            config[key] = JSON.parse(JSON.stringify(defaults[key]));
          }
        })
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
    get: function () {
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
    get: function () {
      return mesh._mesh.config.happn.setOptions; // TODO: should rather point to actual happn options,
      //        it may have defaulted more than we passed in.
    }
  });

  if (mesh._mesh.serializer) {
    Object.defineProperty(this, 'serializer', {
      value: mesh._mesh.serializer
    });
  }

  if (config.accessLevel == 'root') {
    Object.defineProperty(this, '_root', {
      get: function () {
        return root
      },
      enumerable: true
    });
  }

  if (config.accessLevel == 'mesh' || config.accessLevel == 'root') {
    Object.defineProperty(this, '_mesh', {
      get: function () {
        return mesh._mesh
      },
      enumerable: true
    });
  }

  try {

    this.config = config;

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
    this.data = this.secureData(mesh._mesh.data, this.name);

    this._loadModule(module);
    this._attach(config, mesh._mesh, callback);

  } catch (err) {
    callback(new MeshError('Failed to initialize component', err));
  }
};


ComponentInstance.prototype.describe = function (cached) {

  var _this = this;

  if (!cached || !this.description) {

    Object.defineProperty(this, 'description', {
      value: {
        name: _this.name,
        version: _this.module.version,
        methods: {},
        routes: {},
      },
      configurable: true
    });

    // build description.routes (component's web routes)

    var webMethods = {}; // accum list of webMethods to exclude from exhange methods description
    var routes, defn;
    if (this.config.web && (routes = this.config.web.routes)) {
      for (var routePath in routes) {

        var route = routes[routePath];

        if (route instanceof Array) {
          route.forEach(function (method) {
            webMethods[method] = 1;
            route = method; // last in route array is used to determine type: static || mware
          });
        } else {
          webMethods[route] = 1;
        }


        if (this.name == 'www' && routePath == 'global') continue;

        if (this.name == 'www') {
          if (routePath == 'static') {
            routePath = '/';                  // www: static: ['web','route'] served at /
          }
          else {
            routePath = '/' + routePath;      // www: webMethod: served at /webMethod
                                              // www: other: 'static' served at /other
          }
        }
        else if (routePath == 'resources' && this.name == 'resources') {
          routePath = '/' + routePath;
        }
        else if (routePath == 'static') {
          routePath = '/';
        }
        else {
          routePath = '/' + this.name + '/' + routePath;
        }

        // TODO: Not advertizing mesh route (eg. /meshname/component/method)
        //       No point.
        //       I think it would be better to remove the meshroutes alltogether

        defn = this.description.routes[routePath] = {};
        defn.type = route == 'static' ? 'static' : 'mware';

        // TODO: Advertize interface, params, query, restness, hmm
      }
    }

    // build description.events (components events)

    if (this.config.events) {
      this.description.events = JSON.parse(JSON.stringify(this.config.events));
    }
    else {
      this.description.events = {
        /* default none */
      };
    }

    // build description.data (components store paths)
    //
    // TODO: Build the per component data api wrapper that prepends the datapaths
    //       with something like _DATA/componentName/... so that security can be
    //       applied on a per component basis. (keep in mind folks may also subscribe
    //       to their data paths)

    if (this.config.data) {
      this.description.data = JSON.parse(JSON.stringify(this.config.data));
    }
    else {
      this.description.data = {
        /* default none */
      };
    }

    // build description.methods (component's web routes)

    var getMethodDefn = function (config, methodName) {
      if (!config.schema) return;
      if (!config.schema.methods) return;
      if (!config.schema.methods[methodName]) return;
      return config.schema.methods[methodName];
    }

    for (var methodName in this.module.instance) {

      var method = this.module.instance[methodName];
      var methodDefined = getMethodDefn(this.config, methodName);

      if (typeof method !== 'function') continue;
      if (method.$happner && method.$happner.ignore && !methodDefined) continue;
      if (methodName.indexOf('_') == 0 && !methodDefined) continue;

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

ComponentInstance.prototype._inject = function (methodDefn, parameters, origin) {
  // must inject left to right otherwise subsequent left inject slides preceding right inject rightward
  if (typeof methodDefn.$happnSeq !== 'undefined' && typeof methodDefn.$originSeq !== 'undefined') {
    if (methodDefn.$happnSeq < methodDefn.$originSeq) {
      parameters.splice(methodDefn.$happnSeq, 0, this);
      parameters.splice(methodDefn.$originSeq, 0, origin);
      return;
    }
    parameters.splice(methodDefn.$originSeq, 0, origin);
    parameters.splice(methodDefn.$happnSeq, 0, this);
    return;
  }

  if (typeof methodDefn.$happnSeq !== 'undefined') parameters.splice(methodDefn.$happnSeq, 0, this);
  if (typeof methodDefn.$originSeq !== 'undefined') parameters.splice(methodDefn.$originSeq, 0, origin);
};

ComponentInstance.prototype._loadModule = function (module) {

  var _this = this;
  Object.defineProperty(this, 'module', { // property: to remove internal components from view.
    value: module
  });

  Object.defineProperty(this, 'operate', {
    value: function (methodName, parameters, callback, origin) {
      try {
        var callbackIndex = -1;
        var callbackCalled = false;

        _this.stats.component[_this.name].calls++;

        var methodSchema = _this.description.methods[methodName];
        var methodDefn = _this.module.instance[methodName];
        var error;

        if (!methodSchema) {
          error = new Error('Call to unconfigured method \'' + _this.name + '.' + methodName + '()\'');
          _this.log.error('Missing method config', error);
          if (callback) return callback(error);
          // throw error
          return;
        }

        _this.log.$$TRACE('operate( %s', methodName);
        _this.log.$$TRACE('parameters ', parameters);
        _this.log.$$TRACE('methodSchema ', methodSchema);

        if (typeof methodDefn !== 'function')
          throw new MeshError('Missing ' + _this.name + '.' + methodName + '()', {parameters: parameters});

        if (callback) {

          if (methodSchema.type == 'sync-promise') {
            try {
              _this._inject(methodDefn, parameters, origin);

              var result = methodDefn.apply(_this.module.instance, parameters);
              return callback(null, [null, result]);
            } catch (e) {
              return callback(null, [e]);
            }
          }

          for (var i in methodSchema.parameters) {
            if (methodSchema.parameters[i].type == 'callback') callbackIndex = i
          }

          var callbackProxy = function () {

            if (callbackCalled)
              return _this.log.error('Callback invoked more than once for method %s', methodName, callback.toString());

            callbackCalled = true;
            callback(null, Array.prototype.slice.apply(arguments));
          };

          if (callbackIndex == -1) {
            parameters.push(callbackProxy)
          }
          else {
            parameters.splice(callbackIndex, 1, callbackProxy);
          }
        }

        _this._inject(methodDefn, parameters, origin);

        var returnObject = methodDefn.apply(_this.module.instance, parameters);

        if (callbackIndex == -1 && utilities.isPromise(returnObject)) {
          returnObject
            .then(function (result) {
              if (callbackProxy) callbackProxy(null, result);
            })
            .catch(function (err) {
              if (callbackProxy) callbackProxy(err);
            });
        }

      } catch (e) {

        _this.log.error('Call to method %s failed', methodName, e);
        _this.stats.component[_this.name].errors++;

        if (callback)
          callback(e);

        //else throw error;
        //
        //TODO - for syncronous calls may still want to throw, but it takes down the mesh
      }
    }
  });
};

ComponentInstance.prototype._defaultParameters = function (method, methodSchema) {

  if (!methodSchema.parameters) methodSchema.parameters = [];
  utilities.getFunctionParameters(method)
    .filter(function (argName) {
      return argName != '$happn' && argName != '$origin';
    })
    .map(function (argName) {
      methodSchema.parameters.push({name: argName});
    });
};

ComponentInstance.prototype._discardMessage = function (reason, message) {
  this.log.error("message discarded: %s", reason, message);
};

ComponentInstance.prototype._hasNext = function (methodDefn) {
  var parameters = utilities.getFunctionParameters(methodDefn);
  return parameters.indexOf('next') >= 0;
};

ComponentInstance.prototype._getWebOrigin = function (mesh, params) {

  var securityService = mesh.happn.server.services.security;
  var cookieName;

  try {
    cookieName = mesh.config.happn.services.connect.config.middleware.security.cookieName;
  } catch (e) {}

  cookieName = cookieName || 'happn_token';

  // first try extract session from cookie

  try {         // req (as first argument)
    var pairs = params[0].headers.cookie.split(';');
    for (var i = 0; i < pairs.length; i++) {
      var parts = pairs[i].split('=');
      var name = parts[0].trim();
      var value = parts[1].trim();

      if (name != cookieName) continue;
      return securityService.decodeToken(value);
      // assumes preceding middleware will handle session expiry etc.
    }
  } catch (e) {}

  // second try extract session from url query params

  var query = require('url').parse(params[0].url, true).query;

  if (!query[cookieName] && !query['happn_token']) return null;

  if (cookieName != 'happn_token' && !query[cookieName]) cookieName = 'happn_token';

  try {
    return securityService.decodeToken(query[cookieName]);
  } catch (e) {
    return null;
  }
};

ComponentInstance.prototype._runWithInjection = function (args, mesh, methodDefn) {

  var _this = this;

  var parameters = Array.prototype.slice.call(args);
  var origin = _this._getWebOrigin(mesh, parameters);

  _this._inject(methodDefn, parameters, origin);

  methodDefn.apply(_this.module.instance, parameters);
};

ComponentInstance.prototype._attachRouteTarget = function (mesh, meshRoutePath, componentRoutePath, targetMethod, route) {
  var serve;
  var connect = mesh.happn.server.connect;
  var methodDefn = typeof targetMethod == 'function' ? targetMethod : this.module.instance[targetMethod];
  var componentRef = componentRoutePath.substring(1);
  var _this = this;

  if (typeof methodDefn !== 'function') {
    throw new Error('Middleware not a function');
  }

  if (typeof methodDefn.$happnSeq !== 'undefined' || typeof methodDefn.$originSeq !== 'undefined') {
    if (this._hasNext(methodDefn)) {
      serve = function (res, req, next) {
        // preserve next in signature for connect
        _this._runWithInjection(arguments, mesh, methodDefn);
      };
    } else {
      serve = function () {
        _this._runWithInjection(arguments, mesh, methodDefn);
      };
    }
  } else {
    serve = methodDefn.bind(this.module.instance);
  }

  connect.use(meshRoutePath, serve);
  connect.use(componentRoutePath, serve);

  // tag for _detatch() to be able to remove middleware when removing component

  serve.__tag = this.name;

  if (!mesh.config.web) return;
  if (!mesh.config.web.routes) return;

  // attach this as root middleware if configured

  Object.keys(mesh.config.web.routes).forEach(function (mountRoute) {
    var mountPoint = mesh.config.web.routes[mountRoute];
    if (componentRef !== mountPoint) return;
    connect.use(mountRoute, serve);
  });
};

ComponentInstance.prototype.__createSetOptions = function(originId, options){

  if (this.config.directResponses) return _.merge({targetClients:[originId]}, options);
  else return options;
};

ComponentInstance.prototype._attach = function (config, mesh, callback) {
  //attach module to the transport layer

  this.log.$$DEBUG('_attach()');

  var _this = this;

  _this.emit = function (key, data, callback) {
    _this.stats.component[_this.name].emits++;
    var eventKey = '/_events/' + _this.info.mesh.domain + '/' + _this.name + '/';

    mesh.data.set(eventKey + key, data, {noStore: true, meta: {componentVersion: _this.module.version}}, callback);
  };

  _this.emitLocal = function (key, data, callback) {
    _this.stats.component[_this.name].emits++;
    var eventKey = '/_events/' + _this.info.mesh.domain + '/' + _this.name + '/';

    mesh.data.set(eventKey + key, data, {noStore: true, noCluster: true, meta: {componentVersion: _this.module.version}}, callback);
  };

  if (config.web) {
    try {
      for (var route in config.web.routes) {
        var routeTarget = config.web.routes[route];
        var meshRoutePath = '/' + this.info.mesh.name + '/' + this.name + '/' + route;
        var componentRoutePath = '/' + this.name + '/' + route;

        if (Array.isArray(routeTarget)) {
          routeTarget.map(function (targetMethod) {
            _this._attachRouteTarget(mesh, meshRoutePath, componentRoutePath, targetMethod, route);
          });
        } else {
          this._attachRouteTarget(mesh, meshRoutePath, componentRoutePath, routeTarget, route);
        }
      }
    } catch (e) {
      this.log.error("Failure to attach web methods", e);
      return callback(e);
    }
  }

  var listenAddress = '/_exchange/requests/' + this.info.mesh.domain + '/' + this.name + '/';
  var subscribeMask = listenAddress + '*';

  _this.log.$$TRACE('data.on( ' + subscribeMask);

  mesh.data.on(subscribeMask, {event_type: 'set'}, function (publication, meta) {
      _this.log.$$TRACE('received request at %s', subscribeMask);

      var pathParts = meta.path.replace(listenAddress, '').split('/');
      var message = publication;
      var method = pathParts[0];

      if (_this.serializer && typeof _this.serializer.__decode == 'function') {
        message.args = _this.serializer.__decode(message.args, {
          req: true,
          res: false,
          at: {
            mesh: _this.info.mesh.name,
            component: _this.name,
          },
          meta: meta,
        });
      }

      var args = message.args.slice(0, message.args.length);

      if (!message.callbackAddress) return _this._discardMessage('No callback address', message);

      _this.operate(method, args, function (e, responseArguments) {

          var serializedError;

          var reply = function (callbackAddress, callbackPeer, response, options) {

            var client = mesh.data;

            if (callbackPeer) {
              // for cluster the set is performed back at the originating peer
              try {
                client = mesh.happn.server.services.orchestrator.peers[callbackPeer].client;
              } catch (e) {
                // no peer at callback (race conditions on servers stopping and starting) dead end...
                _this.log.error("Failure on callback, missing peer", e);
              }
            }

            client.set(callbackAddress, response, options, function (e) {
              if (e) _this.log.error("Failure to set callback data", e);
            });
          };

          if (e) {

            // error objects cant be sent / received  (serialize)
            serializedError = {
              message: e.message,
              name: e.name,
            };

            Object.keys(e).forEach(function (key) {
              serializedError[key] = e[key];
            });

            _this.log.$$TRACE('operate( reply( ERROR %s', message.callbackAddress);

            return reply(message.callbackAddress, message.callbackPeer, {
              status: 'failed',
              args: [serializedError]
            }, _this.info.happn.options)
          }

          var response = {
            status: 'ok',
            args: responseArguments
          };

          if (responseArguments[0] instanceof Error) {

            response.status = 'error';

            var e = responseArguments[0];

            serializedError = {
              message: e.message,
              name: e.name
            };

            Object.keys(e).forEach(function (key) {
              serializedError[key] = e[key];
            });

            responseArguments[0] = serializedError;
          }

          if (_this.serializer && typeof _this.serializer.__encode == 'function') {

            response.args = _this.serializer.__encode(response.args, {
              req: false,
              res: true,
              src: {
                mesh: _this.info.mesh.name,
                component: _this.name,
              },
              meta: meta,
              opts: _this.__createSetOptions(publication.origin.id, _this.info.happn.options)
            });
          }

          // Populate response to the callback address
          _this.log.$$TRACE('operate( reply( RESULT %s', message.callbackAddress);

          var options = _this.__createSetOptions(publication.origin.id, _this.info.happn.options);

          reply(message.callbackAddress, message.callbackPeer, response, options);
        },
        message.origin);
    },
    function (e, r) {
      callback(e);
    }
  );
}

ComponentInstance.prototype._detatch = function (mesh, callback) {
  //
  // mesh._mesh
  this.log.$$DEBUG('_detatch() removing component from mesh');

  var _this = this;
  var connect = mesh.happn.server.connect;
  var name = this.name;

  // Remove this component's middleware from the connect stack.

  var toRemove = connect.stack

    .map(function (mware, i) {
      if (mware.handle.__tag != name) return -1;
      return i;
    })

    .filter(function (i) {
      return i >= 0;
    })

    // splice starting from the back end so that array size change does not offset

    .reverse();

  toRemove.forEach(function (i) {

    _this.log.$$TRACE('removing mware at %s', connect.stack[i].route);
    connect.stack.splice(i, 1);

  });

  // Remove this component's request listener from the happn

  var listenAddress = '/_exchange/requests/' + this.info.mesh.domain + '/' + this.name + '/';
  var subscribeMask = listenAddress + '*';

  _this.log.$$TRACE('removing request listener %s', subscribeMask);

  mesh.data.offPath(subscribeMask, function (e, r) {
    if (e) _this.log.warn(
      'half detatched, failed to remove request listener %s', subscribeMask, e
    );
    callback(e);
  });
};

ComponentInstance.prototype.runTestInternal = function (callback) {
  try {

    if (!this.module.instance.runTest)
      return callback(new MeshError('Module is not testable'));

    var _this = this;
    this.module.instance.runTest(callback);
    this.operateInternal(data.message, data.parameters, function (e, result) {

      if (e)
        return callback(e);

      if (_this.module.instance.verifyTestResults)
        return _this.module.instance.verifyTestResults(result, callback);

      callback(null, result);

    });

  } catch (e) {
    callback(e);
  }
};

// terminal: inline help $happn.README
ComponentInstance.prototype.README = function () {/*
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
}
