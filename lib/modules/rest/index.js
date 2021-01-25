var jsonBody = require('body/json'),
  utilities = require('../../system/utilities'),
  async = require('async'),
  url = require('url');
module.exports = Rest;

/**
 * Rest component, exposes the exchange over a lightweight REST service
 * @constructor
 */
function Rest() {}

/**
 * Does a happn login, returns a session token that is usable for subsequent operations
 * @param $happn
 * @param req
 * @param res
 */
Rest.prototype.login = function($happn, req, res) {
  var _this = this;

  _this.__parseBody(req, res, $happn, function(body) {
    var params = body;

    if (params.parameters) params = params.parameters;

    if (!params.username)
      return _this.__respond(
        $happn,
        'Failure parsing request body',
        null,
        new Error('no username'),
        res,
        401
      );
    if (!params.password)
      return _this.__respond(
        $happn,
        'Failure parsing request body',
        null,
        new Error('no password'),
        res,
        401
      );

    _this.__securityService.login(
      { username: params.username, password: params.password },
      function(e, session) {
        if (e) {
          if (e.toString() === 'AccessDenied: Invalid credentials')
            return _this.__respond($happn, 'Failure logging in', null, e, res, 401);
          return _this.__respond($happn, 'Failure logging in', null, e, res);
        }
        _this.__respond($happn, 'Logged in ok', { token: session.token }, null, res);
      }
    );
  });
};

/**
 * Attached to the mesh middleware, takes calls for a description of the API
 * @param $happn
 * @param req
 * @param res
 */
Rest.prototype.describe = function($happn, req, res, $origin) {
  var _this = this;
  var description = this.__exchangeDescription;

  if ($origin && $origin.username !== '_ADMIN') {
    description = JSON.parse(JSON.stringify(this.__exchangeDescription));

    async.eachSeries(
      Object.keys(description.callMenu),
      function(accessPoint, accessPointCB) {
        _this.__authorizeAccessPoint($happn, $origin, accessPoint, function(e, authorized) {
          if (e) accessPointCB(e);

          if (!authorized) delete description.callMenu[accessPoint];

          accessPointCB();
        });
      },
      function(e) {
        if (e) _this.__respond($happn, 'call failed', null, e, res);
        _this.__respond(
          $happn,
          $happn._mesh.description.name + ' description',
          description.callMenu,
          null,
          res
        );
      }
    );
  } else
    this.__respond(
      $happn,
      $happn._mesh.description.name + ' description',
      description.callMenu,
      null,
      res
    );
};

Rest.prototype.__respond = function($happn, message, data, error, res, code) {
  var responseString = '{"message":"' + message + '", "data":{{DATA}}, "error":{{ERROR}}}';

  var header = {
    'Content-Type': 'application/json'
  };

  //doing the replacements to the response string, allows us to stringify errors without issues.
  if (error) {
    if (!code) code = 500;
    responseString = responseString.replace('{{ERROR}}', utilities.stringifyError(error));
  } else {
    if (!code) code = 200;
    responseString = responseString.replace('{{ERROR}}', 'null');
  }

  res.writeHead(code, header);
  if (typeof data === 'undefined') data = null;
  responseString = responseString.replace('{{DATA}}', JSON.stringify(data));
  res.end(responseString);
};

Rest.prototype.__authorizeAccessPoint = function($happn, $origin, accessPoint, callback) {
  var _this = this;

  var name = $happn._mesh.config.domain || $happn._mesh.config.name;

  accessPoint = utilities.removeLeading('/', accessPoint);
  accessPoint = '/_exchange/requests/' + name + '/' + accessPoint;

  _this.__securityService.authorize($origin, accessPoint, 'set', function(e, authorized, reason) {
    callback(e, authorized, reason);
  });
};

Rest.prototype.__authorize = function(req, res, $happn, $origin, uri, successful) {
  var _this = this;

  if ($happn._mesh.config.happn.secure) {
    //check we need to check security

    if (!$origin)
      return _this.__respond(
        $happn,
        'Bad origin',
        null,
        new Error('origin of call unknown'),
        res,
        403
      );

    _this.__authorizeAccessPoint($happn, $origin, uri, function(e, authorized, reason) {
      if (e) return _this.__respond($happn, 'Authorization failed', null, e, res, 403);

      if (!authorized) {
        if (!reason) reason = 'Authorization failed';
        return _this.__respond($happn, reason, null, new Error('Access denied'), res, 403);
      }

      successful();
    });
  } else successful();
};

Rest.prototype.__parseBody = function(req, res, $happn, callback) {
  var _this = this;

  try {
    if (req.method === 'GET') {
      if (req.uri.query && req.uri.query.encoded_parameters)
        return callback(JSON.parse(decodeURIComponent(req.uri.query.encoded_parameters)));

      return callback({ parameters: req.uri.query });
    }

    if (req.body) return callback(req.body);

    jsonBody(req, res, function(e, body) {
      if (e) return _this.__respond($happn, 'Failure parsing request body', null, e, res);
      callback(body);
    });
  } catch (e) {
    return _this.__respond($happn, 'Failure parsing request body', null, e, res);
  }
};

/**
 * Attached to the mesh middleware, takes in the request body and attempts to execute an exchange method based on the request parameters
 * @param req
 * @param res
 * @param $happn
 * @param $origin
 */
Rest.prototype.handleRequest = function(req, res, $happn, $origin) {
  var _this = this;

  try {
    var methodURI = utilities.removeLeading('/', url.parse(req.url).pathname);

    _this.__parseBody(req, res, $happn, function(body) {
      _this.__authorize(req, res, $happn, $origin, '/' + methodURI, function() {
        var callPath = methodURI.split('/');

        //ensure we don't have a leading /
        if (callPath.length > 4)
          return _this.__respond(
            $happn,
            'Failure parsing request body',
            null,
            new Error('call path cannot have more than 4 segments'),
            res
          );

        process.nextTick(function() {
          var mesh;
          var component;
          var method;

          var meshDescription;
          var componentDescription;
          var methodDescription;

          var componentIndex = 0;

          if (callPath.length === 3) {
            var meshName = callPath[0];

            if (meshName !== $happn._mesh.config.name)
              return _this.__respond(
                $happn,
                'Access denied',
                null,
                new Error('attempt to access remote mesh: ' + meshName),
                res,
                403
              );

            componentIndex = 1;
            mesh = $happn.exchange[meshName];
          } else mesh = $happn.exchange;

          meshDescription = _this.__exchangeDescription;

          var componentName = callPath[componentIndex];

          if (componentName === 'security')
            return _this.__respond(
              $happn,
              'Access denied',
              null,
              new Error('attempt to access security component over rest'),
              res,
              403
            );

          if (mesh[callPath[componentIndex]]) component = mesh[callPath[componentIndex]];
          else
            return _this.__respond(
              $happn,
              'Failure parsing request body',
              null,
              new Error('component ' + callPath[componentIndex] + ' does not exist on mesh'),
              res,
              404
            );

          componentDescription = meshDescription.components[callPath[componentIndex]];

          var methodIndex = componentIndex + 1;

          if (component[callPath[methodIndex]]) method = component[callPath[methodIndex]];
          else
            return _this.__respond(
              $happn,
              'Failure parsing request body',
              null,
              new Error(
                'method ' +
                  callPath[methodIndex] +
                  ' does not exist on component ' +
                  callPath[componentIndex]
              ),
              res,
              404
            );

          methodDescription = componentDescription.methods[callPath[methodIndex]];

          var args = [];

          var __callback = function(e, response) {
            if (e) return _this.__respond($happn, 'Call failed', null, e, res, 500);
            _this.__respond($happn, 'Call successful', response, null, res);
          };

          var callbackFound = false;

          if (!body.parameters) body.parameters = {};

          methodDescription.parameters.map(function(parameter) {
            if (parameter.name === 'callback') {
              args.push(__callback);
              callbackFound = true;
              return;
            }

            if (parameter.name === '$restParams') {
              if (body.parameters) {
                delete body.parameters.happn_token;
                delete body.parameters.username;
                delete body.parameters.password;
                args.push(body.parameters);
              } else args.push({});

              return;
            }

            if (parameter.name === '$userSession') {
              args.push($origin);
              return;
            }

            if (parameter.name.indexOf('$req_') === 0) {
              let key = parameter.name.split('$req_').pop();
              args.push(req[key]);
              return;
            }

            if (body.parameters[parameter.name] !== undefined) {
              args.push(body.parameters[parameter.name]);
            } else args.push(null);
          });

          //add the callback handler
          if (!callbackFound) args.push(__callback);

          method.apply(method, args);
        });
      });
    });
  } catch (e) {
    return _this.__respond($happn, 'Call failed', null, e, res, 500);
  }
};

Rest.prototype.attachedToMeshEvents = false;

Rest.prototype.__buildCallMenu = function(exchangeDescription, endpoint, menu) {
  var callMenu = {};
  if (menu) callMenu = menu;

  for (var componentName in exchangeDescription.components) {
    var component = exchangeDescription.components[componentName];
    if (componentName === 'security') continue;

    for (var methodName in component.methods) {
      var method = component.methods[methodName];
      var callUri = '/' + componentName + '/' + methodName;
      if (endpoint) callUri = '/' + endpoint + callUri;
      var operation = {
        uri: callUri,
        parameters: {}
      };

      for (var paramIndex in method.parameters) {
        var param = method.parameters[paramIndex];
        if (param.name === 'callback') continue;
        operation.parameters[param.name] = '{{' + param.name + '}}';
      }
      callMenu[callUri] = operation;
    }
  }
  return callMenu;
};

Rest.prototype.__updateDescription = function(description) {
  const exclusions = ['initializing', 'setOptions', '_meta'];

  const cleanedDescription = Object.keys(description).reduce((cleanedDesc, key) => {
    if (exclusions.indexOf(key) === -1) cleanedDesc[key] = description[key];
    return cleanedDesc;
  }, {});

  this.__exchangeDescription = cleanedDescription;
  this.__exchangeDescription.callMenu = this.__buildCallMenu(cleanedDescription);
};

Rest.prototype.initialize = function($happn, callback) {
  this.__securityService = $happn._mesh.happn.server.services.security;
  if (!this.attachedToMeshEvents) {
    $happn._mesh.on('description-updated', this.__updateDescription.bind(this));
    this.attachedToMeshEvents = true;
  }
  this.__updateDescription($happn._mesh.description);
  callback();
};
