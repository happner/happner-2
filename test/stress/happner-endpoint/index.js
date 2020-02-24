const happner = require('../../../lib/mesh');
const assert = require('assert');
const _ = require('lodash');
const async = require('async');
const remoteSubscribe = require('./remote-subscribe');
const remoteUnsubscribe = require('./remote-unsubscribe');
const dns = require('dns');
const isIp = require('is-ip');
const address = require('address');

module.exports = function create() {
  return new HappnerEndpoint();
};

function HappnerEndpoint() {}

HappnerEndpoint.prototype.init = function start($happn, cb) {
  const _this = this;
  $happn.options = {
    host: '127.0.0.1',
    port: 55000,
    username: '_ADMIN',
    password: 'happn',
    endpointName: 'localComponent'
  };
  $happn.pendingSubs = [];
  $happn.allSubs = [];
  $happn.remoteHandles = [];
  $happn.connected = false;
  $happn.loggedOn = false;
  $happn.disconnectListener = function disconnectListener() {
    $happn.connected = false;
    $happn.log.info('happner-endpoint reconnect/scheduled');
    $happn.emit('client/disconnect');
  };
  $happn.reconnectListener = function reconnectListener() {
    $happn.connected = true;
    $happn.log.info('happner-endpoint reconnect/successful');
    $happn.emit('client/reconnect');
    _this.doPendingSubs($happn, function(err) {
      if (err) $happn.log.error('error creating pending subscriptions: ', err.message);
    });
  };
  cb();
};

HappnerEndpoint.prototype.shutdown = function stop($happn, cb) {
  this.disconnect($happn, cb);
};

HappnerEndpoint.prototype.remoteSubscribe = function _remoteSubscribe(
  options,
  handler,
  $happn,
  callback
) {
  options.mesh = $happn;
  options.happnerEndpointName = $happn.name;
  remoteSubscribe(options, handler, callback);
};

HappnerEndpoint.prototype.remoteUnsubscribe = function _remoteUnsubscribe(
  options,
  $happn,
  callback
) {
  options.mesh = $happn;
  options.happnerEndpointName = $happn.name;
  remoteUnsubscribe(options, callback);
};

HappnerEndpoint.prototype.getStatus = function getStatus($happn, cb) {
  const status = {
    created: typeof $happn.meshClient !== 'undefined',
    connected: $happn.connected,
    loggedOn: $happn.loggedOn
  };
  cb(null, status);
};

HappnerEndpoint.prototype.connect = function connect($happn, options, callback) {
  const _this = this;
  if (arguments.length !== 3) throw new Error('missing parameter');
  if (
    $happn.connected &&
    options.host === $happn.options.host &&
    options.port === $happn.options.port &&
    options.username === $happn.options.username
  ) {
    $happn.log.info("happner-endpoint already connected as '" + $happn.options.username + "'");
    return callback(null, { status: 'already connected' });
  }
  async.series(
    [
      cb => {
        _this.disconnect($happn, cb);
      },
      cb => {
        $happn.options = _.defaultsDeep({}, options, $happn.options);
        cb();
      },
      cb => {
        lookupServerAddress($happn, cb);
      },
      cb => {
        createMeshClientAndConnect.apply(_this, [$happn, cb]);
      },
      cb => {
        // connecting afresh, need to create/renew all subscriptions
        $happn.pendingSubs = $happn.pendingSubs.concat($happn.allSubs);
        $happn.allSubs = [];
        _this.doPendingSubs($happn, cb);
      }
    ],
    err => {
      callback(err);
    }
  );
};

HappnerEndpoint.prototype.doPendingSubs = function doPendingSubs($happn, cb) {
  async.each(
    $happn.pendingSubs,
    function doSub(options, cb) {
      doSubscribe($happn, options, function(err) {
        // log but tolerate failed subscriptions
        if (err) {
          $happn.log.error(
            'Could not subscribe to ' +
              options.component +
              '/' +
              options.event +
              ' (' +
              err.message +
              '), will retry on next connect.'
          );
          return cb();
        }
        $happn.log.info('Subscribed to ' + options.component + '/' + options.event);
        $happn.pendingSubs.splice($happn.pendingSubs.indexOf(options), 1);
        cb();
      });
    },
    cb
  );
};

HappnerEndpoint.prototype.disconnect = function disconnect($happn, cb) {
  if (!$happn.meshClient) return cb();
  $happn.connected = false;
  $happn.loggedOn = false;
  $happn.emit('logged-off');
  $happn.meshClient.removeListener('reconnect/scheduled', $happn.disconnectListener);
  $happn.meshClient.removeListener('reconnect/successful', $happn.reconnectListener);
  $happn.meshClient.disconnect(function(err) {
    if (err) return $happn.log.error(err);
    $happn.log.info('Mesh client disconnect');
  });
  $happn.meshClient = undefined;
  // At this point it is safe to reconnect.
  cb();
};

function lookupServerAddress($happn, cb) {
  if ($happn.options.host === 'localhost' || isIp($happn.options.host)) return cb();
  address.dns((err, dnsServers) => {
    if (err) {
      $happn.log.warn(`Could not read resolv.conf file: ${err.message}`);
      return cb(err);
    }
    dns.setServers(dnsServers);
    dns.resolve($happn.options.host, err => {
      if (err) {
        $happn.log.warn(`Resolve of ${$happn.options.host} failed: ${err.message}`);
      }
      cb(err);
    });
  });
}

function createMeshClientAndConnect($happn, cb) {
  let _this = this;
  $happn.meshClient = new happner.MeshClient($happn.options);
  $happn.meshClient.login($happn.options, function(err) {
    if (err) {
      $happn.log.warn('happner-endpoint login failed: ' + err.message);
      return cb(err);
    }
    if (!$happn.meshClient) {
      const e = new Error('happner-endpoint disconnect() called before login completed');
      return cb(e);
    }
    if (typeof $happn.meshClient.exchange[$happn.options.endpointName] !== 'object') {
      return _this.disconnect($happn, function(err) {
        cb(err || new Error('could not find remote server "' + $happn.options.endpointName + '"'));
      });
    }
    $happn.log.info('Login succeeded as ' + $happn.options.username);
    $happn.connected = true;
    $happn.loggedOn = true;
    $happn.emit('logged-on');
    $happn.meshClient.removeListener('reconnect/scheduled', $happn.disconnectListener);
    $happn.meshClient.removeListener('reconnect/successful', $happn.reconnectListener);
    $happn.meshClient.on('reconnect/scheduled', $happn.disconnectListener);
    $happn.meshClient.on('reconnect/successful', $happn.reconnectListener);
    cb();
  });
}

HappnerEndpoint.prototype.call = function call($happn, options, cb) {
  try {
    if (!$happn.connected) {
      return cb(new Error('not connected calling ' + options.component + '.' + options.method));
    }
    checkCallOpts(options);
    const remoteServer = $happn.meshClient.exchange[$happn.options.endpointName];
    checkRemoteServerMethod(remoteServer, options);
    const func = remoteServer[options.component][options.method];
    if (Array.isArray(options.params)) {
      options.params.push(cb);
      return func.apply(this, options.params);
    }
    return func(options.params, cb);
  } catch (err) {
    if (cb) return cb(err);
  }
};

function checkCallOpts(options) {
  assert.equal(typeof options, 'object', 'options must be an object');
  assert.equal(typeof options.component, 'string', 'options.component must be a string');
  assert.equal(typeof options.method, 'string', 'options.method must be a string');
  assert.equal(typeof options.params, 'object', 'options.params must be an object');
}

function checkRemoteServerMethod(remoteServer, options) {
  assert.equal(
    typeof remoteServer[options.component],
    'object',
    'server component "' + options.component + '" not found'
  );
  assert.equal(
    typeof remoteServer[options.component][options.method],
    'function',
    'server method "' + options.method + '" not found'
  );
}

// causes endpoint to subscribe to remote event
// and re-emit it as endpointName/event
// re-emitted event must be subscribed to separately
// as 'componentName/eventName'
HappnerEndpoint.prototype.onRemote = function onRemote($happn, options, cb) {
  try {
    checkSubscribeOpts(options);
  } catch (err) {
    return cb(err);
  }
  if (isDuplicateSubscription($happn, options)) return cb();
  if (!$happn.connected) {
    $happn.pendingSubs.push(options);
    return cb();
  }
  doSubscribe($happn, options, cb);
};

function doSubscribe($happn, options, cb) {
  let remoteEvents;
  try {
    remoteEvents = $happn.meshClient.event[$happn.options.endpointName];
    checkRemoteEventEmitter(remoteEvents, options);
  } catch (err) {
    return cb(err);
  }
  remoteEvents[options.component].on(
    options.event,
    function onRemoteEvent(data) {
      const remoteEvent = options.component + '/' + options.event;
      $happn.emit(remoteEvent, data);
    },
    function(err, handle) {
      if (err) return cb(err);
      $happn.remoteHandles[options.event] = handle;
      $happn.allSubs.push(options);
      cb();
    }
  );
}

function isDuplicateSubscription($happn, options) {
  // do checks in separate statements for better coverage testing
  if (_.find($happn.pendingSubs, createSubMatcher(options))) return true;
  return !!_.find($happn.allSubs, createSubMatcher(options));
}

function createSubMatcher(options) {
  return function subMatches(sub) {
    return sub.component === options.component && sub.event === options.event;
  };
}

function checkSubscribeOpts(options) {
  assert.equal(typeof options, 'object', 'options must be an object');
  assert.equal(typeof options.component, 'string', 'options.component must be a string');
  assert.equal(typeof options.event, 'string', 'options.event must be a string');
}

function checkRemoteEventEmitter(remoteEmitter, options) {
  assert.equal(
    typeof remoteEmitter[options.component],
    'object',
    'server component "' + options.component + '" not found'
  );
}

// unsubscribes the _sole_ remote subscription to the specified path
HappnerEndpoint.prototype.offRemote = function call($happn, options, cb) {
  if (!$happn.connected) return cb(new Error('not connected'));
  try {
    checkUnsubscribeOpts(options);
    const handle = $happn.remoteHandles[options.event];
    const remoteEvents = $happn.meshClient.event[$happn.options.endpointName];
    checkRemoteEventEmitter(remoteEvents, options);
    if (typeof handle === 'undefined') return cb();
    remoteEvents[options.component].off(handle, function(err) {
      if (err) return cb(err);
      removeSubscription($happn, options);
      cb();
    });
  } catch (err) {
    return cb(err);
  }
};

function checkUnsubscribeOpts(options) {
  assert.equal(typeof options, 'object', 'options must be an object');
  assert.equal(typeof options.component, 'string', 'options.component must be a string');
}

function removeSubscription($happn, options) {
  removeSubscriptionFrom($happn.pendingSubs, options);
  removeSubscriptionFrom($happn.allSubs, options);
}

function removeSubscriptionFrom(subscrArray, options) {
  // need _.findIndex for Node 0.10, else could use Array.findIndex()
  const index = _.findIndex(subscrArray, createSubMatcher(options));
  if (index > -1) subscrArray.splice(index, 1);
}
