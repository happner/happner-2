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

    var checkSocketEventStructure = function(eventData, protocol, username) {
      tests.expect(eventData.id).to.be(socketClientSessionId);
      tests.expect(eventData.legacyPing).to.be(false);
      tests.expect(Number.isInteger(eventData.msgCount)).to.be(true);
      tests.expect(eventData.isEncrypted).to.be(false);
      tests.expect(eventData.protocol).to.be(protocol || `happn_${tests.happnPackage.protocol}`);
      tests.expect(eventData.tlsEncrypted).to.be(false);
      tests.expect(eventData.browser).to.be(false);
      tests.expect(eventData.intraProc).to.be(false);
      tests.expect(eventData.sourceAddress).to.be('127.0.0.1');
      tests.expect(eventData.sourcePort > 0).to.be(true);
      tests.expect(eventData.upgradeUrl != null).to.be(true);
      if (username) tests.expect(eventData.user.username).to.be(username);
    };

    var checkAllEventsFired = function(callback) {
      return () => {
        checkSocketEventStructure(eventsFired['connect-socket'], 'happn');
        checkSocketEventStructure(eventsFired['session-configured-socket']);

        if (serviceConfig.secure)
          checkSocketEventStructure(eventsFired['authentic-socket'], null, '_ADMIN');
        else checkSocketEventStructure(eventsFired['authentic-socket']);

        if (serviceConfig.secure)
          checkSocketEventStructure(eventsFired['disconnect-socket'], null, '_ADMIN');
        else checkSocketEventStructure(eventsFired['disconnect-socket']);

        tests.expect(JSON.stringify(eventsFired, null, 2).indexOf('token":')).to.be(-1);
        tests.expect(JSON.stringify(eventsFired, null, 2).indexOf('password')).to.be(-1);
        tests.expect(JSON.stringify(eventsFired, null, 2).indexOf('privateKey')).to.be(-1);
        tests.expect(JSON.stringify(eventsFired, null, 2).indexOf('keyPair')).to.be(-1);
        tests.expect(JSON.stringify(eventsFired, null, 2).indexOf('secret')).to.be(-1);

        if (stopped) return callback();
        stopped = true;
        return serviceInstance.stop(callback);
      };
    };

    Happner.create(serviceConfig, (e, happnInst) => {
      if (e) return callback(e);

      serviceInstance = happnInst;

      serviceInstance._mesh.happn.server.services.session.on('connect', function(data) {
        eventsFired['connect-socket'] = data;
      });

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
          setTimeout(checkAllEventsFired(callback), 2000);
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
