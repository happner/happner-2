/**
 * Created by nomilous on 2016/07/31.
 */

//TODO: test either incomplete or not started
// secure->insecure - not tested
// insecure->secure - timing out for allowed, access denied for not allowed
// secure->secure - timing out on access denied
// DONE - from insecure mesh to secure mesh
// TODO - from secure mesh to secure mesh

describe.skipWindows = (process.platform === 'win32') ? describe.skip : describe;

// skip for issue 223
describe.skipWindows(require('../../__fixtures/utils/test_helper').create().testName(__filename, 3), function() {

  var path = require('path');
  var should = require('chai').should();
  var Happner = require('../../..');
  var shortid = require('shortid');
  var fs = require('fs');
  var Promise = require('bluebird');

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
              $happn.data.set('/data/forbidden', {
                test: 'data'
              }, callback);
            },
            allowedMethodNotOtherMethod: function($happn, $origin, callback) {
              try {
                $happn.exchange['secureMesh']['x-service-name'].otherMethod(callback);
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
              $happn.data.set('/data/forbidden', {
                test: 'data'
              }, callback);
            },
            otherMethod: function($happn, callback) {
              callback();
            }
          }
        },
        'y-service-name': {
          instance: {
            method1: function(callback) {
              callback(null, 'y-service-name/method1 ok');
            },
            allowedMethodNotData: function($happn, callback) {
              $happn.data.set('/data/forbidden', {
                test: 'data'
              }, callback);
            },
            otherMethod: function($happn, callback) {
              callback(new Error('unexpected success'))
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
    }).then(function(_mesh) {
      secureMesh = _mesh;
      done();
    }).catch(done);
  });

  before('setup secureMesh user', function(done){
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

    Promise.all([
        security.addGroup(theGroup),
        security.addUser(theUser)
      ])
      .spread(function(group, user) {
        return security.linkGroup(group, user);
      })
      .then(function() {
        done();
      });
  });

  after('stop mesh2', function(done) {
    // fs.unlink(dbFileName2, function(e) {
    //   if (mesh2) return mesh2.stop({reconnect: false}, done);
    //   done();
    // });
    if (mesh2) {
      mesh2.stop({
        reconnect: false
      }, done);
      return;
    }
    done();
  });

  after('stop secureMesh', function(done) {
    fs.unlink(dbFileName, function(e) {
      // ignore e
      if (secureMesh) {
        return secureMesh.stop({
          reconnect: false
        }, done);
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
        'secureMesh': {
          config: {
            host: 'localhost',
            username: '_ADMIN',
            password: testId,
            secure: true
          }
        }
      },
      modules: {
        'service-name': {
          instance: {
            allowedMethodNotOtherRemoteMethod: function($happn, callback) {
              try {
                $happn.exchange['secureMesh']['service-name'].allowedMethodNotOtherMethod(callback);
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
    }).then(function(_mesh) {

      mesh2 = _mesh;
      done();

    }).catch(function(e) {
      done(e);
    });
  });

  before('setup mesh2 user', function(done){
    var theGroup = {
      name: 'group',
      permissions: {
        methods: {
          '/service-name/allowedMethodNotOtherRemoteMethod': {
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

    var security = mesh2.exchange.security;

    Promise.all([
        security.addGroup(theGroup),
        security.addUser(theUser)
      ])
      .spread(function(group, user) {
        return security.linkGroup(group, user);
      })
      .then(function() {
        done();
      });
  })

  it('authority delegation: allows client access to a function, but then denies access to a remote method, called by an allowed remote method, of the allowed method', function(done) {

    var testClient = new Happner.MeshClient({port: 55001});

    testClient.login({
      username: 'username',
      password: 'password',
    }).then(function () {
      testClient.exchange['service-name'].allowedMethodNotOtherRemoteMethod()
        .then(function(result) {
          done(new Error('unexpected success'));
        })
        .catch(function(e) {
          e.toString().should.equal('AccessDenied: unauthorized');
          done();
        });
    }).catch(function (e) {
      done(e);
    });
  });

  it('authority delegation: allows client access to a function, updates the group to disallow access to the allowed function, we retry the function call and ensure that the client is unable to access the disallowed function', function(done) {

    var testClient = new Happner.MeshClient({port: 55001});

    testClient.login({
      username: 'username',
      password: 'password',
    }).then(function () {
      testClient.exchange['service-name'].allowedMethodNotOtherRemoteMethod()
        .then(function(result) {
          done(new Error('unexpected success'));
        })
        .catch(function(e) {
          e.toString().should.equal('AccessDenied: unauthorized');
          done();
        });
    }).then(function () {
      var security = mesh2.exchange.security;
      security.addGroupPermissions('group', {
        methods:{
          
        }
      });
    }).catch(function (e) {
      done(e);
    });
  });
});
