var Mesh = require('../../..');

var configDifferentPortRedirect = {
  name: "startupProxiedDifferentPort",
  port: 55002,
  startupProxy: {
    enabled: true,
    redirect: "/ping"
  }
};

console.log('STARTING MESH:::');

Mesh.create(configDifferentPortRedirect, function (e, created) {
    if (e) return console.log('ERROR HAPPENED:::', e);

    console.log('STARTED:::');
});
