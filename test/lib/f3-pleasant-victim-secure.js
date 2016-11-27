var Mesh = require('../../lib/mesh');

var config = {
  name: 'remoteMesh',
  secure:true,
  happn: {
    port: 11111,
    adminPassword: 'happn'
  },
  endpoints: {},
  modules: {
    "f3-pleasant-victim-component": {
      path: __dirname + "/f3-pleasant-victim-component",
      constructor: {
        type: "sync",
        parameters: []
      }
    }
  },
  components: {
    "remoteComponent": {
      moduleName: "f3-pleasant-victim-component",
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

(new Mesh()).initialize(config, function (err) {

  if (err) {
    console.log(err);
    process.exit(err.code || 1);
    return;
  }

  console.log('READY');

});
