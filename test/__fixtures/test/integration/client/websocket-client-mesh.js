var Mesh = require('../../../../..');

var path = require('path');

var config = require(path.join(__dirname, 'websocket-client-mesh-config'));

Mesh.create(config, function (err, instance) {

  if (err) {
    console.log(err);
    return process.exit(err.code || 1);
  }

  console.log('READY');

});
