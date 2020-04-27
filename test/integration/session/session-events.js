const tests = require('../../__fixtures/utils/test_helper').create();

describe(tests.testName(__filename, 3), function() {
  var Happner = require('../../..');
  var socketClientSessionId;
  this.timeout(10000);

  var sessionEventsTest = function(serviceConfig, callback) {
    if (typeof serviceConfig === 'function') {
      callback = serviceConfig;
      serviceConfig = {};
    }
    var eventsFired = {};
    var serviceInstance;
    var stopped = false;

    var checkAllEventsFired = function(callback) {
      tests.expect(eventsFired['session-configured-socket'].id).to.be(socketClientSessionId);
      tests.expect(eventsFired['authentic-socket'].id).to.be(socketClientSessionId);
      tests.expect(eventsFired['disconnect-socket'].id).to.be(socketClientSessionId);
      tests.expect(JSON.stringify(eventsFired, null, 2).indexOf('token":')).to.be(-1);
      tests.expect(JSON.stringify(eventsFired, null, 2).indexOf('password')).to.be(-1);
      tests.expect(JSON.stringify(eventsFired, null, 2).indexOf('privateKey')).to.be(-1);
      tests.expect(JSON.stringify(eventsFired, null, 2).indexOf('keyPair')).to.be(-1);
      tests.expect(JSON.stringify(eventsFired, null, 2).indexOf('secret')).to.be(-1);

      if (stopped) return callback();
      stopped = true;
      return serviceInstance.stop(
        {
          reconnect: false
        },
        callback
      );
    };

    Happner.create(serviceConfig, (e, happnInst) => {
      if (e) return callback(e);

      serviceInstance = happnInst;

      serviceInstance._mesh.happn.server.services.session.on('authentic', function(data) {
        eventsFired['authentic-socket'] = data;
      });

      serviceInstance._mesh.happn.server.services.session.on('disconnect', function(data) {
        eventsFired['disconnect-socket'] = data;
      });

      serviceInstance._mesh.happn.server.services.session.on('session-configured', function(data) {
        eventsFired['session-configured-socket'] = data;
      });

      const socketClient = new Happner.MeshClient({
        secure: true
      });

      socketClient.login({ username: '_ADMIN', password: 'happn' }, e => {
        if (e) return callback(e);
        socketClientSessionId = socketClient.data.session.id;
        socketClient.disconnect(() => {
          setTimeout(() => {
            checkAllEventsFired(callback);
          }, 2000);
        });
      });
    });
  };

  it('tests session events on a secure mesh', function(callback) {
    sessionEventsTest(
      {
        secure: true
      },
      callback
    );
  });
});
