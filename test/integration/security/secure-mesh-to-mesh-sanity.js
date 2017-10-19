var path = require('path');

describe(path.basename(__filename), function () {

  context('on remote mesh', function () {

    var spawn = require('child_process').spawn
      , remote
      , assert = require('assert')
      , mesh
      , Mesh = require('../../..');

    var libFolder = path.resolve(__dirname, '../../..') + path.sep + ['test', '__fixtures', 'test', 'integration', 'security'].join(path.sep) + path.sep;

    var config = {
      name: 'mesh2',
      happn: {
        secure: true,
        port: 51233
      },
      endpoints: {
        remoteMesh: {  // remote mesh node
          config: {
            port: 51231,
            username: '_ADMIN',
            password: 'testb2' // TODO This was necessary, did not default
          }
        }
      },
      modules: {},
      components: {}
    };

    this.timeout(120000);

    before(function (done) {

      var _this = this;

      // spawn remote mesh in another process
      remote = spawn('node', [libFolder + 'secure-mesh-to-mesh']);

      remote.stdout.on('data', function (data) {

        // console.log(data.toString());
        if (data.toString().match(/READY/)) {

          // console.log('remote ready:::', remote.pid);

          mesh = new Mesh();

          // console.log('starting this one', mesh, config);
          // mesh.initialize(config, function(err) {
          mesh.initialize(config, function (e) {
            if (e) return done(e);
            mesh.start(done);
          });
        }

      });
    });


    after(function (done) {
      remote.kill();
      mesh.stop({reconnect: false}, function (e) {
        // console.log('killed ok:::', remote.pid);
        done();
      });
    });

    it("can call remote component function", function (done) {

      mesh.exchange.remoteMesh.remoteComponent.remoteFunction(
        'one!', 'two!', 'three!', function (err, res) {

          assert(res == 'one! two! three!, wheeeeeeeeeeeeheeee!');
          done()
        });
    });

    it('we know when there was an accident', function (done) {

      mesh.exchange.remoteMesh.remoteComponent.causeError(function (err, res) {

        assert(err.toString().match(/ErrorType: Error string/))
        done();

      });
    });
  });
});
