describe(
  require('../../__fixtures/utils/test_helper')
    .create()
    .testName(__filename, 3),
  function() {
    this.timeout(120000);

    var Mesh = require('../../..');
    var mesh;

    // var client = new Mesh.MeshClient({
    //   secure: true,
    //   port: 8884,
    //   reconnect: {
    //     max: 500 //we can then wait 10 seconds and should be able to reconnect before the next 10 seconds,
    //   }
    // });

    var startMesh = function(callback) {
      Mesh.create(
        {
          name: 'login-resubscribe',
          happn: {
            secure: true
          }
        },
        function(e, instance) {
          if (e) return callback(e);
          mesh = instance;

          callback();
        }
      );
    };

    before(function(done) {
      startMesh(done);
    });

    after(function(done) {
      if (mesh) mesh.stop({ reconnect: false }, done);
      else done();
    });

    xit('logs in, then reconnects and automatically re-establishes subscriptions', function(done) {
      done(new Error('not implemented'));
    });
  }
);
