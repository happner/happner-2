(function(isBrowser) {
  var Internals, Logger, EventEmitter, MeshHappnClient, maybePromisify;

  // 'reconnect-scheduled' event becomes 'reconnect/scheduled'
  var deprecatedReconnectScheduledEventWarned = false;
  // 'reconnect-successful' event becomes 'reconnect/successful'
  var deprecatedReconnectSuccessfulEventWarned = false;
  // 'connection-ended' event becomes 'connection/ended'
  var deprecatedConnectionEndedEventWarned = false;
  // 'destroy/components' event becomes 'components/destroyed'
  var deprecatedDestroyComponentsWarned = false;
  // 'create/components' event becomes 'components/created'
  var deprecatedCreateComponentsWarned = false;

  if (isBrowser) {
    window.Happner = window.Happner || {};
    window.Happner.MeshClient = MeshClient;
    window.MeshClient = MeshClient; // TODO: deprecate this.
    Internals = Happner.Internals;
    EventEmitter = Primus.EventEmitter;
    MeshHappnClient = HappnClient; //we want to keep whatever uses this within local scope
    maybePromisify = Happner.Promisify;
  } else {
    module.exports = MeshClient;
    MeshHappnClient = require('happn-3').client; //we want to keep whatever uses this within local scope
    Internals = require('./internals');
    Logger = require('happn-logger');
    EventEmitter = require('events').EventEmitter;
    maybePromisify = require('./promisify');
  }

  var extend = function(subclass, superclass) {
    Object.keys(superclass.prototype).forEach(function(method) {
      subclass.prototype[method] = superclass.prototype[method];
    });
  };

  function MeshClient /* opts */() {
    /* hostname, port, secret, callback */
    EventEmitter.call(this);
    MeshClient.prototype.login = maybePromisify(login);
    MeshClient.prototype.disconnect = maybePromisify(disconnect);

    var log;

    var args = Array.prototype.slice.call(arguments);

    var opts = {};
    var hostname; // first string arg
    var port; // the only number arg
    var callback; // the only arg that's a function

    args.forEach(function(arg) {
      if (typeof arg === 'object') opts = arg;
      else if (typeof arg === 'number') port = arg;
      else if (typeof arg === 'string' && !hostname) hostname = arg;
      else if (typeof arg === 'function') callback = arg;
    });

    // xx
    hostname = hostname || opts.host || opts.hostname || opts.address;
    port = port || opts.port;

    if (!hostname) {
      hostname = isBrowser ? window.location.hostname : 'localhost';
    }

    if (!port) {
      if (isBrowser) {
        opts.protocol = opts.protocol || window.location.href.split(':')[0];
        if (!window.location.port) {
          if (opts.protocol === 'https') {
            port = 443;
          } else {
            port = 80;
          }
        } else {
          port = window.location.port; // use the port that the page came from
        }
      }
    }

    opts.hostname = opts.hostname || opts.host || hostname;
    opts.port = opts.port || port || 55000;
    opts.reconnect = opts.reconnect || {};

    this.opts = opts;

    if (isBrowser) {
      log = Happner.createLogger('MeshClient');
    } else {
      if (opts.logger && opts.logger.createLogger) {
        log = opts.logger.createLogger('MeshClient');
      } else if (Logger) {
        log = Logger.createContext('client').createLogger('MeshClient');
      } else {
        log = Happner.createLogger('MeshClient');
      }
    }

    this.log = opts.log = log;

    this.log.$$DEBUG('created instance with opts', opts);

    if (typeof callback === 'function') {
      log.warn('MeshClient() with login callback is deprecated.');
      log.warn('see: https://github.com/happner/happner/blob/master/docs/client.md');
      log.info('connecting to %s:%s', hostname, port);
      const _this = this;
      return initialize(this, opts, function(e, instance) {
        if (e) return callback(e);
        _this.clientInstance = instance; //so we are able to disconnect gracefully
        //see _this.disconnect function
        callback(e, instance);
      });
    }
  }

  extend(MeshClient, EventEmitter);

  MeshClient.clearCookieEventObjects = function() {
    MeshHappnClient.clearCookieEventObjects();
  };

  MeshClient.prototype.isConnected = function() {
    return this.data != null && [1, 4, 5, 6, 7].indexOf(this.data.status) >= 0;
  };

  function login(credentials, callback) {
    setTimeout(() => {
      this.log.$$DEBUG('login()');

      if (typeof credentials === 'undefined') credentials = {};
      if (typeof credentials === 'function') {
        callback = credentials;
        credentials = {};
      }

      var cloneOpts = { ...this.opts };

      [
        'username',
        'password',
        'secret',
        'token',
        'useCookie',
        'cookieEventHandler',
        'authType'
      ].forEach(function(key) {
        if (credentials[key]) {
          cloneOpts[key] = credentials[key];
        }
      });

      initialize(this, cloneOpts, (e, client) => {
        if (e) {
          callback(e);
          return;
        }
        this.clientInstance = client;
        callback();
      });
    }, 0);
  }

  function disconnect(opts, cb) {
    try {
      if (typeof opts === 'function') {
        cb = opts;
        opts = null;
      }

      if (this.clientInstance && this.clientInstance.data) {
        return this.clientInstance.data.disconnect(opts, cb);
      }

      if (typeof cb === 'function') {
        return setTimeout(cb, 0);
      }
    } catch (e) {
      if (this.log) {
        this.log.warn('client disconnection failed: ', e);
      }
    }
  }

  var initialize = function(instance, opts, callback) {
    if (!(instance instanceof MeshClient)) instance = new EventEmitter();

    return new Promise(function(resolve, reject) {
      var client = {
        _mesh: {},
        log: opts.log,
        updateSession: function(session) {
          var _this = this;

          _this.session = session;

          if (_this._mesh && _this._mesh.endpoints) {
            Object.keys(_this._mesh.endpoints).forEach(function(endpointName) {
              var endpoint = _this._mesh.endpoints[endpointName];
              endpoint.messenger.session.id = session.id;
            });
          }
        }
      };

      var warned = false;
      Object.defineProperty(client, 'api', {
        get: function() {
          if (!warned) {
            //eslint-disable-next-line
            console.warn('Use of client.api.* is deprecated. Use client.*');
            warned = true;
          }
          return client;
        }
      });

      var config = {
        protocol: opts.protocol || 'http',
        host: opts.hostname,
        port: opts.port,
        allowSelfSignedCerts: opts.allowSelfSignedCerts
      };

      if (opts.username) config.username = opts.username;
      if (opts.password) config.password = opts.password;
      if (opts.authType) config.authType = opts.authType;

      if (opts.token) config.token = opts.token;
      if (opts.useCookie) config.useCookie = opts.useCookie;
      if (opts.cookieEventHandler) config.cookieEventHandler = opts.cookieEventHandler;

      if (instance.isConnected()) instance.data.disconnect(createClient);
      else createClient();

      function createClient() {
        delete instance.data;
        const createClientOpts = {
          config: config,
          info: opts.info,
          Logger: opts.log,
          reconnect: opts.reconnect,
          socket: opts.socket
        };
        if (typeof opts.cookieEventHandler === 'function') {
          createClientOpts.cookieEventHandler = opts.cookieEventHandler;
          createClientOpts.cookieName = opts.cookieName;
          createClientOpts.cookieEventInterval = opts.cookieEventInterval;
        }
        MeshHappnClient.create(createClientOpts, function(e, fbclient) {
          if (e) {
            if (e.name && e.name.indexOf('AccessDenied') === 0) {
              instance.emit('login/deny', e);
              if (
                typeof instance._events !== 'undefined' &&
                typeof instance._events['login/deny'] !== 'undefined'
              ) {
                e.handled = true;
                return callback(e);
              }
              return callback(e);
            }

            // TODO: Error called back from HappnClient is not of much use in browser (possibly in nodejs too)
            //       Two page refreshes produces a null Error (it has no message)
            //       But in the background the actual error fires unreachably:
            //       WebSocket connection to 'ws://10.0.0.44:50505/primus/?_primuscb=L7lGmx-' failed: Error in connection establishment: net::ERR_ADDRESS_UNREACHABLE
            //       No page refresh leaves us hanging, then produces a slightly more usefull error after a time.

            instance.emit('login/error', e);
            if (
              typeof instance._events !== 'undefined' &&
              typeof instance._events['login/error'] !== 'undefined'
            ) {
              e.handled = true;
              return callback(e);
            }
            return callback(e);
          }

          client.data = fbclient;

          client.session = fbclient.session;

          instance.data = client.data;

          client.data.onEvent('reconnect-scheduled', function(data) {
            if (instance._events && instance._events['reconnect-scheduled']) {
              if (!deprecatedReconnectScheduledEventWarned) {
                client.log.warn(
                  "DEPRECATION WARNING: please use event:'reconnect/scheduled' and not event:'reconnect-scheduled'"
                );
                deprecatedReconnectScheduledEventWarned = true;
              }
              instance.emit('reconnect-scheduled', data);
            }
            instance.emit('reconnect/scheduled', data);
          });

          client.data.onEvent('reconnect-successful', function(data) {
            client.updateSession(fbclient.session);

            if (instance._events && instance._events['reconnect-successful']) {
              if (!deprecatedReconnectSuccessfulEventWarned) {
                client.log.warn(
                  "DEPRECATION WARNING: please use event:'reconnect/successful' and not event:'reconnect-successful'"
                );
                deprecatedReconnectSuccessfulEventWarned = true;
              }
              instance.emit('reconnect-successful', data);
            }
            instance.emit('reconnect/successful', data);
          });

          client.data.onEvent('connection-ended', function(data) {
            if (instance._events && instance._events['connection-ended']) {
              if (!deprecatedConnectionEndedEventWarned) {
                client.log.warn(
                  "DEPRECATION WARNING: please use event:'connection/ended' and not event:'connection-ended'"
                );
                deprecatedConnectionEndedEventWarned = true;
              }
              instance.emit('connection-ended', data);
            }
            instance.emit('connection/ended', data);
          });

          client.data.onEvent('session-ended', function(data) {
            instance.emit('session/ended', data);
          });

          var buzy = false;

          var interval;

          var initializeLoop = function() {
            if (buzy) return; // initialize is called on interval, ensure only one running at a time.

            buzy = true;

            client.data.get('/mesh/schema/*', function(e, response) {
              if (e) {
                clearInterval(interval);
                buzy = false;
                instance.emit('login/error', e);
                reject(e);
                return callback(e);
              }

              if (response.length < 2) {
                buzy = false;
                client.log.warn('awaiting schema');
                return; // around again.
              }

              response.map(function(configItem) {
                if (configItem._meta.path === '/mesh/schema/config') {
                  client._mesh.config = configItem;
                } else if (configItem._meta.path === '/mesh/schema/description') {
                  client._mesh.description = configItem;
                }
              });

              if (!client._mesh.config.name || !client._mesh.description.name) {
                buzy = false;
                client.log.warn('awaiting schema');
                return; // around again.
              }

              if (client._mesh.description.initializing) {
                buzy = false;
                client.log.warn('awaiting schema');
                return; // around again.
              }

              var isServer = false;
              Internals._initializeLocal(
                client,
                client._mesh.description,
                client._mesh.config,
                isServer,
                function(e) {
                  if (e) {
                    clearInterval(interval);
                    buzy = false;
                    reject(e);
                    return callback(e);
                  }
                  clearInterval(interval);
                  buzy = false;

                  // Assign api

                  instance.event = client.event;
                  instance.exchange = client.exchange;
                  instance.token = client.session.token;

                  instance.info = {};

                  Object.defineProperty(instance.info, 'name', {
                    enumerable: true,
                    value: client._mesh.config.name
                  });

                  Object.defineProperty(instance.info, 'version', {
                    enumerable: true,
                    value: client._mesh.config.version
                  });

                  return subscribe();
                }
              );
            });
          };

          interval = setInterval(initializeLoop, 20000); // Does not cause 'thundering herd'.
          //
          // This retry loop is applicable only
          // to new connections being made BETWEEN
          // server start and server ready.
          initializeLoop();

          var subscribe = function() {
            // TODO: subscribe to config? does it matter

            var exchange = client.exchange;
            var event = client.event;

            return client.data
              .on(
                '/mesh/schema/description',

                function(description) {
                  // call api assembly with updated subscription

                  var endpointName = description.name;
                  var endpoint = client._mesh.endpoints[endpointName];

                  if (!endpoint) {
                    // crash prevention, see https://github.com/happner/happner/issues/172
                    client.log.warn('happner #172 - could not find endpoint ' + endpointName);
                    return;
                  }

                  var previousDescription = endpoint.description;
                  var previousComponents = Object.keys(previousDescription.components);

                  endpoint.previousDescription = previousDescription;
                  endpoint.description = description;

                  client.__endPointName = endpointName;

                  Internals._updateEndpoint(client, endpointName, exchange, event, function(err) {
                    if (err) return client.log.error('api update failed', err); // Not much can be done...

                    client.log.info('api updated!');

                    var updatedComponents = Object.keys(description.components);

                    var create = updatedComponents
                      .filter(function(name) {
                        return previousComponents.indexOf(name) === -1;
                      })
                      .map(function(name) {
                        return {
                          description: JSON.parse(
                            // deep copy description
                            JSON.stringify(
                              // (prevent accidental changes to live)
                              description.components[name]
                            )
                          )
                        };
                      });

                    var destroy = previousComponents
                      .filter(function(name) {
                        return updatedComponents.indexOf(name) === -1;
                      })
                      .map(function(name) {
                        return {
                          description: JSON.parse(
                            JSON.stringify(previousDescription.components[name])
                          )
                        };
                      });

                    if (destroy.length > 0) {
                      instance.emit('components/destroyed', destroy);
                      instance.emit('destroy/components', destroy);
                    }
                    if (create.length > 0) {
                      instance.emit('components/created', create);
                      instance.emit('create/components', create);
                    }
                  });
                }
              )
              .then(function() {
                client.log.info('initialized!');
                instance.emit('login/allow'); // PENDING (also in .login().resolved) something useful in login result
                if (instance._events && instance._events['destroy/components']) {
                  if (!deprecatedDestroyComponentsWarned) {
                    deprecatedDestroyComponentsWarned = true;
                    client.log.warn(
                      "DEPRECATION WARNING: please use event:'components/destroyed' and not event:'destroy/components'"
                    );
                  }
                }
                if (instance._events && instance._events['create/components']) {
                  if (!deprecatedCreateComponentsWarned) {
                    deprecatedCreateComponentsWarned = true;
                    client.log.warn(
                      "DEPRECATION WARNING: please use event:'components/created' and not event:'create/components'"
                    );
                  }
                }

                var components = client._mesh.description.components;
                var payload = Object.keys(components).map(function(name) {
                  return {
                    description: JSON.parse(JSON.stringify(components[name]))
                  };
                });

                instance.emit('components/created', payload);
                instance.emit('create/components', payload);
                resolve(instance);
                callback(null, instance);
              })
              .catch(function(e) {
                client.log.error('failed on subscribe', e);
                instance.emit('login/error', e);
                callback(e);
                reject(e);
              });
          };
        });
      }
    });
  };
})(typeof module !== 'undefined' && typeof module.exports !== 'undefined' ? false : true);
