module.exports = TestMesh;

function TestMesh() {}

TestMesh.prototype.method1 = function($happn, options, callback) {
  options.methodName = 'method1';
  callback(null, options);
};

if (global.TESTING_USER_MANAGEMENT) return; // When 'requiring' the module above,
const test = require('../../__fixtures/utils/test_helper').create();
describe(test.testName(__filename, 3), function() {
  this.timeout(120000);
  let mesh;
  let Mesh = require('../../../lib/mesh');

  const adminClient = new Mesh.MeshClient({ secure: true, port: 8003 });
  const test_id = Date.now() + '_' + require('shortid').generate();

  before(async () => {
    global.TESTING_USER_MANAGEMENT = true; //.............
    await startMesh();
  });

  after(async () => {
    delete global.TESTING_USER_MANAGEMENT; //.............
    if (adminClient) adminClient.disconnect();
    await mesh.stop({ reconnect: false });
  });

  it('adds a test user, logs in with the test user - ensures we are not able to modify custom data, due to the allowOwnCustomDataUpdates setting: false, checks the admin user can still modify custom_data', async () => {
    let testGroup = {
      name: 'TESTGROUP2' + test_id,

      custom_data: {
        customString: 'custom1',
        customNumber: 0
      },

      permissions: {
        methods: {}
      }
    };

    let testGroupSaved;
    let testUserSaved;
    let testUserClient;

    testGroupSaved = await adminClient.exchange.security.addGroup(testGroup);
    const testUser = {
      username: 'TESTUSER2' + test_id,
      password: 'TEST PWD',
      custom_data: {
        something: 'unchanged'
      }
    };
    testUserSaved = await adminClient.exchange.security.addUser(testUser);
    await adminClient.exchange.security.linkGroup(testGroupSaved, testUserSaved);

    testUserClient = new Mesh.MeshClient({ secure: true, port: 8003 });
    await testUserClient.login(testUser);
    testUser.oldPassword = 'TEST PWD';
    testUser.password = 'NEW PWD';
    testUser.custom_data = { something: 'changed' };

    await testUserClient.exchange.security.updateOwnUser(testUser);
    const updated = await adminClient.exchange.security.getUser(testUser.username);
    test.expect(updated.custom_data.something).to.be('unchanged');

    await adminClient.exchange.security.updateUser({
      username: 'TESTUSER2' + test_id,
      custom_data: {
        something: 'changed'
      }
    });

    const updatedByAdmin = await adminClient.exchange.security.getUser(testUser.username);
    test.expect(updatedByAdmin.custom_data.something).to.be('changed');
  });

  async function startMesh() {
    mesh = await Mesh.create({
      name: 'user-management',
      happn: {
        secure: true,
        adminPassword: test_id,
        port: 8003
      },
      modules: {
        TestMesh: {
          path: __filename
        }
      },
      components: {
        security: {
          allowOwnCustomDataUpdates: false
        },
        TestMesh: {
          moduleName: 'TestMesh',
          schema: {
            exclusive: false,
            methods: {}
          }
        }
      }
    });
    await adminClient.login({
      username: '_ADMIN', // pending
      password: test_id
    });
  }
});
