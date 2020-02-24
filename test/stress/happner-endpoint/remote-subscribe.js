var assert = require('assert');

// helper function that creates a remote subscription
// and the matching local subscription

module.exports = function remoteSubscribe(options, handler, callback) {
  assert.equal(arguments.length, 3, '3 arguments required');
  assert.equal(typeof callback, 'function', 'callback must be a function');
  try {
    checkArguments(options, handler, callback);
  } catch (err) {
    return setImmediate(callback, err);
  }
  var endpointExchange = options.mesh.exchange[options.happnerEndpointName];
  var endpointEvent = options.mesh.event[options.happnerEndpointName];
  var onRemote = endpointExchange.onRemote;
  onRemote(options, function(err) {
    if (err) return setImmediate(callback, err);
    var relayedEvent = options.component + '/' + options.event;
    endpointEvent.on(relayedEvent, handler, callback);
  });
};

function checkArguments(options, handler, callback) {
  assert.equal(typeof options, 'object', 'options must be an object');
  assert.equal(typeof options.mesh, 'object', 'options.mesh must be an object');
  assert.equal(
    typeof options.happnerEndpointName,
    'string',
    'options.happnerEndpointName must be a string'
  );
  var endpointExchange = options.mesh.exchange[options.happnerEndpointName];
  assert.equal(typeof endpointExchange, 'object', 'happnerEndpointName exchange not found');
  assert.equal(
    typeof endpointExchange.onRemote,
    'function',
    'happnerEndpointName exchange component not valid'
  );
  var endpointEvent = options.mesh.event[options.happnerEndpointName];
  assert.equal(typeof endpointEvent, 'object', 'happnerEndpointName event not found');
  assert.equal(
    typeof endpointEvent.on,
    'function',
    'happnerEndpointName event component not valid'
  );
  assert.equal(typeof options.component, 'string', 'options.component must be a string');
  assert.equal(typeof options.event, 'string', 'options.event must be a string');
  assert.equal(typeof handler, 'function', 'handler must be a function');
  assert.equal(typeof callback, 'function', 'callback must be a function');
}
