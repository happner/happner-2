var path = require('path');

describe(path.basename(__filename), function () {

  var spawn = require('child_process').spawn
    , remote
    , assert = require('assert')
    , mesh
    , Mesh = require('../../..')
    ;

  var libFolder = path.resolve(__dirname, '../../..') + path.sep + ['test', '__fixtures', 'test', 'integration', 'mesh'].join(path.sep) + path.sep;

  var config = {

    name: 'mesh2',

    happn: {
      port: 3002
    },

    endpoints: {
      'remoteMesh': {  // remote mesh node
        config: {
          host:'localhost',
          port: 3001,
          username: '_ADMIN',
          password: 'guessme'
        }
      }
    },
    modules: {},
    components: {}
  };

  this.timeout(120000);

  before(function (done) {

    // spawn remote mesh in another process
    remote = spawn('node', [libFolder + '4-first-mesh']);

    remote.stdout.on('data', function (data) {

      // console.log(data.toString());

      if (data.toString().match(/READY/)) {


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
    mesh.stop({reconnect: false}, done);
  });

  context('on remote mesh', function () {

    it("can call remote component function and subscribe to event", function (done) {

      var eventFired = false;

      mesh.event.remoteMesh.remoteComponent.on('*', function (data, meta) {
        if (data.value == 'whoa') eventFired = true;
      });

      mesh.exchange.remoteMesh.remoteComponent.remoteFunction(
        'one!', 'two!', 'three!', function (err, res) {

          assert(res == 'one! two! three!, wheeeeeeeeeeeeheeee!');
          assert(eventFired);
          done()

        });
    });

    it('can receive remotely caught error', function (done) {

      mesh.exchange.remoteMesh.remoteComponent.causeError(function (err, res) {

        assert(err.toString().match(/ErrorType: Error string/))
        done();

      });
    });
  });
});
