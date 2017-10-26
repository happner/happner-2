describe(require('path').basename(__filename), function () {

  this.timeout(120000);

  var expect = require('expect.js');
  require('chai').should();

  var Mesh = require('../../..');
  var mesh = new Mesh();

  var adminClient = new Mesh.MeshClient({secure: true, port: 8004});

  var test_id = Date.now() + '_' + require('shortid').generate();
  var async = require('async');

  before(function (done) {

    mesh.initialize({
      name: 'connection-changes-events',
      happn: {
        secure: true,
        adminPassword: test_id,
        port: 8004
      }
    }, function (err) {
      if (err) return done(err);
      mesh.start(function (err) {
        if (err) {
          return done(err);
        }

        var credentials = {
          username: '_ADMIN', // pending
          password: test_id
        };

        adminClient.login(credentials).then(function () {
          done();
        }).catch(done);

      });
    });
  });

  var eventsToFire = {
    'reconnect/scheduled': false,
    'reconnect/successful': false
  };

  var eventsFired = false;

  it('tests the reconnection events', function (done) {

    var fireEvent = function (key) {

      if (eventsFired) return;

      eventsToFire[key] = true;

      for (var eventKey in eventsToFire)
        if (eventsToFire[eventKey] == false)
          return;

      eventsFired = true;

      done();
    };

    adminClient.on('reconnect/scheduled', function (evt, data) {
      //TODO some expect code

      fireEvent('reconnect/scheduled');
    });

    adminClient.on('reconnect/successful', function (evt, data) {
      //TODO some expect code
      fireEvent('reconnect/successful');
    });

    for (var key in mesh._mesh.happn.server.connections) mesh._mesh.happn.server.connections[key].destroy();

  });

  var endedConnections = {};

  var endedConnectionDone = false;

  it('tests the connection end event', function (done) {

    adminClient.on('connection/ended', function (evt) {

      if (endedConnections[evt]) return done(new Error('connection ended called twice for same session'));

      if (!endedConnectionDone){
        endedConnectionDone = true;
        //TODO some expect stuff
        done();
      }
    });

    mesh.stop({reconnect: false}, function (e) {
      if (e) return done(e);
    });

  });

  //require('benchmarket').stop();

});
