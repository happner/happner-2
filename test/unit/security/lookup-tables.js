var expect = require('expect.js');

var mesh;
var Mesh = require('../../..');

var adminClient = new Mesh.MeshClient({ secure: true });
var test_id = Date.now() + '_' + require('shortid').generate();
var async = require('async');

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
          name: 'b4_lookup_tables',
          happn: {
            secure: true,
            adminPassword: test_id
          },
          modules: {},
          components: {
            data: {}
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

    before('Add a test user and group', done => {
      var testUserClient;

      var testUser = {
        username: 'LOOKUP_TABLES_USER_' + test_id,
        password: 'TEST PWD'
      }

      await adminClient.exchange.security.addUser(testUser);
      
      var testGroup = {
        name: 'LOOKUP_TABLES_GROUP_' + test_id,
        permissions: {
        }
      };
      await adminClient.exchange.security.addGroup(testGroup)
      adminClient.exchange.security.linkGroup(testGroupSaved, testUserSaved)
    });
    after(function(done) {
      delete global.TESTING_B4; //.............
      mesh.stop({ reconnect: false }, done);
    });
  }
);
