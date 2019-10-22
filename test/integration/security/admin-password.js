var path = require('path');
const log = require('why-is-node-running');

describe(
  require('../../__fixtures/utils/test_helper')
    .create()
    .testName(__filename, 3),
  function() {
    this.timeout(30000);

    var expect = require('expect.js');

    var libFolder =
      path.resolve(__dirname, '../../..') +
      path.sep +
      ['test', '__fixtures', 'utils'].join(path.sep) +
      path.sep;

    var TestHelper = require(libFolder + 'test_helper');

    var helper = new TestHelper();

    var __testFileName1 = helper.newTestFile({ name: 'admin-password-1' });

    var __testFileName2 = helper.newTestFile({ name: 'admin-password-2' });

    var config1 = {
      happn: {
        port: 55001,
        name: 'admin-password-1',
        secure: true,
        services: {
          security: {
            config: {
              adminUser: {
                password: 'initialPassword'
              }
            }
          },
          data: {
            config: {
              filename: __testFileName1
            }
          }
        }
      },
      __testOptions: {
        getClient: true
      }
    };

    var config2 = {
      happn: {
        port: 55002,
        name: 'admin-password-2',
        secure: true,
        services: {
          security: {
            config: {
              adminUser: {
                password: 'initialPassword'
              }
            }
          },
          data: {
            config: {
              filename: __testFileName2
            }
          }
        }
      },
      __testOptions: {
        getClient: true
      }
    };

    before('should initialize the helper with services', function(done) {
      helper.startUp([config1, config2], done);
    });

    after('tears down all services and clients', function(done) {
      this.timeout(10000);
      helper.tearDown(() => {
        setTimeout(() => {
          //log();
          done();
        }, 5000);
      });
    });

    it('changes the admin password, then restarts the service - we check the new admin password is still in place', function(done) {
      helper.getClient({ name: 'admin-password-1' }, function(e, client) {
        if (e) return done(e);

        helper.disconnectClient(client.id, function(e) {
          if (e) return done(e);

          var service = helper.findService({ id: 'admin-password-1' });

          try {
            service.instance.exchange.security.upsertUser(
              { username: '_ADMIN', password: 'modifiedPassword' },
              function(e) {
                if (e) return done(e);

                helper.restartService({ id: 'admin-password-1' }, function(e) {
                  expect(e.toString()).to.be(
                    'Error: started service ok but failed to get client: AccessDenied: Invalid credentials'
                  );

                  helper.getService(config1, done, 'modifiedPassword');
                });
              }
            );
          } catch (e) {
            done(e);
          }
        });
      });
    });

    it('restarts the service without changing the password - all should be ok', function(done) {
      helper.getClient({ name: 'admin-password-2' }, function(e, client) {
        if (e) return done(e);

        helper.disconnectClient(client.id, function(e) {
          if (e) return done(e);

          try {
            helper.restartService({ id: 'admin-password-2' }, done);
          } catch (e) {
            done(e);
          }
        });
      });
    });
  }
);
