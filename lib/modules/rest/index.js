let utilities = require('../../system/utilities'),
  async = require('async'),
  _ = require('lodash');
module.exports = Rest;

/**
 * Rest component, exposes the exchange over a lightweight REST service
 * @constructor
 */
function Rest() {
  this.jsonBody = require('body/json');
  this.__processRequestBound = this.__processRequest.bind(this);
}

// does a happn login, returns a session token that is usable for subsequent operations
Rest.prototype.login = function($happn, req, res) {
  this.__parseBody(req, res, $happn, body => {
    let params = body;

    if (params.parameters) params = params.parameters;

    if (!params.username) {
      return this.__respond(
        $happn,
        'Failure parsing request body',
        null,
        new Error('no username'),
        res,
        401
      );
    }

    if (!params.password) {
      return this.__respond(
        $happn,
        'Failure parsing request body',
        null,
        new Error('no password'),
        res,
        401
      );
    }

    this.__securityService.login(
      { username: params.username, password: params.password },
      (e, session) => {
        if (e) {
          if (e.toString() === 'AccessDenied: Invalid credentials') {
            return this.__respond($happn, 'Failure logging in', null, e, res, 401);
          }
          return this.__respond($happn, 'Failure logging in', null, e, res);
        }
        this.__respond($happn, 'Logged in ok', { token: session.token }, null, res);
      }
    );
  });
};

// attached to the mesh middleware, takes calls for a description of the API
Rest.prototype.describe = function($happn, _req, res, $origin) {
  let description = utilities.clone(this.__exchangeDescription);

  if (!$origin || $origin.username === '_ADMIN')
    return this.__respond(
      $happn,
      $happn._mesh.description.name + ' description',
      description.callMenu,
      null,
      res
    );

  async.eachSeries(
    Object.keys(description.callMenu),
    (accessPoint, accessPointCB) => {
      this.__authorizeAccessPoint($happn, $origin, accessPoint, (e, authorized) => {
        if (e) return accessPointCB(e);
        if (!authorized) delete description.callMenu[accessPoint];
        accessPointCB();
      });
    },
    e => {
      if (e) return this.__respond($happn, 'call failed', null, e, res);
      this.__respond(
        $happn,
        $happn._mesh.description.name + ' description',
        description.callMenu,
        null,
        res
      );
    }
  );
};

Rest.prototype.__respond = function($happn, message, data, error, res, code) {
  let responseString = '{"message":"' + message + '", "data":{{DATA}}, "error":{{ERROR}}}';

  const header = {
    'Content-Type': 'application/json'
  };

  //doing the replacements to the response string, allows us to stringify errors without issues.
  if (error) {
    const stringifiedError = utilities.stringifyError(error);
    if (!code) code = 500;
    responseString = responseString.replace('{{ERROR}}', stringifiedError);
    $happn.log.error(`rpc request failure: ${error.message ? error.message : stringifiedError}`);
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
  const name = $happn._mesh.config.domain || $happn._mesh.config.name;

  accessPoint = utilities.removeLeading('/', accessPoint);
  accessPoint = '/_exchange/requests/' + name + '/' + accessPoint;

  this.__securityService.authorize($origin, accessPoint, 'set', function(e, authorized, reason) {
    callback(e, authorized, reason);
  });
};

Rest.prototype.__authorize = function(res, $happn, $origin, uri, successful) {
  if (!$happn._mesh.config.happn.secure) {
    return successful();
  }

  if (!$origin) {
    return this.__respond(
      $happn,
      'Bad origin',
      null,
      new Error('origin of call unknown'),
      res,
      403
    );
  }

  this.__authorizeAccessPoint($happn, $origin, uri, (e, authorized, reason) => {
    if (e) return this.__respond($happn, 'Authorization failed', null, e, res, 403);
    if (!authorized) {
      if (!reason) reason = 'Authorization failed';
      return this.__respond($happn, reason, null, new Error('Access denied'), res, 403);
    }
    successful();
  });
};

Rest.prototype.__parseBody = function(req, res, $happn, callback) {
  try {
    if (req.method === 'GET') {
      if (req.uri.query && req.uri.query.encoded_parameters)
        return callback(JSON.parse(decodeURIComponent(req.uri.query.encoded_parameters)));
      return callback({ parameters: req.uri.query });
    }
    if (req.body) return callback(req.body);
    this.jsonBody(req, res, (e, body) => {
      if (e) return this.__respond($happn, 'Failure parsing request body', null, e, res, 400);
      callback(body);
    });
  } catch (e) {
    return this.__respond($happn, 'Failure parsing request body', null, e, res, 400);
  }
};

Rest.prototype.__processRequest = function(req, res, body, callPath, $happn, $origin) {
  return () => {
    let mesh = $happn.exchange;
    let component;
    let method;
    let meshDescription;
    let componentDescription;
    let methodDescription;

    let methodName = callPath.pop();
    let componentName = callPath.pop();
    let meshName = callPath.pop();

    if (componentName === 'security') {
      return this.__respond(
        $happn,
        'Access denied',
        null,
        new Error('attempt to access security component over rest'),
        res,
        403
      );
    }

    if (meshName != null && meshName !== 'method') {
      if (meshName !== $happn._mesh.config.name) {
        return this.__respond(
          $happn,
          'Access denied',
          null,
          new Error('attempt to access remote mesh: ' + meshName),
          res,
          403
        );
      }
      mesh = $happn.exchange[meshName];
    }
    meshDescription = this.__exchangeDescription;

    if (!mesh[componentName]) {
      return this.__respond(
        $happn,
        'Failure parsing request body',
        null,
        new Error('component ' + componentName + ' does not exist on mesh'),
        res,
        404
      );
    }

    component = mesh[componentName];

    if (!component[methodName]) {
      return this.__respond(
        $happn,
        'Failure parsing request body',
        null,
        new Error(`method ${methodName} does not exist on component ${componentName}`),
        res,
        404
      );
    }

    method = component[methodName];

    componentDescription = meshDescription.components[componentName];
    methodDescription = componentDescription.methods[methodName];

    const args = this.__mapMethodArguments(req, res, methodDescription, body, $happn, $origin); //[];

    method.apply(method, args);
  };
};

Rest.prototype.__mapMethodArguments = function(req, res, methodDescription, body, $happn, $origin) {
  const __callback = (e, response) => {
    if (e) return this.__respond($happn, 'Call failed', null, e, res, 500);
    this.__respond($happn, 'Call successful', response, null, res);
  };

  let callbackFound = false;
  if (!body.parameters) body.parameters = {};

  const args = methodDescription.parameters.map(parameter => {
    if (parameter.name === 'callback') {
      callbackFound = true;
      return __callback;
    }

    if (parameter.name === '$restParams') {
      if (!body.parameters) return {};
      return _.omit(body.parameters, ['happn_token', 'username', 'password']);
    }

    if (parameter.name === '$userSession') {
      return $origin;
    }

    if (parameter.name.indexOf('$req_') === 0) {
      let key = parameter.name.split('$req_').pop();
      return req[key];
    }

    if (body.parameters[parameter.name] == null) {
      return null;
    }

    return body.parameters[parameter.name];
  });

  //add the callback handler
  if (!callbackFound) args.push(__callback);
  return args;
};

// attached to the mesh middleware, takes in the request body and attempts to execute an exchange method based on the request parameters
Rest.prototype.handleRequest = function(req, res, $happn, $origin) {
  try {
    const methodURI = utilities.removeLeading('/', utilities.getRelativePath(req.url));
    this.__parseBody(req, res, $happn, body => {
      this.__authorize(res, $happn, $origin, '/' + methodURI, () => {
        const callPath = methodURI.split('/');
        //ensure we don't have a leading /
        if (callPath.length > 4) {
          return this.__respond(
            $happn,
            'Failure parsing request body',
            null,
            new Error('call path cannot have more than 4 segments'),
            res
          );
        }

        process.nextTick(this.__processRequestBound(req, res, body, callPath, $happn, $origin));
      });
    });
  } catch (e) {
    return this.__respond($happn, 'Call failed', null, e, res, 500);
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
      if (
        componentName === 'rest' &&
        !['describe', 'handleRequest', 'login'].includes(methodName)
      ) {
        continue;
      }
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

Rest.prototype.__updateDescription = function(description, $happn) {
  const cleanedDescription = _.omit(description, ['initializing', 'setOptions', '_meta']);
  this.__exchangeDescription = cleanedDescription;
  this.__exchangeDescription.callMenu = this.__buildCallMenu(cleanedDescription);
  $happn.log.info(`updated mesh description`);
};

Rest.prototype.start = function($happn, callback) {
  this.__updateDescription($happn._mesh.description, $happn);
  callback();
};

Rest.prototype.initialize = function($happn, callback) {
  this.__securityService = $happn._mesh.happn.server.services.security;
  if (!this.attachedToMeshEvents) {
    $happn._mesh.on('description-updated', description => {
      $happn.log.info(`description-updated event`);
      this.__updateDescription(description, $happn);
    });
    this.attachedToMeshEvents = true;
  }
  this.__updateDescription($happn._mesh.description, $happn);
  callback();
};
