var Mesh = require('../../lib/mesh');

var path = require('path');

var config = require(path.join(__dirname, 'b2-first-mesh-config'));

Mesh.create(config, function (err) {

  if (err) {

    console.log(err);
    process.exit(err.code || 1);
    return;
  }

  console.log('READY');

});
