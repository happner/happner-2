var path = require('path');

describe(path.basename(__filename), function () {

  context('on remote mesh fails', function () {

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
            password: 'thispasswordwontwork' // TODO This was necessary, did not default
          }
        }
      },
      modules: {},
      components: {}
    };

    after(function (done) {
      remote.kill();
      mesh.stop({reconnect: false}, function (e) {
        // console.log('killed ok 1:::', remote.pid);
        done();
      });
    });

    this.timeout(120000);

    it("cannot connect endpoint - mesh start fails", function (done) {

      var _this = this;

      // spawn remote mesh in another process
      remote = spawn('node', [libFolder + 'secure-mesh-to-mesh-fails']);

      remote.stdout.on('data', function (data) {

        // console.log(data.toString());

        if (data.toString().match(/READY/)) {

          // console.log('remote ready 1:::', remote.pid);

          mesh = new Mesh();

          // console.log('starting this one', mesh, config);
          // mesh.initialize(config, function(err) {
          mesh.initialize(config, function (e) {

            if (!e) return done(new Error('this should not have been possible'));

            assert(e.toString() == 'AccessDenied: Invalid credentials');

            done();

          });
        }

      });
    });
  });
});
