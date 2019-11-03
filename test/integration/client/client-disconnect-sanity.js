/**
 * Created by Simon on 02/04/2017.
 */
describe(
  require('../../__fixtures/utils/test_helper')
    .create()
    .testName(__filename, 3),
  function() {
    this.timeout(120000);

    var path = require('path');
    var Happner = require('../../..');
    var test_id = require('shortid').generate();
    var expect = require('expect.js');
    var libFolder =
      path.resolve(__dirname, '../../..') +
      path.sep +
      ['test', '__fixtures', 'test', 'integration', 'client'].join(path.sep);

    var config = {
      name: 'middlewareMesh',
      happn: {
        secure: true,
        port: 15000,
        services: {
          security: {
            config: {
              adminUser: {
                password: test_id
              }
            }
          }
        }
      },
      modules: {
        middlewareTest: {
          path: libFolder + path.sep + 'g4-client-revoke-session'
        }
      },
      components: {
        webmethodtest: {
          moduleName: 'middlewareTest',
          web: {
            routes: {
              method1: 'method1',
              method2: 'method2'
            }
          }
        }
      }
    };

    var mesh;
    var adminClient;

    before('starts up the mesh', function(done) {
      Happner.create(config, function(err, meshInstance) {
        if (err) return done(err);
        mesh = meshInstance;
        done();
      });
    });

    after(function(done) {
      if (mesh) mesh.stop(done);
      else done();
    });

    function doRequest(path, token, callback) {
      var request = require('request');

      var options = {
        url: 'http://127.0.0.1:15000' + path + '?happn_token=' + token
      };

      request(options, function(error, response, body) {
        callback(error, response, body);
      });
    }

    it('logs in with the admin user - we then test a call to a web-method, then disconnects with the revokeToken flag set to true, we try and reuse the token and ensure that it fails', function(done) {
      this.timeout(5000);

      adminClient = new Happner.MeshClient({ secure: true, port: 15000 });

      var credentials = {
        username: '_ADMIN', // pending
        password: test_id
      };

      adminClient
        .login(credentials)

        .then(function() {
          var sessionToken = adminClient.token;

          doRequest('/webmethodtest/method1', sessionToken, function(err, response) {
            expect(response.statusCode).to.equal(200);

            adminClient.disconnect({ revokeSession: true }, function(e) {
              if (e) return done(e);

              setTimeout(function() {
                doRequest('/webmethodtest/method1', sessionToken, function(err, response) {
                  expect(response.statusCode).to.equal(403);

                  done();
                });
              }, 2000);
            });
          });
        })

        .catch(function(e) {
          done(e);
        });
    });

    it('logs in with the websockets user - we then test a call to a web-method, then disconnects with the revokeToken flag not set, we try and reuse the token and ensure that it succeeds', function(done) {
      this.timeout(5000);

      adminClient = new Happner.MeshClient({ secure: true, port: 15000 });

      var credentials = {
        username: '_ADMIN', // pending
        password: test_id
      };

      adminClient
        .login(credentials)

        .then(function() {
          var sessionToken = adminClient.token;

          doRequest('/webmethodtest/method1', sessionToken, function(err, response) {
            expect(response.statusCode).to.equal(200);

            adminClient.disconnect(function(e) {
              if (e) return done(e);

              setTimeout(function() {
                doRequest('/webmethodtest/method1', sessionToken, function(err, response) {
                  expect(response.statusCode).to.equal(200);
                  done();
                });
              }, 2000);
            });
          });
        })

        .catch(function(e) {
          done(e);
        });
    });

    it('can call disconnect() even of the login failed', function(done) {
      new Happner.MeshClient({ port: 1 }).disconnect(done);
    });
  }
);
