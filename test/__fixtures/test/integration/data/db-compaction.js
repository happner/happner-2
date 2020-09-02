var Happner = require('../../../../..');
var path = require('path');

Happner.create({
  name: 'MESH_NAME',
  happn: {
    filename: path.join(__dirname, 'test.nedb'),
    defaultRoute: "mem",
    //compactInterval: 5000
  }
})
.then(function (server) {
  // stop the mesh after 2 seconds.
  // The process should exit but it currently does not.
  setTimeout(function () {
    server.stop({reconnect: false}, function (err) {
      if (err) console.error(err);
    });
  }, 2000);
})
.catch(function (err) {
  console.log('COMPACTION FAILURE:::', err);
  console.log('COMPACTION FAILURE STACK:::', err.stack);
  console.error(err);
});
