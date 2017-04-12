var Mesh = require('../../lib/mesh'),
  async = require('async')
  ;

var ADMIN_PASSWORD = 'ADMIN_PASSWORD';

var config = {
  name: 'remoteMesh',
  happn: {
    port: 10001,
    authTokenSecret: 'a256a2fd43bf441483c5177fc85fd9d3',
    systemSecret: 'mesh',
    secure: true,
    adminPassword: ADMIN_PASSWORD
  },
  endpoints: {},
  modules: {
    "remoteComponent": {
      path: __dirname + "/e3-remote-component"
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

var connectCount = 0;
var unconnected = true;
var lastError;

async.whilst(function(){ return connectCount < 5 && unconnected;}, function(whileCB){

  connectCount++;

  Mesh.create(config)
    .then(function () {
      unconnected = false;
      console.log('READY');
      whileCB();
    })
    .catch(function (err) {
      lastError = err;
      setTimeout(whileCB, 2000);
    });

}, function(e){

  if (unconnected) {
    if (lastError) console.warn('Error starting remote:::', lastError.toString());
    process.exit(1);
  }
});
