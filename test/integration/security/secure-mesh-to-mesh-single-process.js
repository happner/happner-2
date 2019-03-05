var path = require('path');

describe(require('../../__fixtures/utils/test_helper').create().testName(__filename, 3), function () {

  var libFolder = path.resolve(__dirname, '../../..') + path.sep + ['test', '__fixtures', 'test', 'integration', 'security'].join(path.sep) + path.sep;
  var remoteConfig = require(libFolder + 'secure-mesh-to-mesh-single-process-config');
  var assert = require('assert');
  var Mesh = require('../../..');

  context('on remote mesh', function () {

    var remoteMesh;

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

      Mesh.create(remoteConfig)

        .then(function (createdMesh) {
          remoteMesh = createdMesh;
        })

        .then(function () {
          return Mesh.create(config);
        })

        .then(function (createdMesh) {
          mesh = createdMesh;
        })

        .then(function () {
          done();
        })
        .catch(done);
    });

    after(function (done) {

      remoteMesh.stop({reconnect: false})
        .then(function () {
          done();
        })
        .catch(done);
    });

    after(function (done) {

      mesh.stop({reconnect: false})
        .then(function () {
         done();
        })
        .catch(done);
    });

    it("can call remote component function", function (done) {

      mesh.event.remoteMesh.remoteComponent.on(
        'whoops',
        function handler(data) {
          //console.log(data);
          done();
        },
        function callback(err) {
          if (err) done(err);
        }
      );

      mesh.exchange.remoteMesh.remoteComponent.remoteFunction(
        'one!', 'two!', 'three!', function (err, res) {

          assert(res == 'one! two! three!, wheeeeeeeeeeeeheeee!');

        });
    });

    it('we know when there was an accident', function (done) {

      mesh.exchange.remoteMesh.remoteComponent.causeError(function (err, res) {

        assert(err.toString().match(/ErrorType: Error string/));
        done();

      });
    });
  });
});
