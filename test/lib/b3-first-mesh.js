var Mesh = require('../../lib/mesh');

var config = {
  name: 'theFarawayTree',
  happn: {
    secure: true,
    port: 51231,
    adminPassword: 'testb2'
  },
  endpoints: {},
  modules: {
    "remoteComponent": {
      path: __dirname + "/4-remote-component",
      constructor: {
        type: "sync",
        parameters: []
      }
    }
  },
  components: {
    "remoteComponent": {
      moduleName: "remoteComponent",
      schema: {
        "exclusive": false,
        "methods": {
          "remoteFunction": {
            parameters: [
              {name: 'one', required: true},
              {name: 'two', required: true},
              {name: 'three', required: true},
              {name: 'callback', type: 'callback', required: true}
            ]
          }
          ,
          "causeError": {
            parameters: [
              {name: 'callback', type: 'callback', required: true}
            ]
          }
        }
      }
    }
  }
};

Mesh.create(config, function (err) {

  if (err) {

    console.log('spawn failed:::', err);

    console.log(err);
    process.exit(err.code || 1);
    return;
  }

  console.log('READY');

});
