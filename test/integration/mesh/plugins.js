var expect = require('expect.js');

describe(require('../../__fixtures/utils/test_helper').create().testName(__filename, 3), function () {

  var Happner = require('../../..');

  var server, stoppedServer;

  after(function (done) {

    this.timeout(10000);

    if (!server) return done();
    server.stop({reconnect: false}, done);
  });


  it('allows for modification of mesh just before start and after stop', function (done) {

    this.timeout(10000);

    Happner.create({

      plugins: [
        // plugin 1 (only start)
        function(mesh, logger) {
          return {
            start: function (callback) {
              mesh.xxx = 1;
              callback();
            }
          };
        },
        // plugin 2 (start and stop)
        function(mesh, logger) {
          return {
            start: function (callback) {
              logger.info('STARTING PLUGIN');
              mesh.yyy = 1;
              callback();
            },
            stop: function (callback) {
              logger.info('STOPPING PLUGIN');
              mesh.yyy = 0;
              callback();
            }
          };
        },
        // plugin 3 (only stop)
        function(mesh, logger) {
          return {
            stop: function (callback) {
              mesh.zzz = 0;
              callback();
            }
          };
        },

        // plugin 4 (pointless: not start or stop)
        function(mesh, logger) {
          return {
          };
        },

        // plugin 5 (pointless: no object returned)
        function(mesh, logger) {
        }

      ]
    })

      .then(function (_server) {
        server = _server;

        expect(server.xxx).to.be(1);
        expect(server.yyy).to.be(1);
      })

      .then(function () {
        return server.stop({reconnect: false});
      })

      .then(function () {
        stoppedServer = server;
        server = undefined;
      })

      .then(function () {
        expect(stoppedServer.yyy).to.be(0);
      })

      .then(done)
      .catch(done);

  });

  it('we load a plugin that breaks the startup cycle of the server, we insure that the happn.server is stopped', function (done) {

    this.timeout(10000);

    Happner.create({
      plugins: [
        // plugin 1 (only start)
        function(mesh, logger) {
          return {
            start: function (callback) {
              callback(new Error('test serror'));
            }
          };
        }
      ]
    }, function(e, mesh){
      expect(mesh.initializedServer).to.be(false);
      done();
    });
  });

  it('we load a plugin that does not break the startup cycle of the server, we insure that the initializedServer property is true', function (done) {

    this.timeout(10000);

    Happner.create({
      plugins: [
        // plugin 1 (only start)
        function(mesh, logger) {
          return {
            start: function (callback) {
              callback();
            }
          };
        }
      ]
    }, function(e, mesh){
      expect(mesh.initializedServer).to.be(true);
      done();
    });
  });
});
