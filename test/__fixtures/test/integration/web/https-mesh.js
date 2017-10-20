var Mesh = require('../../../../..');

var config = {
  name: 'https_mesh',
  happn: {
    transport: {
      mode: 'https'
    },
    port: 3111
  },
  endpoints: {},
  components: {
    data: {}
  }
};

Mesh.create(config, function (err) {

  if (err) {
    console.log(err);
    process.exit(err.code || 1);
    return;
  }

  console.log('READY');

});
