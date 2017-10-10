describe(require('path').basename(__filename), function () {

  var path = require('path');
  var remoteConfig = require('./lib/g9/g9-config');
  var assert = require('assert');
  var Mesh = require('..');

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

      console.log('creating mesh:::');

      Mesh.create(remoteConfig)

        .then(function (createdMesh) {
          console.log('created mesh:::');
          remoteMesh = createdMesh;
        })

        .then(function () {
          console.log('creating mesh with endpoint:::');
          return Mesh.create(config);
        })

        .then(function (createdMesh) {
          mesh = createdMesh;
        })

        .then(function () {
          done();
        })
        .catch(done)
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
          console.log(data);
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
