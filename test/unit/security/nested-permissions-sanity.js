module.exports = SecuredComponent;

function SecuredComponent() {}

SecuredComponent.prototype.method1 = function($happn, options, callback) {
  options.methodName = 'method1';
  callback(null, options);
};

SecuredComponent.prototype.method2 = function($happn, options, callback) {
  options.methodName = 'method2';
  callback(null, options);
};

SecuredComponent.prototype.method3 = function($happn, options, callback) {
  options.methodName = 'method3';
  callback(null, options);
};

SecuredComponent.prototype.fireEvent = function($happn, eventName, callback) {
  $happn.emit(eventName, eventName);
  callback(null, eventName + ' emitted');
};

SecuredComponent.prototype.webGetPutPost = function(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ method: req.method }));
};

SecuredComponent.prototype.webDelete = function(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ method: req.method }));
};

SecuredComponent.prototype.webAny = function(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ method: req.method }));
};

if (global.TESTING_B4) return; // When 'requiring' the module above,
// don't run the tests below
//.............

var expect = require('expect.js');

var mesh;
var Mesh = require('../../../lib/mesh');

var adminClient = new Mesh.MeshClient({ secure: true });
var test_id = Date.now() + '_' + require('shortid').generate();
var async = require('async');
var wait = require('await-delay');
describe(
  require('../../__fixtures/utils/test_helper')
    .create()
    .testName(__filename, 3),
  function() {
    this.timeout(120000);

    before(function(done) {
      global.TESTING_B4 = true; //.............

      mesh = this.mesh = new Mesh();

      mesh.initialize(
        {
          name: 'b4_permissions_translation',
          happn: {
            secure: true,
            adminPassword: test_id
          },
          modules: {
            SecuredComponent: {
              path: __filename
            }
          },
          components: {
            SecuredComponent: {
              moduleName: 'SecuredComponent',
              schema: {
                exclusive: false,
                methods: {}
              },
              web: {
                routes: {
                  Web: ['webGetPutPost'],
                  WebDelete: ['webDelete'],
                  WebAny: ['webAny']
                }
              }
            }
          }
        },
        function(err) {
          if (err) return done(err);

          mesh.start(function(err) {
            if (err) {
              // console.log(err.stack);
              return done(err);
            }

            // Credentials for the login method
            var credentials = {
              username: '_ADMIN', // pending
              password: test_id
            };

            adminClient
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
      delete global.TESTING_B4; //.............
      mesh.stop({ reconnect: false }, done);
    });

    it("we add a test user that has permissions to access some of the ProtectedComponent events, subscribe on a nested-path ('**'), we test that this works", async () => {
      var testUserClient;

      var testUser = {
        username: 'B4_TESTGROUP_EVENT_ALLOWED_ONE_' + test_id,
        password: 'TEST PWD',
        custom_data: {
          something: 'useful'
        },

        permissions: {
          methods: {},
          events: {
            '/b4_permissions_translation/SecuredComponent/event-3a': {
              authorized: true,
              description: 'a test method'
            },
            '/b4_permissions_translation/SecuredComponent/event-2a': {
              authorized: true,
              description: 'a test method2'
            }
          }
        }
      };

      let result = await adminClient.exchange.security.addUser(testUser);
      expect(result.username).to.be(testUser.username);
      testUserClient = new Mesh.MeshClient({ secure: true });
      await testUserClient.login(testUser);
      let receivedEvents = [];
      await testUserClient.event.b4_permissions_translation.SecuredComponent.on('**', message => {
        receivedEvents.push(message.value);
      });
      for (let eventName of ['event-1a', 'event-2a', 'event-3a']) {
        await adminClient.exchange.b4_permissions_translation.SecuredComponent.fireEvent(eventName);
      }
      await wait(1000);
      expect(receivedEvents).to.eql(['event-2a', 'event-3a']);
    });

    it('we add a test user that has permissions to access some of the ProtectedComponent events, we test that this works', async () => {
      var testUserClient;

      var testUser = {
        username: 'B4_TESTGROUP_EVENT_ALLOWED_TWO_' + test_id,
        password: 'TEST PWD',
        custom_data: {
          something: 'useful'
        },

        permissions: {
          methods: {},
          events: {
            '/b4_permissions_translation/SecuredComponent/event-3b': {
              authorized: true,
              description: 'a test method'
            },
            '/b4_permissions_translation/SecuredComponent/event-2b': {
              authorized: true,
              description: 'a test method2'
            },
            '/b4_permissions_translation/SecuredComponent/sub-path/sub-event-2b': {
              authorized: true,
              description: 'a test method2'
            }
          }
        }
      };

      let result = await adminClient.exchange.security.addUser(testUser);
      expect(result.username).to.be(testUser.username);
      testUserClient = new Mesh.MeshClient({ secure: true });
      await testUserClient.login(testUser);
      let receivedEvents = [];
      await testUserClient.event.b4_permissions_translation.SecuredComponent.on('**', message => {
        receivedEvents.push(message.value);
      });
      for (let eventName of [
        'event-1b',
        'event-2b',
        'event-3b',
        'sub-path/sub-event-1b',
        'sub-path/sub-event-2b'
      ]) {
        await adminClient.exchange.b4_permissions_translation.SecuredComponent.fireEvent(eventName);
      }
      await wait(1000);
      expect(receivedEvents).to.eql(['event-2b', 'event-3b', 'sub-path/sub-event-2b']);
      console.log(receivedEvents);
    });

    it("subscription on '**' will be unauthorized if we have no permissions to any subpaths", async () => {
      var testUserClient;

      var testUser = {
        username: 'B4_TESTGROUP_EVENT_ALLOWED_THREE_' + test_id,
        password: 'TEST PWD',
        custom_data: {
          something: 'useful'
        },

        permissions: {
          methods: {},
          events: {}
        }
      };

      let result = await adminClient.exchange.security.addUser(testUser);
      expect(result.username).to.be(testUser.username);
      testUserClient = new Mesh.MeshClient({ secure: true });
      await testUserClient.login(testUser);
      let receivedEvents = [];
      try {
        await testUserClient.event.b4_permissions_translation.SecuredComponent.on('**', message => {
          receivedEvents.push(message.value);
        });
      } catch (e) {
        expect(e.toString()).to.eql('AccessDenied: unauthorized');
      }      
    });

    it("adding permissions with subscription on '**'", async () => {
      var testUserClient;

      var testUser = {
        username: 'B4_TESTGROUP_EVENT_ALLOWED_FOUR_' + test_id,
        password: 'TEST PWD',
        custom_data: {
          something: 'useful'
        },

        permissions: {
          methods: {},
          events: {
            '/b4_permissions_translation/SecuredComponent/someEventNotFired': {
              authorized: true,
              description: 'a test method2'
            }
          }
        }
      };

      let result = await adminClient.exchange.security.addUser(testUser);
      expect(result.username).to.be(testUser.username);
      testUserClient = new Mesh.MeshClient({ secure: true });
      await testUserClient.login(testUser);
      let receivedEvents = [];

      await testUserClient.event.b4_permissions_translation.SecuredComponent.on('**', message => {
        receivedEvents.push(message.value);
      });
      for (let eventName of [
        'event-1c',
        'event-2c',
        'event-3c',
        'sub-path/sub-event-1c',
        'sub-path/sub-event-2c'
      ]) {
        await adminClient.exchange.b4_permissions_translation.SecuredComponent.fireEvent(eventName);
      }
      await wait(1000);
      expect(receivedEvents).to.eql([]);
      await adminClient.exchange.security.addUserPermissions(
        'B4_TESTGROUP_EVENT_ALLOWED_FOUR_' + test_id,
        {
          events: {
            '/b4_permissions_translation/SecuredComponent/event-2c': {
              authorized: true,
              description: 'a test method2'
            },
            '/b4_permissions_translation/SecuredComponent/sub-path/sub-event-2c': {
              authorized: true,
              description: 'a test method2'
            }
          }
        }
      );
      await wait(1000);
      for (let eventName of [
        'event-1c',
        'event-2c',
        'event-3c',
        'sub-path/sub-event-1c',
        'sub-path/sub-event-2c'
      ]) {
        await adminClient.exchange.b4_permissions_translation.SecuredComponent.fireEvent(eventName);
      }
      await wait(1000);
      expect(receivedEvents).to.eql(['event-2c', 'sub-path/sub-event-2c']);
      await adminClient.exchange.security.removeUserPermissions(
        'B4_TESTGROUP_EVENT_ALLOWED_FOUR_' + test_id,
        {
          events: {
            '/b4_permissions_translation/SecuredComponent/event-2c': {},
            '/b4_permissions_translation/SecuredComponent/sub-path/sub-event-2c': {}
          }
        }
      );
      receivedEvents = [];
      await wait(1000);
      for (let eventName of [
        'event-1c',
        'event-2c',
        'event-3c',
        'sub-path/sub-event-1c',
        'sub-path/sub-event-2c'
      ]) {
        await adminClient.exchange.b4_permissions_translation.SecuredComponent.fireEvent(eventName);
      }
      await wait(1000);
      expect(receivedEvents).to.eql([]);
    });

    it("Removing permissions with subscription on '**'", async () => {
      var testUserClient;

      var testUser = {
        username: 'B4_TESTGROUP_EVENT_ALLOWED_FIVE_' + test_id,
        password: 'TEST PWD',
        custom_data: {
          something: 'useful'
        },

        permissions: {
          methods: {},
          events: {
            '/b4_permissions_translation/SecuredComponent/someEventNotFired': {
              authorized: true,
              description: 'a test method2'
            },
            '/b4_permissions_translation/SecuredComponent/event-1c': {
              authorized: true,
              description: 'a test method2'
            },
            '/b4_permissions_translation/SecuredComponent/event-2c': {
              authorized: true,
              description: 'a test method2'
            },
            '/b4_permissions_translation/SecuredComponent/event-3c': {
              authorized: true,
              description: 'a test method2'
            },
            '/b4_permissions_translation/SecuredComponent/sub-path/sub-event-1c': {
              authorized: true,
              description: 'a test method2'
            },
            '/b4_permissions_translation/SecuredComponent/sub-path/sub-event-2c': {
              authorized: true,
              description: 'a test method2'
            }
          }
        }
      };

      let result = await adminClient.exchange.security.addUser(testUser);
      expect(result.username).to.be(testUser.username);
      testUserClient = new Mesh.MeshClient({ secure: true });
      await testUserClient.login(testUser);
      let receivedEvents = [];

      await testUserClient.event.b4_permissions_translation.SecuredComponent.on('**', message => {
        receivedEvents.push(message.value);
      });
      let testEvents = [
        'event-1c',
        'event-2c',
        'event-3c',
        'sub-path/sub-event-1c',
        'sub-path/sub-event-2c'
      ];
      for (let eventName of testEvents) {
        await adminClient.exchange.b4_permissions_translation.SecuredComponent.fireEvent(eventName);
      }
      await wait(1000);
      expect(receivedEvents).to.eql(testEvents);
      await adminClient.exchange.security.removeUserPermissions(
        'B4_TESTGROUP_EVENT_ALLOWED_FIVE_' + test_id,
        {
          events: {
            '/b4_permissions_translation/SecuredComponent/event-3c': {},
            '/b4_permissions_translation/SecuredComponent/sub-path/sub-event-2c': {}
          }
        }
      );
      await wait(1000);
      receivedEvents = [];
      for (let eventName of testEvents) {
        await adminClient.exchange.b4_permissions_translation.SecuredComponent.fireEvent(eventName);
      }
      await wait(1000);
      console.log(receivedEvents);
      expect(receivedEvents).to.eql(['event-1c', 'event-2c', 'sub-path/sub-event-1c']);
      receivedEvents = [];
      await adminClient.exchange.security.addUserPermissions(
        'B4_TESTGROUP_EVENT_ALLOWED_FIVE_' + test_id,
        {
          events: {
            '/b4_permissions_translation/SecuredComponent/event-3c': {
              authorized: true,
              description: 'a test method2'
            },
            '/b4_permissions_translation/SecuredComponent/sub-path/sub-event-2c': {
              authorized: true,
              description: 'a test method2'
            }
          }
        }
      );
      await wait(1000);
      for (let eventName of testEvents) {
        await adminClient.exchange.b4_permissions_translation.SecuredComponent.fireEvent(eventName);
      }
      await wait(1000);
      expect(receivedEvents).to.eql(testEvents);
    });
  }
);
