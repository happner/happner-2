var path = require('path');

describe(
  require('../../__fixtures/utils/test_helper')
    .create()
    .testName(__filename, 3),
  function() {
    // cannot do mocha test/4-mesh-to-mesh.js --watch
    // address already in use for 2nd... runs

    var spawn = require('child_process').spawn,
      remote,
      assert = require('assert'),
      mesh,
      Mesh = require('../../..');
    var libFolder =
      path.resolve(__dirname, '../../..') +
      path.sep +
      ['test', '__fixtures', 'test', 'integration', 'security'].join(path.sep) +
      path.sep;

    this.timeout(120000);

    var config = {
      name: 'mesh2',
      happn: {
        port: 55002,
        secure: true,
        encryptPayloads: true
      },
      endpoints: {
        theFarawayTree: {
          // remote mesh node
          config: {
            port: 55001,
            host: 'localhost',
            username: '_ADMIN',
            password: 'guessme'
          }
        }
      },
      modules: {},
      components: {}
    };

    before(function(done) {
      // spawn remote mesh in another process
      remote = spawn('node', [libFolder + 'payload-encryption']);

      remote.stdout.on('data', function(data) {
        if (data.toString().match(/READY/)) {
          mesh = new Mesh();
          // mesh.initialize(config, function(err) {
          mesh.initialize(config, function(e) {
            done(e);
          });
        }
      });
    });

    after(function(done) {
      remote.kill();
      mesh.stop({ reconnect: false }, done);
    });

    context('the faraway tree, in the mist...', function() {
      it("we can ride moonface's slippery slip", function(done) {
        var eventFired = false;

        mesh.event.theFarawayTree.moonface.on('*', function(data) {
          if (data.value === 'whoa') eventFired = true;
        });

        mesh.exchange.theFarawayTree.moonface.rideTheSlipperySlip(
          'one!',
          'two!',
          'three!',
          function(err, res) {
            assert(res === 'one! two! three!, wheeeeeeeeeeeeheeee!');
            assert(eventFired);
            done();
          }
        );
      });

      it('we know when there was an accident', function(done) {
        mesh.exchange.theFarawayTree.moonface.haveAnAccident(function(err) {
          assert(err.toString().match(/SlipFailure: Stray patch of glue./));
          done();
        });
      });
    });
  }
);
