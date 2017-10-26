describe(require('../../__fixtures/utils/test_helper').create().testName(__filename, 3), function () {

  this.timeout(120000);

  var path = require('path');
  var Mesh = require('../../..');
  var expect = require('expect.js');
  var libFolder = path.resolve(__dirname, '../../..') + path.sep + ['test', '__fixtures', 'test', 'integration', 'client'].join(path.sep);
  var serverMesh;

  after(function () {
    return serverMesh.stop();
  });

  var testClient;

  var config = require(path.join(libFolder, 'websocket-client-mesh-config'));

  function createMesh() {
    return Mesh.create(config)
      .then(function (meshInstance) {
        serverMesh = meshInstance;
      })
  }

  before(function () {
    return createMesh()
      .then(function () {
        testClient = new Mesh.MeshClient({port: 3111});
        return testClient.login({
          username: '_ADMIN',
          password: 'password'
        });
      });

  });

  it('stops the current happn client before creating a new one on login', function () {

    var currentData = testClient.data;

    expect(currentData.state).to.equal(1);

    return testClient.login({
        username: '_ADMIN',
        password: 'password'
      })
      .then(function () {
        var newData = testClient.data;

        expect(newData).to.not.equal(currentData);

        expect(currentData.state).to.equal(2);

        expect(newData.state).to.equal(1);
      });
  });

  it('has no client running if the login fails', function (done) {

    var newClient = new Mesh.MeshClient({port: 3111});

    testClient.disconnect()
      .then(function () {
        return newClient.login({
          username: '_ADMIN',
          password: 'bad_password'
        })
      })
      .catch(function (err) {
        expect(err.message).to.equal('Invalid credentials');
        expect(newClient.data).to.be(undefined);
        serverMesh.stop()
          .then(function () {
            return createMesh();
          })
          .then(function () {
            serverMesh._mesh.happn.server.services.session.primus.on('connection', waitForNoConnection);

            setTimeout(function () {
              serverMesh._mesh.happn.server.services.session.primus.removeListener('connection', waitForNoConnection);
              done();
            }, 5000);
          });

      });

    function waitForNoConnection() {
      serverMesh._mesh.happn.server.services.session.primus.removeListener('connection', waitForNoConnection);
      done(new Error('The client should not try to connect anymore'));
    }
  });
});
