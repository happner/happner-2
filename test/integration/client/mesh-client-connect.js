var log = require('why-is-node-running');
const should = require('chai').should();

/*
Listner not been cleaned up.

# Timeout
/home/craig/git/happner-2/node_modules/ws/lib/event-target.js:128 - listener.call(this, new ErrorEvent(error, this));
/home/craig/git/happner-2/node_modules/ws/lib/websocket.js:554    - this.emit('error', err);

 */

describe('mesh-client-connect.js', function() {
  after('check open handles', function(){
    setTimeout(log, 2000);
  });

  var Mesh = require('../../..');
  it('mesh client does not exit cleanly if login fails', function(done) {
    let meshClient = new Mesh.MeshClient({ port: 1 });
    meshClient.login({}, err => {
      err.message.should.eql('connect ECONNREFUSED 127.0.0.1:1');
      meshClient.disconnect(done);
    });
  });
});
