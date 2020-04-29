var expect = require('expect.js');
const Mesh = require('../../../');
const testHelper = require('../../__fixtures/utils/test_helper').create();

describe(testHelper.testName(__filename, 3), function() {
  this.timeout(10000);
  var server;
  var startServer = function(config) {
    return new Promise((resolve, reject) => {
      Mesh.create({ happn: config })
        .then(function(_server) {
          server = _server;
        })
        .then(resolve)
        .catch(reject);
    });
  };

  var stopServer = function() {
    return new Promise((resolve, reject) => {
      if (!server) return resolve();
      server.stop(function(e) {
        if (e) return reject(e);
        server = undefined; // ?? perhaps also on e, messy
        resolve();
      });
    });
  };

  it('emits session/ended/token-expired', async () => {
    let serverConfig = {
      secure: true,
      services: {
        security: {
          config: {
            profiles: [
              {
                name: 'short-session',
                session: {
                  $and: [
                    {
                      user: {
                        username: {
                          $eq: '_ADMIN'
                        }
                      }
                    }
                  ]
                },
                policy: {
                  ttl: '3 seconds'
                }
              }
            ]
          }
        }
      }
    };
    let clientConfig = {
      username: '_ADMIN',
      password: 'happn'
    };
    await startServer(serverConfig);
    const sessionService = server._mesh.happn.server.services.session;
    let client = new Mesh.MeshClient();
    await client.login(clientConfig);
    var reason = false;
    expect(sessionService.__sessionExpiryWatchers[client.data.session.id] != null).to.be(true);
    client.on('session/ended', function(evt) {
      reason = evt.reason;
    });
    await testHelper.delay(4000);
    expect(sessionService.__sessionExpiryWatchers[client.data.session.id] == null).to.be(true);
    await client.disconnect();
    await stopServer();
    expect(reason).to.be('token-expired');
  });

  it('ensures the session timeout is cleared if session ends before session/ended/token-expired', async () => {
    let serverConfig = {
      secure: true,
      services: {
        security: {
          config: {
            profiles: [
              {
                name: 'short-session',
                session: {
                  $and: [
                    {
                      user: {
                        username: {
                          $eq: '_ADMIN'
                        }
                      }
                    }
                  ]
                },
                policy: {
                  ttl: '3 seconds'
                }
              }
            ]
          }
        }
      }
    };
    let clientConfig = {
      username: '_ADMIN',
      password: 'happn'
    };
    await startServer(serverConfig);
    const sessionService = server._mesh.happn.server.services.session;
    let client = new Mesh.MeshClient();
    await client.login(clientConfig);

    var reason = false;
    client.on('session/ended', function(evt) {
      reason = evt.reason;
    });
    await testHelper.delay(500);
    expect(sessionService.__sessionExpiryWatchers[client.data.session.id] != null).to.be(true);
    sessionService.endSession(client.data.session.id, 'test-reason');
    await testHelper.delay(500);
    expect(sessionService.__sessionExpiryWatchers[client.data.session.id] == null).to.be(true);

    await client.disconnect();
    await stopServer();
    expect(reason).to.be('test-reason');
  });

  it('ensures the session timeout is cleared if client disconnects before session/ended/token-expired', async () => {
    let serverConfig = {
      secure: true,
      services: {
        security: {
          config: {
            profiles: [
              {
                name: 'short-session',
                session: {
                  $and: [
                    {
                      user: {
                        username: {
                          $eq: '_ADMIN'
                        }
                      }
                    }
                  ]
                },
                policy: {
                  ttl: '3 seconds'
                }
              }
            ]
          }
        }
      }
    };
    let clientConfig = {
      username: '_ADMIN',
      password: 'happn'
    };
    await startServer(serverConfig);

    const sessionService = server._mesh.happn.server.services.session;
    let client = new Mesh.MeshClient();
    await client.login(clientConfig);

    await testHelper.delay(500);
    expect(sessionService.__sessionExpiryWatchers[client.data.session.id] != null).to.be(true);
    await client.disconnect();
    await testHelper.delay(500);
    expect(sessionService.__sessionExpiryWatchers[client.data.session.id] == null).to.be(true);
    await stopServer();
  });

  it('emits session/ended/activity-timeout', async () => {
    let serverConfig = {
      secure: true,
      services: {
        security: {
          config: {
            profiles: [
              {
                name: 'short-activity-ttl',
                session: {
                  $and: [
                    {
                      user: {
                        username: {
                          $eq: '_ADMIN'
                        }
                      }
                    }
                  ]
                },
                policy: {
                  ttl: '10 seconds',
                  inactivity_threshold: '3 seconds'
                }
              }
            ]
          }
        }
      }
    };
    let clientConfig = {
      username: '_ADMIN',
      password: 'happn'
    };
    await startServer(serverConfig);
    let client = new Mesh.MeshClient();
    await client.login(clientConfig);
    var reason = false;
    client.on('session/ended', function(evt) {
      reason = evt.reason;
    });
    await testHelper.delay(4000);
    try {
      await client.data.set('test/data', {
        test: 'data'
      });
    } catch (e) {
      // do nothing
    }
    await testHelper.delay(1000);
    await client.disconnect();
    await stopServer();
    expect(reason).to.be('inactivity-threshold');
  });

  it('emits session/ended/token-revoked', async () => {
    let serverConfig = {
      secure: true
    };
    let clientConfig = {
      username: '_ADMIN',
      password: 'happn'
    };
    await startServer(serverConfig);
    let client = new Mesh.MeshClient();
    await client.login(clientConfig);
    var reason = false;
    client.on('session/ended', function(evt) {
      reason = evt.reason;
    });
    const securityService = server._mesh.happn.server.services.security;
    securityService.revokeToken(client.data.session.token, 'test', () => {
      //do nothing
    });
    await testHelper.delay(2000);
    await stopServer();
    expect(reason).to.be('token-revoked');
  });
});
