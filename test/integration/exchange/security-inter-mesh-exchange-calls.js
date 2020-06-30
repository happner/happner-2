describe.skipWindows = process.platform === 'win32' ? describe.skip : describe;

describe.skipWindows(
  require('../../__fixtures/utils/test_helper')
    .create()
    .testName(__filename, 3),
  function() {
    var path = require('path');
    require('chai').should();
    var Happner = require('../../..');
    var shortid = require('shortid');
    var fs = require('fs');
    var testId = shortid.generate();
    var testId2 = shortid.generate();
    var dbFileName = '.' + path.sep + 'temp' + path.sep + testId + '.nedb';
    var dbFileName2 = '.' + path.sep + 'temp' + path.sep + testId2 + '.nedb';
    var secureMesh;
    var mesh2;

    var SECURE = true;
    this.timeout(20000);

    before('start secureMesh', function(done) {
      Happner.create({
        name: 'secureMesh',
        happn: {
          secure: SECURE,
          adminPassword: testId,
          filename: dbFileName
        },
        modules: {
          'service-name': {
            instance: {
              method1: function(callback) {
                callback(null, 'service-name/method1 ok');
              },
              method2: function(callback) {
                callback(null, 'service-name/method2 ok');
              },
              allowedMethodNotData: function($happn, callback) {
                $happn.data.set(
                  '/data/forbidden',
                  {
                    test: 'data'
                  },
                  callback
                );
              },
              allowedMethodNotOtherMethod: function($happn, callback) {
                try {
                  $happn.exchange['x-service-name'].otherMethod(callback);
                } catch (e) {
                  callback(e);
                }
              }
            }
          },
          'x-service-name': {
            instance: {
              method1: function(callback) {
                callback(null, 'x-service-name/method1 ok');
              },
              allowedMethodNotData: function($happn, callback) {
                $happn.data.set(
                  '/data/forbidden',
                  {
                    test: 'data'
                  },
                  callback
                );
              },
              otherMethod: function($happn, callback) {
                callback(new Error('unexpected success'));
              }
            }
          },
          'y-service-name': {
            instance: {
              method1: function(callback) {
                callback(null, 'y-service-name/method1 ok');
              },
              allowedMethodNotData: function($happn, callback) {
                $happn.data.set(
                  '/data/forbidden',
                  {
                    test: 'data'
                  },
                  callback
                );
              },
              otherMethod: function($happn, callback) {
                callback(new Error('unexpected success'));
              }
            }
          }
        },
        components: {
          'service-name': {
            security: {
              authorityDelegationOn: true
            }
          },
          'x-service-name': {
            security: {
              authorityDelegationOn: true
            }
          },
          'y-service-name': {
            security: {
              authorityDelegationOn: false
            }
          }
        }
      })
        .then(function(_mesh) {
          secureMesh = _mesh;

          if (!SECURE) return done();

          var theGroup = {
            name: 'group',
            permissions: {
              methods: {
                '/secureMesh/service-name/method1': {
                  authorized: true
                },
                '/secureMesh/service-name/allowedMethodNotData': {
                  authorized: true
                },
                '/secureMesh/x-service-name/allowedMethodNotData': {
                  authorized: true
                },
                '/secureMesh/y-service-name/allowedMethodNotData': {
                  authorized: true
                },
                '/secureMesh/service-name/allowedMethodNotOtherMethod': {
                  authorized: true
                }
              },
              data: {
                '/data/forbidden': {
                  authorized: false,
                  actions: ['set']
                }
              }
            }
          };

          var theUser = {
            username: 'username',
            password: 'password'
          };

          var security = secureMesh.exchange.security;

          return Promise.all([security.addGroup(theGroup), security.addUser(theUser)])
            .then(function(results) {
              return security.linkGroup(results[0], results[1]);
            })
            .then(function() {
              done();
            });
        })
        .catch(done);
    });

    after('stop mesh2', function(done) {
      // fs.unlink(dbFileName2, function(e) {
      //   if (mesh2) return mesh2.stop({reconnect: false}, done);
      //   done();
      // });
      if (mesh2) {
        mesh2.stop(
          {
            reconnect: false
          },
          done
        );
        return;
      }
      done();
    });

    after('stop secureMesh', function(done) {
      fs.unlink(dbFileName, function() {
        // ignore e
        if (secureMesh) {
          return secureMesh.stop(
            {
              reconnect: false
            },
            done
          );
        }
        done();
      });
    });

    before('start mesh2', function(done) {
      Happner.create({
        port: 55001,
        happn: {
          secure: SECURE,
          adminPassword: testId2,
          filename: dbFileName2
        },
        endpoints: {
          secureMesh: {
            config: {
              host: 'localhost',
              username: 'username',
              password: 'password',
              secure: true
            }
          }
        },
        modules: {
          'service-name': {
            instance: {
              allowedMethodNotOtherRemoteMethod: function($happn, callback) {
                try {
                  $happn.exchange['secureMesh']['service-name'].allowedMethodNotOtherMethod(
                    callback
                  );
                } catch (e) {
                  callback(e);
                }
              },
              allowedMethodNotOtherMethod: function($happn, callback) {
                try {
                  $happn.exchange['secureMesh']['x-service-name'].otherMethod(callback);
                } catch (e) {
                  callback(e);
                }
              }
            }
          }
        },
        components: {
          'service-name': {
            security: {
              authorityDelegationOn: true
            }
          }
        }
      })
        .then(function(_mesh) {
          mesh2 = _mesh;
          done();
        })
        .catch(function(e) {
          done(e);
        });
    });

    it('allows access to allowed function', function(done) {
      mesh2.exchange.secureMesh['service-name']
        .method1()
        .then(function(result) {
          result.should.equal('service-name/method1 ok');
        })
        .then(done)
        .catch(done);
    });

    it('denies access to denied function', function(done) {
      mesh2.exchange.secureMesh['service-name']
        .method2()
        .then(function() {
          throw new Error('should have been denied');
        })
        .catch(function(e) {
          try {
            e.toString().should.equal('AccessDenied: unauthorized');
            done();
          } catch (e) {
            done(e);
          }
        });
    });

    it('denies access to denied function with similar name to allowed function', function(done) {
      // mesh2.exchange.secureMesh['service-name'].method1() // almost identical name is allowed
      mesh2.exchange.secureMesh['x-service-name']
        .method1() // but this should denied
        .then(function() {
          throw new Error('should have been denied');
        })
        .catch(function(e) {
          try {
            e.toString().should.equal('AccessDenied: unauthorized');
            done();
          } catch (e) {
            done(e);
          }
        });
    });

    it('authority delegation: allows client access to a function, but then denies access to a data point being called by the allowed function', function(done) {
      // mesh2.exchange.secureMesh['service-name'].method1() // almost identical name is allowed
      mesh2.exchange.secureMesh['service-name']
        .allowedMethodNotData() // but this should actually be denied
        .then(function() {
          done(new Error('unexpected success'));
        })
        .catch(function(e) {
          e.toString().should.equal('AccessDenied: unauthorized');
          done();
        });
    });

    it('authority delegation: allows client access to a function, but then denies access to a data point being called by the allowed function, negative test', function(done) {
      mesh2.exchange.secureMesh['y-service-name']
        .allowedMethodNotData() // this is now allowed...
        .then(function() {
          done();
        })
        .catch(done);
    });

    it('authority delegation: allows client access to a function, but then denies access to a method called by the allowed method', function(done) {
      mesh2.exchange.secureMesh['service-name']
        .allowedMethodNotOtherMethod() // this is now allowed...
        .then(function() {
          done(new Error('unexpected success'));
        })
        .catch(function(e) {
          e.toString().should.equal('AccessDenied: unauthorized');
          done();
        });
    });

    it('authority delegation: allows client access to a function, but then denies access to a remote method called by the allowed method', function(done) {
      mesh2.exchange['service-name']
        .allowedMethodNotOtherMethod()
        .then(function() {
          done(new Error('unexpected success'));
        })
        .catch(function(e) {
          e.toString().should.equal('AccessDenied: unauthorized');
          done();
        });
    });
  }
);
