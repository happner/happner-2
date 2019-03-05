describe(require('../../__fixtures/utils/test_helper').create().testName(__filename, 3), function () {

  this.timeout(120000);

  var expect = require('expect.js');
  require('chai').should();

  var Mesh = require('../../..');
  var mesh = new Mesh();

  var adminClient = new Mesh.MeshClient({secure: true, port: 8004});
  var testClient = new Mesh.MeshClient({secure: true, port: 8004});

  var test_id = Date.now() + '_' + require('shortid').generate();
  var async = require('async');

  const log = require('why-is-node-running');

  before(function (done) {

    mesh.initialize({

      name: 'session-changes-events',

      happn: {
        secure: true,
        adminPassword: test_id,
        port: 8004
      }
    }, function (err) {

      if (err) return done(err);

      mesh.start(function (err) {

        if (err) return done(err);

        var credentials = {
          username: '_ADMIN', // pending
          password: test_id
        };

        adminClient.login(credentials).then(done).catch(done);

      });
    });
  });

  after(function (done) {
    this.timeout(20000);

    adminClient.event.security.offPath('connect');
    adminClient.event.security.offPath('disconnect');

    setTimeout(function(){
      mesh.stop({reconnect: false}, () => {
        setTimeout(() => {
          //log();
          done();
        }, 11000);
      });
    }, 2000);
  });

  var eventsToFire = {
    'connect': false,
    'disconnect': false
  };

  it('tests the connect and disconnect events, by logging on and off with the test client', function (done) {

    var fireEvent = function (key) {

      eventsToFire[key] = true;

      for (var eventKey in eventsToFire)
        if (eventsToFire[eventKey] == false)
          return;

      done();
    };

    var testUser = {
      username: 'TESTUSER1' + test_id,
      password: 'TEST PWD',
      custom_data: {
        something: 'useful'
      }
    };

    adminClient.exchange.security.addUser(testUser, function (e, result) {

      if (e) return done(e);

      adminClient.exchange.security.attachToSessionChanges(function (e) {

        if (e) return callback(e);

        adminClient.event.security.on('connect', function (data) {
          fireEvent('connect');
        });

        adminClient.event.security.on('disconnect', function (data) {
          fireEvent('disconnect');
        });

        var credentials = {
          username: 'TESTUSER1' + test_id, // pending
          password: 'TEST PWD'
        };

        testClient.login(credentials).then(function () {

          testClient.disconnect();

        }).catch(done);

      });
    });
  });
});
