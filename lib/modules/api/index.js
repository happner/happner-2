module.exports = Api;

function Api() {}

Api.prototype.start = function($happn, callback) {
  this.domain = $happn._mesh.config.domain || $happn._mesh.config.name;
  this.__componentAndMethodCache = {};
  this.__attachAllExchangeRequests($happn).then(callback);
};

Api.prototype.stop = function($happn, callback) {
  this.__componentAndMethodCache = {};
  this.__detachAllExchangeRequests($happn)
    .then(callback)
    .catch(e => {
      $happn.log.warn(`error detaching api component: ${e.message}`);
      callback();
    });
};

Api.prototype.__componentExists = function($happn, component, method) {
  const possibleEndpointPaths = [
    `/${$happn._mesh.config.name}/${component}/${method}`,
    `/${$happn._mesh.config.domain}/${component}/${method}`,
    `/${component}/${method}`
  ];
  if (
    $happn._mesh.exchange[possibleEndpointPaths[0]] ||
    $happn._mesh.exchange[possibleEndpointPaths[1]] ||
    $happn._mesh.exchange[possibleEndpointPaths[2]]
  ) {
    //we found the whole endpoint - return true
    return true;
  }
  // endpoint does not exist, we check for a component match
  // (a missing method will be handled on the component-instance)

  // first create the component paths, so we dont do splits slices and joins
  // for every endpoint key we are examining
  const possibleComponentPaths = possibleEndpointPaths.map(endpointPath => {
    return `/${endpointPath
      .split('/')
      .slice(1, 3)
      .join('/')}`;
  });
  return (
    Object.keys($happn._mesh.exchange).find(endpointPath => {
      return possibleComponentPaths.find(possibleComponentPath => {
        return endpointPath.indexOf(possibleComponentPath) === 0;
      });
    }) != null
  );
};

Api.prototype.getComponentAndMethodFromPath = function(path) {
  //cached so we avoid splitting and slicing with every request
  if (!this.__componentAndMethodCache[path]) {
    const segments = path.split('/');
    this.__componentAndMethodCache[path] = segments.slice(segments.length - 2);
  }
  return this.__componentAndMethodCache[path];
};

Api.prototype.__attachAllExchangeRequests = async function($happn) {
  this.exchangeRequestsEventId = await $happn._mesh.data.on(
    `/_exchange/requests/**`,
    (data, meta) => {
      const componentAndMethod = this.getComponentAndMethodFromPath(meta.path);
      if (!this.__componentExists($happn, componentAndMethod[0], componentAndMethod[1])) {
        $happn._mesh.data.publish(
          data.callbackAddress,
          {
            args: [
              {
                name: 'bad endpoint',
                message: `Call to unconfigured component: [${componentAndMethod.join('.')}]`
              }
            ]
          },
          e => {
            let message = `unable to respond on unconfigured component: [${componentAndMethod.join(
              '.'
            )}]`;
            if (meta.eventOrigin) {
              message += `, origin session: ${meta.eventOrigin.id}`;
              if (meta.eventOrigin.username)
                message += `, origin user: ${meta.eventOrigin.username}`;
            }
            if (e) $happn.log.warn(message);
          }
        );
      }
    }
  );
};

Api.prototype.__detachAllExchangeRequests = async function($happn) {
  if (this.exchangeRequestsEventId != null)
    await $happn._mesh.data.off(this.exchangeRequestsEventId);
};

Api.prototype.test = function(message, done) {
  done(null, message + ' tested ok');
};

Api.prototype.client = function($happn, req, res) {
  /* serves: /api/client (script) */

  var script = $happn.tools.packages.api;

  if (req.headers['if-none-match'] === script.md5) {
    $happn.log.$$TRACE('client already has latest version ' + req.url);
    res.statusCode = 304; // <---- 304 Not Modified (RFC 7232)
    return res.end(); // <---- send nothing.
  }

  var header = {
    'Content-Type': 'text/javascript',
    'Cache-Control': 'max-age=0', // <---- client should always check
    ETag: script.md5 // <---- etag (see 'if-none-match')
  };

  if (script.gzip) {
    header['Content-Encoding'] = 'gzip'; // <---- script.data is gzipped
  }

  res.writeHead(200, header);
  $happn.log.$$TRACE('sending latest version ' + req.url);
  res.end(script.data);
};
