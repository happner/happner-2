(function(isBrowser) {
  var Promisify, Messenger, MeshError;
  var Internals = {};

  if (isBrowser) {
    window.Happner = window.Happner || {};
    window.Happner.Internals = Internals;
    Promisify = Happner.Promisify;
    Messenger = Happner.Messenger;
    MeshError = Happner.MeshError;
  } else {
    module.exports = Internals;
    Promisify = require('./promisify');
    Messenger = require('./messenger');
    MeshError = require('./mesh-error');
  }

  Internals._initializeLocal = function(_this, description, config, isServer, callback) {
    _this.log.$$TRACE('_initializeLocal()');

    if (!_this.post)
      Object.defineProperty(_this, 'post', {
        value: function(address) {
          _this.log.$$TRACE('post( %s', address);
          if (address.substring(0, 1) !== '/') address = '/' + address;

          if (address.split('/').length === 3) address = '/' + _this._mesh.config.name + address;

          if (!_this._mesh.exchange[address]) throw new MeshError('missing address ' + address);

          var messenger = _this._mesh.exchange[address];
          messenger.deliver.apply({ $self: messenger, $origin: this.$origin }, arguments);
        }
      });

    _this._mesh = _this._mesh || {};
    _this._mesh.endpoints = _this._mesh.endpoints || {};

    if (config.name) {
      _this._mesh.endpoints[config.name] = {
        description: description,
        local: isServer,
        name: config.name,
        data: isBrowser ? _this.data : _this.data || _this._mesh.data
      };
    }

    // Externals
    var exchangeAPI = (_this.exchange = _this.exchange || {});
    var eventAPI = (_this.event = _this.event || {});

    // Internals
    _this._mesh = _this._mesh || {};
    _this._mesh.exchange = _this._mesh.exchange || {};

    Internals.instance = _this;
    Internals._updateEndpoint(_this, config.name, exchangeAPI, eventAPI, callback);
  };

  Internals._updateEndpoint = function(_this, endpointName, exchangeAPI, eventAPI, callback) {
    _this.log.$$TRACE('_updateEndpoint( %s', endpointName);

    Internals._updateExchangeAPILayer(_this, endpointName, exchangeAPI)

      .then(function() {
        return Internals._updateEventAPILayer(_this, endpointName, eventAPI);
      })

      .then(function(result) {
        callback(null, result);
      })

      .catch(function(error) {
        callback(error);
      });
  };

  Internals._disconnectEndpoint = function(_this, endpointName, exchangeAPI, eventAPI, callback) {
    _this.log.$$TRACE('_disconnectEndpoint( %s', endpointName);

    Internals._disconnectExchangeAPILayer(_this, endpointName, exchangeAPI)

      .then(function() {
        return Internals._disconnectEventAPILayer(_this, endpointName, eventAPI);
      })

      .then(function(result) {
        callback(null, result);
      })

      .catch(function(error) {
        callback(error);
      });
  };

  Internals._updateExchangeAPILayer = Promisify(function(
    _this,
    endpointName,
    exchangeAPI,
    callback
  ) {
    _this.log.$$TRACE('_updateExchangeAPILayer( %s', endpointName);

    exchangeAPI[endpointName] = exchangeAPI[endpointName] || {};

    var endpoint = _this._mesh.endpoints[endpointName];
    var components = endpoint.description.components;
    var messenger = endpoint.messenger;

    if (endpoint.local && !components) {
      // - InitializeLocal on server occurs before components are created.
      //
      // - So on the first call this endpoint's component descriptions are empty.
      //
      // - Subsequent calls are made here with each component creation
      //   assembling it's APIs component by component (to allow runtime
      //   insertion of new components to initialize along the same code path)
      //
      // - The loop uses the messenger.initialized list to determine which
      //   are new components to configure into the messenger.
      return callback();
    }

    if (!messenger) {
      messenger = endpoint.messenger = new Messenger(endpoint, _this._mesh);
    }

    var runningComponents = Object.keys(messenger.initialized);
    var intendedComponents = Object.keys(components);
    var createComponents;
    var destroyComponents;

    // Initialize components into this endpoint's messenger

    createComponents = intendedComponents

      // Filter out components that are already initialized in the messenger.

      .filter(function(componentName) {
        return typeof messenger.initialized[componentName] === 'undefined';
      })

      .map(function(componentName) {
        // New Component
        var componentExchange = (exchangeAPI[endpointName][componentName] = {});
        var componentDescription = components[componentName];

        if (endpointName === _this._mesh.config.name) {
          exchangeAPI[componentName] = exchangeAPI[componentName] || {};
          exchangeAPI[componentName].__version = componentDescription.version;
        }

        // Create exchangeAPI 'Requestors' for each method

        Object.keys(componentDescription.methods).forEach(function(methodName) {
          var remoteRequestor, localRequestor;
          var requestPath = '/' + endpointName + '/' + componentName + '/' + methodName;

          var description = componentDescription.methods[methodName];
          var alias = description.alias;

          remoteRequestor = Promisify(
            function() {
              _this.post.apply(this, arguments);
            },
            {
              unshift: requestPath
            }
          );

          if (endpoint.local) {
            localRequestor = Promisify(function() {
              var args = Array.prototype.slice.call(arguments);
              var origin = this.$origin || _this._mesh.exchange[requestPath].session;
              var callback = args.pop();
              // Maintain similarity with message passing approach by using setImmediate on call and callback
              setImmediate(function() {
                _this._mesh.elements[componentName].component.instance.operate(
                  methodName,
                  args,
                  function(meshError, results) {
                    if (meshError) return callback(meshError); // unlikely since bypassing most of exchange
                    callback.apply(this, results); // results = [error, results...]
                  },
                  origin
                );
              });
            });
          }

          componentExchange[methodName] = remoteRequestor;
          if (alias) componentExchange[alias] = remoteRequestor;

          if (endpointName === _this._mesh.config.name) {
            exchangeAPI[componentName] = exchangeAPI[componentName] || {};
            exchangeAPI[componentName][methodName] = localRequestor || remoteRequestor;
            if (alias) {
              exchangeAPI[componentName][alias] = localRequestor || remoteRequestor;
            }
          }
        });

        // Return componentName for the .map to create the
        // array of newComponents.
        return componentName;
      });

    destroyComponents = runningComponents

      // Filter for components no longer inteded

      .filter(function(componentName) {
        return intendedComponents.indexOf(componentName) === -1;
      })

      .map(function(componentName) {
        // TODO: consider leaving a stub that callsback with a ComponentDeletedError
        // var componentDescription = endpoint.previousDescription;

        delete exchangeAPI[endpointName][componentName];
        delete _this.event[endpointName][componentName];

        if (endpointName === _this._mesh.config.name) {
          delete exchangeAPI[componentName];
          delete _this.event[componentName];
        }

        return componentName;
      });
    messenger.updateRequestors(createComponents, destroyComponents, callback);
  });

  Internals._getSubscriber = function(endpoint, domain, componentName, origin) {
    var eventKey = '/_events/' + domain + '/' + componentName + '/';

    return {
      //for bindToOrigin in component instance
      __endpoint: endpoint,
      __domain: domain,
      __componentName: componentName,

      once: function(key, handler, onceDone) {
        if (!onceDone) {
          onceDone = function(e) {
            if (e) Internals.instance.log.warn("subscribe to '%s' failed", key, e);
          };
        }

        var parameters = { event_type: 'set', count: 1 };
        if (origin) parameters.onBehalfOf = origin;

        endpoint.data.on(eventKey + key, parameters, handler, onceDone);
      },

      on: function(key, parameters, handler, onDone) {
        if (typeof parameters === 'function') {
          onDone = handler;
          handler = parameters;
          parameters = null;
        }

        if (!parameters) parameters = {};

        parameters.event_type = 'set';

        if (!onDone) {
          onDone = function(e) {
            if (e) _this.log.warn("subscribe to '%s' failed", key, e);
          };
        }

        if (key === '*') key = '**';

        if (origin) parameters.onBehalfOf = origin;
        endpoint.data.on(eventKey + key, parameters, handler, onDone);
      },

      off: function(key, offDone) {
        if (!offDone) {
          offDone = function(e) {
            if (e) _this.log.warn("unsubscribe from '%s' failed", key, e);
          };
        }
        if (typeof key === 'number') {
          endpoint.data.off(key, offDone);
        } else return offDone(new Error('off using a path or string is not possible, use offPath'));
      },

      offPath: function(path, offDone) {
        if (!offDone) {
          offDone = function(e) {
            if (e) _this.log.warn("unsubscribe from '%s' failed", path, e);
          };
        }
        endpoint.data.offPath(eventKey + path, offDone);
      }
    };
  };

  Internals._updateEventAPILayer = Promisify(function(_this, endpointName, eventAPI, callback) {
    _this.log.$$TRACE('_updateEventAPILayer( %s', endpointName);

    eventAPI[endpointName] = eventAPI[endpointName] || {};

    var endpoint = _this._mesh.endpoints[endpointName];
    var components = endpoint.description.components;

    if (endpoint.local && !components) return callback();

    Object.keys(components)

      .filter(function(componentName) {
        return typeof eventAPI[endpointName][componentName] === 'undefined';
      })

      .forEach(function(componentName) {
        var domain = endpointName;

        try {
          if (endpoint.local) {
            // Events now use the domain name in their path.
            //
            // But only if local, because remote nodes are "fooled" into using the domain name by putting it
            // into the description.name in order to still support legacy happner-1 attaching endpoints/clients
            domain = _this._mesh.config.domain;
          }
        } catch (e) {
          // do nothing
        }

        var subscriber = Internals._getSubscriber(endpoint, domain, componentName);

        eventAPI[endpointName][componentName] = subscriber;
        if (endpointName === _this._mesh.config.name)
          //is local, so create shortened route
          eventAPI[componentName] = subscriber;
      });

    callback();
  });
})(typeof module !== 'undefined' && typeof module.exports !== 'undefined' ? false : true);
