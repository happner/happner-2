var Mesh = require('../../../../..');

var config = {
  name: 'remoteMesh',
  happn: {
    port: 3001,
    secure: true,
    services:{
      security:{
        config:{
          adminUser: {
            password:"guessme"
          }
        }
      }
    }
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
          },
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
    console.log(err);
    process.exit(err.code || 1);
    return;
  }

  console.log('READY');

});
