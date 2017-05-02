var Mesh2 = require('../../..');

var config = {
  name: 'test_c6',
  happn: {
    transport: {
      mode: 'https'
    },
    port: 3111,
  },
  endpoints: {},
  components: {
    data: {}
  }
};

(new Mesh2()).initialize(config, function (err) {

  if (err) {
    console.log(err);
    process.exit(err.code || 1);
    return;
  }

  console.log('READY');

});
