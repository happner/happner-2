var Mesh = require('../../../../..');

var config = require('./secure-mesh-to-mesh-single-process-config');

(new Mesh()).initialize(config, function (err) {

  if (err) {

    console.log(err);
    process.exit(err.code || 1);
    return;
  }

  console.log('READY');
});
