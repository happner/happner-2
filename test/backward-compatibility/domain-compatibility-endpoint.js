// connect old happner endpoint to new happner server
// (use config.domain to support load balancer)
describe(
  require('../__fixtures/utils/test_helper')
    .create()
    .testName(__filename),
  function() {
    var OldHappner = require('happner');
    var Happner = require('../..');
    var expect = require('expect.js');

    this.timeout(20000);

    context('insecure', function() {
      var server, endpoint;

      before('start server', function(done) {
        server = undefined;
        Happner.create({
          name: 'MESH_NAME',
          domain: 'DOMAIN_NAME',
          modules: {
            testComponent: {
              instance: {
                method: function($happn, callback) {
                  callback(null, $happn.info.mesh.domain);
                },
                causeEvent: function($happn, callback) {
                  $happn.emit('/event', { da: 'ta' });
                  callback();
                },
                useOwnData: function($happn, callback) {
                  var data = { some: 'DATA' };
                  $happn.data.set('/some/data', data, function(e) {
                    if (e) return callback(e);
                    $happn.data.get('/some/data', function(e, response) {
                      if (e) return callback(e);
                      delete response._meta;
                      callback(null, response);
                    });
                  });
                }
              }
            }
          },
          components: {
            testComponent: {},
            data: {}
          }
        })
          .then(function(_server) {
            server = _server;
            done();
          })
          .catch(done);
      });

      before('start endpoint', function(done) {
        endpoint = undefined;
        OldHappner.create({
          port: 55001,
          endpoints: {
            DOMAIN_NAME: {
              config: {
                username: 'username',
                password: 'password'
              }
            }
          },
          modules: {
            localModule: {
              instance: {
                use$happnMethod: function($happn, callback) {
                  $happn.exchange.DOMAIN_NAME.testComponent
                    .method()
                    .then(function(result) {
                      callback(null, result);
                    })
                    .catch(callback);
                }
              }
            }
          },
          components: {
            localModule: {}
          }
        })
          .then(function(_endpoint) {
            endpoint = _endpoint;
            done();
          })
          .catch(done);
      });

      after('stop endpoint', function(done) {
        if (!endpoint) return done();
        endpoint.stop({ reconnect: false }, done);
      });

      after('stop server', function(done) {
        if (!server) return done();
        server.stop({ reconnect: false }, done);
      });

      it('can call component methods', function(done) {
        endpoint.exchange.DOMAIN_NAME.testComponent
          .method()
          .then(function(result) {
            expect(result).to.equal('DOMAIN_NAME');
          })
          .then(done)
          .catch(done);
      });

      it('can call component methods with $happn', function(done) {
        endpoint.exchange.localModule
          .use$happnMethod()
          .then(function(result) {
            expect(result).to.equal('DOMAIN_NAME');
          })
          .then(done)
          .catch(done);
      });

      it('can subscribe to events', function(done) {
        endpoint.event.DOMAIN_NAME.testComponent.on('/event', function() {
          done();
        });
        endpoint.exchange.DOMAIN_NAME.testComponent.causeEvent().catch(done);
      });

      it('can use $happn shared data remotely', function(done) {
        endpoint.exchange.DOMAIN_NAME.data.set('/some/data', { da: 'ta' }, function(e) {
          if (e) return done(e);
          endpoint.exchange.DOMAIN_NAME.data.get('/some/data', function(e, data) {
            if (e) return done(e);
            try {
              delete data._meta;
              expect(data).to.eql({ da: 'ta' });
              done();
            } catch (e) {
              done(e);
            }
          });
        });
      });

      it('can use $happn.data', function(done) {
        endpoint.exchange.DOMAIN_NAME.testComponent
          .useOwnData()
          .then(function(result) {
            expect(result).to.eql({ some: 'DATA' });
          })
          .then(done)
          .catch(done);
      });
    });

    context('secure', function() {
      var server, endpoint;

      before('start server', function(done) {
        server = undefined;
        Happner.create({
          name: 'MESH_NAME',
          domain: 'DOMAIN_NAME',
          happn: {
            secure: true
          },
          modules: {
            testComponent: {
              instance: {
                method: function($happn, callback) {
                  callback(null, $happn.info.mesh.domain);
                },
                causeEvent: function($happn, callback) {
                  $happn.emit('event', { da: 'ta' });
                  callback();
                },
                useOwnData: function($happn, callback) {
                  var data = { some: 'DATA' };
                  $happn.data.set('/some/data', data, function(e) {
                    if (e) return callback(e);
                    $happn.data.get('/some/data', function(e, response) {
                      if (e) return callback(e);
                      delete response._meta;
                      callback(null, response);
                    });
                  });
                }
              }
            }
          },
          components: {
            testComponent: {},
            data: {}
          }
        })
          .then(function(_server) {
            server = _server;
            done();
          })
          .catch(done);
      });

      before('create user', function(done) {
        var security = server.exchange.security;
        var group = {
          name: 'group',
          permissions: {
            events: {
              '/DOMAIN_NAME/testComponent/event': { authorized: true }
            },
            // data: {},
            methods: {
              '/DOMAIN_NAME/testComponent/method': { authorized: true },
              '/DOMAIN_NAME/testComponent/causeEvent': { authorized: true },
              '/DOMAIN_NAME/testComponent/useOwnData': { authorized: true },
              '/DOMAIN_NAME/data/set': { authorized: true },
              '/DOMAIN_NAME/data/get': { authorized: true }
            }
          }
        };
        var user = {
          username: 'username',
          password: 'password'
        };

        Promise.all([security.addGroup(group), security.addUser(user)])
          .then(function(results) {
            return security.linkGroup(...results);
          })
          .then(function() {
            done();
          })
          .catch(done);
      });

      before('start endpoint', function(done) {
        endpoint = undefined;
        OldHappner.create({
          port: 55001,
          datalayer: {
            secure: true
          },
          endpoints: {
            DOMAIN_NAME: {
              config: {
                username: 'username',
                password: 'password'
              }
            }
          },
          modules: {
            localModule: {
              instance: {
                use$happnMethod: function($happn, callback) {
                  $happn.exchange.DOMAIN_NAME.testComponent
                    .method()
                    .then(function(result) {
                      callback(null, result);
                    })
                    .catch(callback);
                }
              }
            }
          },
          components: {
            localModule: {}
          }
        })
          .then(function(_endpoint) {
            endpoint = _endpoint;
            done();
          })
          .catch(done);
      });

      after('stop endpoint', function(done) {
        if (!endpoint) return done();
        endpoint.stop({ reconnect: false }, done);
      });

      after('stop server', function(done) {
        if (!server) return done();
        server.stop({ reconnect: false }, done);
      });

      it('can call component methods', function(done) {
        endpoint.exchange.DOMAIN_NAME.testComponent
          .method()
          .then(function(result) {
            expect(result).to.equal('DOMAIN_NAME');
          })
          .then(done)
          .catch(done);
      });

      it('can call component methods with $happn', function(done) {
        endpoint.exchange.localModule
          .use$happnMethod()
          .then(function(result) {
            expect(result).to.equal('DOMAIN_NAME');
          })
          .then(done)
          .catch(done);
      });

      it('can subscribe to events', function(done) {
        endpoint.event.DOMAIN_NAME.testComponent.on('event', function() {
          done();
        });
        endpoint.exchange.DOMAIN_NAME.testComponent.causeEvent().catch(done);
      });

      it('can use $happn shared data remotely', function(done) {
        endpoint.exchange.DOMAIN_NAME.data.set('/some/data', { da: 'ta' }, function(e) {
          if (e) return done(e);
          endpoint.exchange.DOMAIN_NAME.data.get('/some/data', function(e, data) {
            if (e) return done(e);
            try {
              delete data._meta;
              expect(data).to.eql({ da: 'ta' });
              done();
            } catch (e) {
              done(e);
            }
          });
        });
      });

      it('can use $happn.data', function(done) {
        endpoint.exchange.DOMAIN_NAME.testComponent
          .useOwnData()
          .then(function(result) {
            expect(result).to.eql({ some: 'DATA' });
          })
          .then(done)
          .catch(done);
      });
    });
  }
);
