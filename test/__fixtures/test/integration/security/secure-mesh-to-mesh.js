var Mesh = require('../../../../..');

var path = require('path');

var config = require(path.join(__dirname, 'secure-mesh-to-mesh-config'));

Mesh.create(config, function (err) {

  if (err) {

    console.log(err);
    process.exit(err.code || 1);
    return;
  }

  console.log('READY');

});
