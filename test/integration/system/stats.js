describe(
  require('../../__fixtures/utils/test_helper')
    .create()
    .testName(__filename, 3),
  function() {
    var Happner = require('../../..');

    require('should');

    var server, gotStats;

    before('start server', function(done) {
      this.timeout(5000);

      Happner.create({
        name: 'MESH_NAME',
        happn: {
          services: {
            stats: {
              config: {
                emit: true,
                interval: 500
              }
            }
          }
        },
        modules: {
          another: {
            instance: {
              start: function($happn, callback) {
                $happn.event.system.on('stats/system', function(stats) {
                  gotStats = stats;
                });
                callback();
              }
            }
          }
        },
        components: {
          another: {
            startMethod: 'start'
          }
        }
      })
        .then(function(_server) {
          server = _server;
          done();
        })
        .catch(done);
    });

    after('stop server', function(done) {
      if (!server) return done();
      server.stop({ reconnect: false }, done);
    });

    it('emits stats', function(done) {
      server.event.system.on('stats/system', function(stats) {
        stats.errorsPerSec.should.equal(0);
        done();
        done = function() {}; // event is emitted repeatedly, only call done once
      });
    });

    it('can get stats', function(done) {
      server.exchange.system
        .getStats()

        .then(function(stats) {
          stats.errorsPerSec.should.equal(0);
        })

        .then(done)
        .catch(done);
    });

    it('enables another component so subscribe to stats', function(done) {
      setTimeout(function() {
        gotStats.errorsPerSec.should.equal(0);
        done();
      }, 800);
    });
  }
);
