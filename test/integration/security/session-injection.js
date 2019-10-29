module.exports = TestMesh;

function TestMesh() {}

TestMesh.prototype.method1 = function($happn, $origin, callback) {
  callback(null, $origin);
};

if (global.TESTING_D1 || global.TESTING_D1_1) return; // When 'requiring' the module above,
// don't run the tests below
//.............

describe(
  require('../../__fixtures/utils/test_helper')
    .create()
    .testName(__filename, 3),
  function() {
    this.timeout(120000);

    var expect = require('expect.js');
    require('chai').should();

    var unsecureMesh;
    var Mesh = require('../../..');
    var secureMesh = new Mesh();

    var secureClient = new Mesh.MeshClient({ secure: true, port: 8000 });
    var unsecureClient = new Mesh.MeshClient({ port: 8001 });

    var test_id = Date.now() + '_' + require('shortid').generate();

    before('starts a secure mesh', function(done) {
      global.TESTING_D1 = true; //.............

      secureMesh.initialize(
        {
          name: 'session-injection-secure',
          happn: {
            secure: true,
            adminPassword: test_id,
            port: 8000
          },
          modules: {
            TestMesh: {
              path: __filename
            }
          },
          components: {
            TestMesh: {
              moduleName: 'TestMesh',
              schema: {
                exclusive: false
              }
            }
          }
        },
        function(err) {
          if (err) return done(err);
          secureMesh.start(function(err) {
            if (err) {
              // console.log(err.stack);
              return done(err);
            }

            // Credentials for the login method
            var credentials = {
              username: '_ADMIN', // pending
              password: test_id
            };

            secureClient
              .login(credentials)
              .then(function() {
                done();
              })
              .catch(done);
          });
        }
      );
    });

    before('starts an insecure mesh', function(done) {
      global.TESTING_D1_1 = true; //.............

      unsecureMesh = this.mesh = new Mesh();

      unsecureMesh.initialize(
        {
          name: 'd1-session-injection',
          happn: {
            secure: false,
            adminPassword: test_id,
            port: 8001
          },
          modules: {
            TestMesh: {
              path: __filename
            }
          },
          components: {
            TestMesh: {
              moduleName: 'TestMesh',
              schema: {
                exclusive: false
              }
            }
          }
        },
        function(err) {
          if (err) return done(err);
          unsecureMesh.start(function(err) {
            if (err) {
              // console.log(err.stack);
              return done(err);
            }

            // Credentials for the login method
            var credentials = {
              port: 8001
            };

            unsecureClient
              .login(credentials)
              .then(function() {
                done();
              })
              .catch(done);
          });
        }
      );
    });

    after(function(done) {
      delete global.TESTING_D1_1;
      delete global.TESTING_D1;

      unsecureMesh.stop({ reconnect: false }, function(e) {
        if (e) return done(e);

        secureMesh.stop({ reconnect: false }, done);
      });
    });

    it('fetches the origin info on a secure mesh', function(done) {
      secureClient.exchange.TestMesh.method1(function(e, result) {
        if (e) return done(e);
        expect(result.username).to.equal('_ADMIN');
        done();
      });
    });

    it('fetches the origin info on an unsecure mesh', function(done) {
      unsecureClient.exchange.TestMesh.method1(function(e, result) {
        if (e) return done(e);
        expect(result.id).to.not.equal(null);
        expect(result.id).to.not.equal(undefined);
        expect(result.username).to.equal(undefined);
        done();
      });
    });
  }
);
