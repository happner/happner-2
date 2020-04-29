module.exports = EndPointService;

var async = require('async');

function EndPointService(mesh, internals, exchangeAPI, eventAPI, happn) {
  this.mesh = mesh;
  this.Internals = internals;
  this.exchangeAPI = exchangeAPI;
  this.eventAPI = eventAPI;
  this.Happn = happn;
}

function EndPointInstance(
  mesh,
  internals,
  endpointName,
  exchangeAPI,
  eventAPI,
  happn,
  endpointConfig
) {
  this.mesh = mesh;
  this.Internals = internals;
  this.endpointName = endpointName;
  this.exchangeAPI = exchangeAPI;
  this.eventAPI = eventAPI;
  this.Happn = happn;
  this.endpointConfig = endpointConfig;
}

EndPointInstance.prototype.connect = function(callback) {
  var _this = this;

  var connecting = true;
  var attempts = 0;

  async.whilst(
    function(testCB) {
      testCB(null, connecting);
    },
    function(attemptCB) {
      attempts++;

      var attempCBInterval = function(error) {
        if (error)
          if (_this.endpointConfig.connectionErrorAttemptsLimit > 0)
            if (_this.endpointConfig.connectionErrorAttemptsLimit === attempts)
              return attemptCB(
                new Error('connection error attempt limit of ' + attempts + ' reached')
              );

        if (_this.endpointConfig.connectionAttemptsLimit > 0)
          if (_this.endpointConfig.connectionAttemptsLimit === attempts)
            return attemptCB(new Error('connection attempt limit of ' + attempts + ' reached'));

        setTimeout(function() {
          attemptCB();
        }, _this.endpointConfig.connectionAttemptsInterval);
      };

      _this.client.get('/mesh/schema/description', {}, function(error, description) {
        if (error) {
          _this.mesh.log.error("failed getting description from '%s'", _this.endpointName, error);

          return attempCBInterval(error);
        }

        try {
          if (_this.endpointName !== description.name) {
            var errorMessage =
              'endpoint ' + _this.endpointName + ' returned description for ' + description.name;

            _this.mesh.log.error(errorMessage);
            return attemptCB(new Error(errorMessage)); //fails without retrying
          }

          if (description.initializing) {
            _this.mesh.log.warn("awaiting remote initialization at '%s'", _this.endpointName);
            return attempCBInterval(); //just call back for another try
          }

          _this.update(description, function(e) {
            if (e) {
              _this.mesh.log.error("error updating description from '%s'", _this.endpointName, e);
              return attempCBInterval(e);
            }

            //connect up to changes in the remote meshes description
            _this.client.on(
              '/mesh/schema/description',

              function(data) {
                _this.update(data);
              },

              function(e) {
                if (e) {
                  _this.mesh.log.error(
                    "failed description subscription to '%s'",
                    _this.endpointName,
                    e
                  );
                  return attempCBInterval(e);
                }

                connecting = false;
                attemptCB();
              }
            );
          });
        } catch (e) {
          _this.mesh.log.warn("Malformed describe from mesh '%s' ignored.", _this.endpointName, e);
          attempCBInterval(e);
        }
      });
    },
    callback
  );
};

EndPointInstance.prototype.create = function(endpointConfig, callback) {
  var _this = this;

  _this.Happn.client.create(endpointConfig, function(error, client) {
    if (error) {
      _this.mesh.log.error("failed connection to endpoint '%s'", _this.endpointName, error);
      return callback(error);
    }

    _this.client = client;

    _this.client.__endpointConfig = endpointConfig;
    _this.client.__endpointName = _this.endpointName;

    //attach to the happn clients connection status events, the data is bubbled up through mesh events
    _this.client.onEvent('connection-ended', function(eventData) {
      _this.mesh.emit('endpoint-connection-ended', {
        endpointConfig: _this.client.__endpointConfig,
        endpointName: _this.client.__endpointName,
        eventData: eventData
      });
    });

    _this.client.onEvent('reconnect-scheduled', function(eventData) {
      _this.mesh.emit('endpoint-reconnect-scheduled', {
        endpointConfig: _this.client.__endpointConfig,
        endpointName: _this.client.__endpointName,
        eventData: eventData
      });
    });

    client.onEvent('reconnect-successful', function(eventData) {
      //update our messenger so directed requests go our way
      _this.mesh._mesh.endpoints[_this.endpointName].messenger.updateSession(_this.client.session);

      var reconnectData = {
        endpointConfig: _this.client.__endpointConfig,
        endpointName: _this.client.__endpointName,
        eventData: eventData
      };

      // indeterminate bug (on appveyor node v0.10) writes across the exchange
      // immediately following this reconnect event time out.
      //
      // relaying on next tick fixed it
      //
      // don't know if the problem is happn/primus firing the event early or the
      // remote not being ready to handle an exchange (eg. session/security re-init)

      process.nextTick(function() {
        _this.mesh.emit('endpoint-reconnect-successful', reconnectData);
      });
    });

    _this.connect(callback);
  });
};

EndPointInstance.prototype.update = function(description, callback) {
  var _this = this;

  _this.mesh.log.$$DEBUG("updating endpoint '%s'", _this.endpointName);

  _this.mesh.log.$$TRACE("got description from endpoint '%s'", _this.endpointName, description);

  if (!_this.mesh._mesh.endpoints[_this.endpointName]) {
    _this.mesh._mesh.endpoints[_this.endpointName] = {
      data: _this.client,
      name: _this.endpointName
    };
  }

  var endpoint = _this.mesh._mesh.endpoints[_this.endpointName];

  endpoint.previousDescription = endpoint.description;

  endpoint.description = description;

  _this.Internals._updateEndpoint(
    _this.mesh,
    _this.endpointName,
    _this.exchangeAPI,
    _this.eventAPI,
    function(e) {
      if (e) {
        var errorMessage = 'failed to update endpoint ' + _this.endpointName;

        _this.mesh.log.error(errorMessage, e);

        if (callback) return callback(e);
      }

      _this.mesh.log.info("initialized endpoint '%s'", _this.endpointName);

      if (callback) return callback(e);
    }
  );
};

EndPointInstance.prototype.disconnect = function(callback) {
  if (!this.client) return callback();
  this.client.disconnect(callback);
};

EndPointService.prototype.initialize = function(config, callback) {
  var _this = this;

  _this.activeEndpoints = {};

  if (!config.endpoints || Object.keys(config.endpoints).length === 0) return callback();

  async.eachSeries(
    Object.keys(config.endpoints),
    function(endpointName, endpointCB) {
      _this.mesh.log.$$DEBUG("initialize endpoint '%s'", endpointName);

      var endpointConfig = config.endpoints[endpointName];

      endpointConfig.config = endpointConfig.config || {};

      endpointConfig.name = endpointName;

      _this.mesh.log.$$TRACE('ENDPOINT: Happn.client.create( ', endpointConfig);
      // TODO: Shouldn't this rather use MeshClient instead of happn.client directly.

      endpointConfig.info = endpointConfig.info || {};
      endpointConfig.info.mesh = endpointConfig.info.mesh || {};
      endpointConfig.info.mesh.name = endpointConfig.info.mesh.name || _this.mesh._mesh.config.name;

      if (!endpointConfig.connectionAttemptsLimit) endpointConfig.connectionAttemptsLimit = 0;

      if (!endpointConfig.connectionErrorAttemptsLimit)
        endpointConfig.connectionErrorAttemptsLimit = 0; //connection can fail 10 times before we break

      if (!endpointConfig.connectionAttemptsInterval)
        endpointConfig.connectionAttemptsInterval = 5000;

      if (!endpointConfig.config.keyPair)
        endpointConfig.config.keyPair = _this.mesh._mesh.happn.server.services.security._keyPair;

      var endPointInstance = new EndPointInstance(
        _this.mesh,
        _this.Internals,
        endpointName,
        _this.exchangeAPI,
        _this.eventAPI,
        _this.Happn,
        endpointConfig
      );

      endPointInstance.create(endpointConfig, function(e) {
        if (e) return endpointCB(e);

        _this.activeEndpoints[endpointName] = endPointInstance;
        endpointCB();
      });
    },
    e => {
      callback(e);
    }
  );
};

EndPointService.prototype.stop = function(options, callback) {
  var _this = this;

  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  if (_this.activeEndpoints && Object.keys(_this.activeEndpoints).length > 0) {
    async.each(
      Object.keys(_this.activeEndpoints),
      function(endpointName, endpointCB) {
        _this.mesh.log.info("disconnecting endpoint '%s'", endpointName);
        _this.activeEndpoints[endpointName].disconnect(endpointCB);
      },
      function(e) {
        if (e) _this.mesh.log.warn("disconnecting endpoints failed '%s'", e.toString());

        callback();
      }
    );
  } else return callback();
};
