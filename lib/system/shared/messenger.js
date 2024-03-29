(function(isBrowser) {
  var Logger, Promisify, MeshError;

  if (isBrowser) {
    window.Happner = window.Happner || {};
    window.Happner.Messenger = Messenger;
    Promisify = Happner.Promisify;
    MeshError = Happner.MeshError;
  } else {
    module.exports = Messenger;
    Promisify = require('./promisify');
    Logger = require('happn-logger');
    MeshError = require('./mesh-error');
  }

  function Messenger(endpoint, mesh) {
    const exchange = mesh.exchange;

    if (typeof mesh.log === 'object' && mesh.log.createLogger) {
      this.log = mesh.log.createLogger('Messenger/' + endpoint.name);
    } else if (Logger) {
      if (!Logger.configured) Logger.configure();
      this.log = Logger.createLogger('Messenger/' + endpoint.name);
    } else {
      this.log = Happner.createLogger('Messenger/' + endpoint.name);
    }

    this.log.$$TRACE("creating new messenger for endpoint '%s'", endpoint.name);

    Object.defineProperty(this, '_endpoint', { value: endpoint });
    Object.defineProperty(this, '_exchange', { value: exchange });
    Object.defineProperty(this, '__responseHandlerCache', { value: {} });

    if (mesh.serializer != null) this.serializer = mesh.serializer;

    this.requestors = {};
    this.initialized = {};
    this.responseHandlers = {};
    this.eventRegister = 0;
    this.dataconfig = mesh.config.happn;

    this.updateSession(endpoint.data.session);

    if (!this._endpoint.description.setOptions)
      this._endpoint.description.setOptions = { noStore: true };

    endpoint.data.onEvent('connection-ended', () => {
      Object.keys(this.responseHandlers).forEach(callbackAddress => {
        this.failResponse(new Error('connection-ended'), callbackAddress);
      });
    });

    endpoint.data.onEvent('reconnect-successful', () => {
      // clear response subscriptions containing old session id
      var newSessionId = endpoint.data.session.id;
      Object.keys(this.__responseHandlerCache).forEach(responseMask => {
        var eventId;
        if (responseMask.indexOf(newSessionId) >= 0) return; // dont remove new response paths
        eventId = this.__responseHandlerCache[responseMask];
        endpoint.data.off(eventId, e => {
          if (!e) delete this.__responseHandlerCache[responseMask];
        });
      });
    });
  }

  Messenger.prototype.failResponse = function(error, callbackAddress) {
    const responseHandler = this.removeResponse(callbackAddress);
    if (responseHandler != null) responseHandler.handler(error);
  };

  Messenger.prototype.removeResponse = function(callbackAddress) {
    const responseHandler = this.responseHandlers[callbackAddress];
    if (!responseHandler) return null;
    clearTimeout(responseHandler.timedout);
    delete this.responseHandlers[callbackAddress];
    return responseHandler;
  };

  Messenger.prototype.updateSession = function(session) {
    this.session = { id: session.id };
    if (session.user) this.session.username = session.user.username;
  };

  Messenger.prototype.__ensureResponseHandler = function(responseMask, callback) {
    if (typeof this.__responseHandlerCache[responseMask] === 'undefined') {
      var _this = this;
      var endpoint = _this._endpoint;

      _this.log.$$TRACE('ensuring response handler - data.on( %s', responseMask);

      endpoint.data.on(
        responseMask,
        { event_type: 'set', count: 0 },
        _this.responseHandler.bind(_this),
        function(e, id) {
          if (e) {
            _this.log.$$TRACE('subscribe ERROR - data.on( %s', responseMask, e);
          } else {
            _this.__responseHandlerCache[responseMask] = id;
            _this.log.$$TRACE('subscribe OK - data.on( %s', responseMask);
          }
          callback(e);
        }
      );
    } else callback();
  };

  Messenger.prototype.updateRequestors = function(createComponents, destroyComponents, callback) {
    var _this = this;

    this.createRequestors(createComponents, function(e) {
      if (e) return callback(e);
      _this.destroyRequestors(destroyComponents, callback);
    });
  };

  Messenger.prototype.createRequestors = Promisify(function(componentNames, callback) {
    var endpoint = this._endpoint;
    var components = endpoint.description.components;

    var _this = this;

    componentNames.forEach(function(componentName) {
      var componentDescription = components[componentName];

      Object.keys(componentDescription.methods).forEach(function(methodName) {
        var requestAddress = '/' + endpoint.name + '/' + componentName + '/' + methodName;

        var description = componentDescription.methods[methodName];
        _this.log.$$DEBUG('creating requestor at %s', requestAddress);

        var requestor = function() {
          var origin = arguments[1];
          var setOptions = Object.assign({}, endpoint.description.setOptions);

          if (origin != null) setOptions.onBehalfOf = origin.username;

          var requestPath = '/_exchange/requests' + requestAddress;

          _this.__prepareMessage(
            endpoint.name,
            componentName,
            methodName,
            _this.session.id,
            description,
            arguments[0],
            function(e, message) {
              if (e) return _this.__discardMessage(message, e);

              if (_this.serializer && typeof _this.serializer.__encode === 'function') {
                message.args = _this.serializer.__encode(message.args, {
                  req: true,
                  res: false,
                  src: {
                    mesh: mesh.config.name,
                    browser: isBrowser
                    //////// component: 'possible?'
                  },
                  dst: {
                    endpoint: endpoint.name,
                    component: componentName,
                    method: methodName
                  },
                  addr: message.callbackAddress,
                  opts: setOptions
                });
              }

              _this.log.$$TRACE('data.publish( %s', requestPath);

              endpoint.data.publish(
                requestPath,
                message,
                setOptions,
                _this._createPubResponseHandle(message)
              );
            }
          );
        };

        // Assign specific requestor for this requestAddress
        _this.requestors[requestAddress] = requestor;
        // Assign `this` as messenger on the exchange
        _this._exchange[requestAddress] = _this;
      });

      // Mark component as initialized in this messenger
      _this.initialized[componentName] = Date.now();
    });
    callback(); // no particular need.
  });

  Messenger.prototype.destroyRequestors = Promisify(function(componentNames, callback) {
    // TODO: Deal with inprogress requests, don't leave client hanging on callback...
    if (componentNames.length === 0) return callback();

    var endpoint = this._endpoint;
    var components = endpoint.previousDescription.components;

    var _this = this;
    componentNames.forEach(function(componentName) {
      var componentDescription = components[componentName];
      Object.keys(componentDescription.methods).forEach(function(methodName) {
        var requestAddress = '/' + endpoint.name + '/' + componentName + '/' + methodName;

        _this.log.$$DEBUG('destroying requestor at %s', requestAddress);

        delete _this.requestors[requestAddress];
        delete _this._exchange[requestAddress];
      });

      delete _this.initialized[componentName]; // <-- had timestamp, could do component uptime
    });

    callback();
  });

  Messenger.prototype.deliver = function(address) {
    // remove address and pass args to requestor as array
    this.$self.log.$$TRACE('deliver( %s', address);
    var args = Array.prototype.slice.call(arguments);
    args.shift();
    this.$self.requestors[address](args, this.$origin);
  };

  Messenger.prototype._systemEvents = function(event, data) {
    this.log.warn(event, data);
  };

  Messenger.prototype.__discardMessage = function() {
    this.log.$$TRACE('data.publish( %j', arguments);
  };

  Messenger.prototype.__validateMessage = function(methodDescription, args, callback) {
    try {
      if (!methodDescription) return callback(new MeshError('missing methodDescription'));
      // throw new MeshError('Component does not have the method: ' + method);

      //do some schema based validation here
      var schemaValidationFailures = [];

      methodDescription.parameters.map(function(parameterDefinition, index) {
        if (parameterDefinition.required && !args[index])
          schemaValidationFailures.push({
            parameterDefinition: parameterDefinition,
            message: 'Required parameter not found'
          });
      });

      if (schemaValidationFailures.length > 0)
        return callback(new MeshError('schema validation failed', e));

      // NO! if the callback throws then a second callback will be made with the validation 'failed error'
      //
      // callback();
    } catch (e) {
      return callback(new MeshError('validation failed', e));
    }

    callback();
  };

  Messenger.prototype.__callbackImmediate = function(args, e, result) {
    try {
      if (args.length >= 1) {
        var callbackFunction = args[args.length - 1];
        if (callbackFunction && typeof callbackFunction === 'function') {
          callbackFunction(e, result);
        }
      }
    } catch (err) {
      this.log.error('failed running callback immediate', err);
    }
  };

  Messenger.prototype.__createCallbackHandler = function(actualHandler, message) {
    const thisMessenger = this;
    return {
      handleResponse: function(argumentsArray) {
        thisMessenger.removeResponse(message.callbackAddress);
        try {
          return actualHandler.apply(actualHandler, argumentsArray);
        } catch (e) {
          thisMessenger.log.error('error in response handler', e, actualHandler.toString());
        }
      },
      timedout: setTimeout(function() {
        thisMessenger.failResponse('Request timed out', message.callbackAddress);
      }, thisMessenger._endpoint.description.setOptions.timeout || 10000),
      handler: actualHandler // for use by the connection-ended event
    };
  };

  Messenger.prototype.__createMessage = function(
    callbackAddress,
    methodDescription,
    args,
    callback
  ) {
    var _this = this;
    var message = { callbackAddress: callbackAddress, args: [], origin: _this.session };

    methodDescription.parameters.map(function(parameterDescription, index) {
      if (
        parameterDescription.type === 'callback' ||
        (typeof args[index] === 'function' && index === args.length - 1)
      ) {
        // If the argument is a function it is only interpreted as the
        // callback if it is the last argument.
        //
        // But functions as arguments cannot be sent across the network
        // so in most cases it is inappropriate to pass function arguments
        // across the exchange.
        //
        // Functions can however be sent as arguments across the intra-process
        // happn.
        //
        // So exchange calls from the server to itself can have function params.
        //
        // This ability is used in the system/data component's on() function

        if (!args[index]) throw new MeshError('Callback for ' + address + ' was not defined');

        if (typeof args[index] !== 'function')
          throw new MeshError('Invalid callback for ' + address + ', callback must be a function');

        _this.responseHandlers[message.callbackAddress] = _this.__createCallbackHandler(
          args[index],
          message
        );
      } else if (args.length >= index + 1) {
        // include only args that were in the call
        // rather that padding in undefined's accoding to the config's arg definitions
        message.args.push(args[index]);
      }
    });

    // if the method is sync on the other side with no result expected, we don't create a callback handler
    if (
      args.length > 0 &&
      methodDescription.type !== 'sync' &&
      typeof args[args.length - 1] === 'function' &&
      !_this.responseHandlers[message.callbackAddress]
    ) {
      _this.responseHandlers[message.callbackAddress] = _this.__createCallbackHandler(
        args[args.length - 1],
        message
      );
    }

    return callback(null, message);
  };

  Messenger.prototype.__prepareMessage = function(
    endpointName,
    componentName,
    methodName,
    clientId,
    methodDescription,
    args,
    callback
  ) {
    var _this = this;

    _this.__validateMessage(methodDescription, args, function(e) {
      var responseHandlerAddress, responseMask, callbackAddress;

      if (e) return callback(e);

      if (_this.dataconfig.secure) {
        responseHandlerAddress = [endpointName, componentName, methodName, clientId].join('/');
        responseMask = '/_exchange/responses/' + responseHandlerAddress + '/*';
        callbackAddress =
          '/_exchange/responses/' + responseHandlerAddress + '/' + _this.eventRegister++;
      } else {
        responseHandlerAddress = [clientId, endpointName, componentName, methodName].join('/');
        responseMask = '/_exchange/responses/' + clientId + '/*/*/*/*';
        callbackAddress =
          '/_exchange/responses/' + responseHandlerAddress + '/' + _this.eventRegister++;
      }

      _this.__ensureResponseHandler(responseMask, function(e) {
        if (e) {
          return _this.__callbackImmediate(args, e); // try and run the actual response method directly
          //return callback(e);//dont do anything more
        }

        _this.__createMessage(callbackAddress, methodDescription, args, callback);
      });
    });
  };

  Messenger.prototype.responseHandler = function(response, meta) {
    if (response.status === 'error' && !meta) return this._systemEvents('nohandler', response);

    this.log.$$TRACE('responseHandler( %s', meta.path);

    if (this.serializer && typeof this.serializer.__decode === 'function') {
      response.args = this.serializer.__decode(response.args, {
        req: false,
        res: true,
        meta: meta
      });
    }

    var responseHandler = this.responseHandlers[meta.path];

    if (responseHandler) {
      if (response.status === 'ok') return responseHandler.handleResponse(response.args);

      var error;
      var serializedError = response.args[0];

      if (serializedError instanceof Error) {
        error = serializedError;
      } else {
        error = new Error(serializedError.message);
        error.name = serializedError.name;
        delete serializedError.message;
        delete serializedError.name;
        Object.keys(serializedError).forEach(function(key) {
          error[key] = serializedError[key];
        });
      }

      response.args[0] = error;
      return responseHandler.handleResponse(response.args);
    }

    this.log.$$DEBUG('nohandler', response);
  };

  Messenger.prototype._createPubResponseHandle = function(message) {
    var _this = this;
    return function(e) {
      if (e) {
        var assembledFailure = {
          status: 'error',
          args: [
            e instanceof Error
              ? e
              : {
                  message: e.toString(),
                  name: e.name
                }
          ]
        };
        return _this.responseHandler(assembledFailure, { path: message.callbackAddress });
      }
      _this.log.$$TRACE('request successful');
    };
  };
})(typeof module !== 'undefined' && typeof module.exports !== 'undefined' ? false : true);
