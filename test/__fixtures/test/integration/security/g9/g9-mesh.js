var Mesh = require('../../lib/mesh');

var config = require('./g9-config');

(new Mesh()).initialize(config, function (err) {

  if (err) {

    console.log(err);
    process.exit(err.code || 1);
    return;
  }

  console.log('READY');
});
