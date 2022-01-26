var expect = require('expect.js');

var mesh;
var Mesh = require('../../..');

var adminClient = new Mesh.MeshClient({ secure: true });
var test_id = Date.now() + '_' + require('shortid').generate();
const test = require('../../__fixtures/utils/test_helper').create();
describe(test.testName(__filename, 3), function() {
  this.timeout(120000);
  let testUser, testUserSaved;
  let testGroupSaved;
  before(async () => {
    global.TESTING_B4 = true; //.............

    mesh = this.mesh = new Mesh();

    await mesh.initialize({
      name: 'b4_lookup_tables',
      happn: {
        secure: true,
        adminPassword: test_id
      },
      modules: {
        component: {
          instance: {
            method: async function(suffix, $happn) {
              $happn.emit('current/device1/point1', `something ${suffix}`);
            }
          }
        }
      },
      components: {
        data: {},
        component: {}
      }
    });
    await mesh.start();
    await adminClient.login({
      username: '_ADMIN', // pending
      password: test_id
    });
  });

  before('Add a test user and group', async () => {
    testUser = {
      username: 'LOOKUP_TABLES_USER_' + test_id,
      password: 'TEST PWD',
      custom_data: { company: 'COMPANY_ABC', oem: 'OEM_ABC' }
    };

    testUserSaved = await adminClient.exchange.security.addUser(testUser);

    let testGroup = {
      name: 'LOOKUP_TABLES_GRP_' + test_id,
      permissions: {}
    };
    testGroupSaved = await adminClient.exchange.security.addGroup(testGroup);

    let happnerTestGroup = await adminClient.exchange.security.addGroup({
      name: 'LOOKUP_TABLES_HAPPNER_GRP_' + test_id,
      permissions: {}
    });
    await adminClient.exchange.security.linkGroup(happnerTestGroup, testUserSaved);
  });

  after(function(done) {
    delete global.TESTING_B4; //.............
    mesh.stop({ reconnect: false }, done);
  });

  async function startClient(userDetails) {
    let client = new Mesh.MeshClient({ secure: true });
    await client.login(userDetails);
    return client;
  }

  it('can upsert, fetch and delete a lookup table', async () => {
    let table1 = {
      name: 'STANDARD_ABC',
      paths: [
        'device/OEM_ABC/COMPANY_ABC/SPECIAL_DEVICE_ID_1',
        'device/OEM_ABC/COMPANY_ABC/SPECIAL_DEVICE_ID_2'
      ]
    };
    await adminClient.exchange.security.upsertLookupTable(table1);
    let storedTable = await adminClient.exchange.security.fetchLookupTable(table1.name);
    expect(storedTable).to.eql(table1);
    await adminClient.exchange.security.deleteLookupTable(table1.name);
    storedTable = await adminClient.exchange.security.fetchLookupTable(table1.name);
    expect(storedTable).to.eql({ name: table1.name, paths: [] });
  });

  it('can upsert, fetch and remove paths from a lookup table', async () => {
    await adminClient.exchange.security.insertLookupPath('pathTable', '/1/2/3'); //creates 'pathTable'
    let storedTable = await adminClient.exchange.security.fetchLookupTable('pathTable');
    expect(storedTable).to.eql({ name: 'pathTable', paths: ['1/2/3'] });

    await adminClient.exchange.security.insertLookupPath('pathTable', '4/5/6');
    storedTable = await adminClient.exchange.security.fetchLookupTable('pathTable');
    expect(storedTable).to.eql({ name: 'pathTable', paths: ['1/2/3', '4/5/6'] });

    await adminClient.exchange.security.removeLookupPath('pathTable', '1/2/3');
    storedTable = await adminClient.exchange.security.fetchLookupTable('pathTable');
    expect(storedTable).to.eql({ name: 'pathTable', paths: ['4/5/6'] });

    await adminClient.exchange.security.removeLookupPath('pathTable', '/4/5/6');
    storedTable = await adminClient.exchange.security.fetchLookupTable('pathTable');
    expect(storedTable).to.eql({ name: 'pathTable', paths: [] });
  });

  it('can upsert, fetch and remove lookup permissions', async () => {
    let permission1 = {
      regex: '^/_data/historianStore/(.*)',
      actions: ['on'],
      table: 'TABLE1',
      path: '/device/{{user.custom_data.oem}}/{{user.custom_data.companies}}/{{$1}}'
    };
    let permission2 = {
      regex: '^/_data/historianStore/device1/(.*)',
      actions: ['get'],
      table: 'TABLE1',
      path: '/device/blah/blah/{{$1}}'
    };
    await adminClient.exchange.security.upsertLookupPermission('permissionGroup', permission1);
    let storedPermissions = await adminClient.exchange.security.fetchLookupPermissions(
      'permissionGroup'
    );
    expect(storedPermissions).to.eql([permission1]);

    await adminClient.exchange.security.upsertLookupPermission('permissionGroup', permission2);
    storedPermissions = await adminClient.exchange.security.fetchLookupPermissions(
      'permissionGroup'
    );
    expect(storedPermissions).to.eql([permission1, permission2]);

    await adminClient.exchange.security.removeLookupPermission('permissionGroup', permission1);
    storedPermissions = await adminClient.exchange.security.fetchLookupPermissions(
      'permissionGroup'
    );
    expect(storedPermissions).to.eql([permission2]);

    await adminClient.exchange.security.removeLookupPermission('permissionGroup', permission2);
    storedPermissions = await adminClient.exchange.security.fetchLookupPermissions(
      'permissionGroup'
    );
    expect(storedPermissions).to.eql([]);
  });

  it('can upsert, fetch and remove happner lookup permissions', async () => {
    await adminClient.exchange.security.upsertLookupTable({
      name: 'HAPPNER_LOOKUP',
      paths: ['/device/OEM_ABC/COMPANY_ABC', '/device/OEM_ABC/COMPANY_ABC/device1']
    });

    //event
    let eventPermission = {
      component: 'component',
      event: 'current/([^/]*)/.*',
      table: 'HAPPNER_LOOKUP',
      path: '/device/{{user.custom_data.oem}}/{{user.custom_data.company}}/{{$1}}'
    };
    //method
    let methodRequestPermission = {
      component: 'component',
      method: 'method',
      table: 'HAPPNER_LOOKUP',
      path: '/device/{{user.custom_data.oem}}/{{user.custom_data.company}}'
    };

    await adminClient.exchange.security.upsertEventLookupPermission(
      'LOOKUP_TABLES_HAPPNER_GRP_' + test_id,
      eventPermission
    );

    await adminClient.exchange.security.upsertExchangeLookupPermission(
      'LOOKUP_TABLES_HAPPNER_GRP_' + test_id,
      methodRequestPermission
    );

    let testClient = await startClient(testUser);
    let eventData;

    await testClient.event.component.on('current/device1/*', data => {
      eventData = data;
    });

    await testClient.exchange.component.method('initial');
    await test.delay(500);

    test.expect(eventData).to.eql({ value: 'something initial' });

    await adminClient.exchange.security.removeExchangeLookupPermission(
      'LOOKUP_TABLES_HAPPNER_GRP_' + test_id,
      methodRequestPermission
    );

    test
      .expect(
        await test.tryAsyncMethod(async () => {
          await testClient.exchange.component.method();
        })
      )
      .to.be('unauthorized');

    // add method permission back
    await adminClient.exchange.security.upsertExchangeLookupPermission(
      'LOOKUP_TABLES_HAPPNER_GRP_' + test_id,
      methodRequestPermission
    );

    await adminClient.exchange.security.removeEventLookupPermission(
      'LOOKUP_TABLES_HAPPNER_GRP_' + test_id,
      eventPermission
    );

    await testClient.disconnect();
    testClient = await startClient(testUser);

    test
      .expect(
        await test.tryAsyncMethod(async () => {
          await testClient.event.component.on('current/device1/*', data => {
            eventData = data;
          });
        })
      )
      .to.be('unauthorized');

    await adminClient.exchange.security.upsertEventLookupPermission(
      'LOOKUP_TABLES_HAPPNER_GRP_' + test_id,
      eventPermission
    );

    await testClient.event.component.on('current/device1/*', data => {
      eventData = data;
    });

    await testClient.exchange.component.method('else');
    await test.delay(500);

    test.expect(eventData).to.eql({ value: 'something else' });
  });

  it('can unlink a lookup table from a group (removes all permissions that reference that table) lookup permissions', async () => {
    let permission1 = {
      regex: '^/_data/historianStore/(.*)',
      actions: ['on'],
      table: 'TABLE1',
      path: '/device/{{user.custom_data.oem}}/{{user.custom_data.companies}}/{{$1}}'
    };
    let permission2 = {
      regex: '^/_data/historianStore/device1/(.*)',
      actions: ['get'],
      table: 'TABLE1',
      path: '/device/blah/blah/{{$1}}'
    };
    let permission3 = {
      regex: '^/_data/historianStore/device1/(.*)',
      actions: ['get'],
      table: 'Z - A DIFFERENT TABLE', //For sorting of results
      path: '/device/blah/blah/{{$1}}'
    };
    await adminClient.exchange.security.upsertLookupPermission('unlinkGroup', permission1);
    await adminClient.exchange.security.upsertLookupPermission('unlinkGroup', permission2);
    await adminClient.exchange.security.upsertLookupPermission('unlinkGroup', permission3);
    let storedPermissions = await adminClient.exchange.security.fetchLookupPermissions(
      'unlinkGroup'
    );
    expect(storedPermissions).to.eql([permission1, permission2, permission3]);
    await adminClient.exchange.security.unlinkLookupTable('unlinkGroup', 'TABLE1');
    storedPermissions = await adminClient.exchange.security.fetchLookupPermissions('unlinkGroup');
    expect(storedPermissions).to.eql([permission3]);
  });

  it('can fetch data if lookup tables and permissions are configured correctly', async () => {
    let testTable = {
      name: 'STANDARD_ABC',
      paths: [
        'device/OEM_ABC/COMPANY_ABC/SPECIAL_DEVICE_ID_1',
        'device/OEM_ABC/COMPANY_ABC/SPECIAL_DEVICE_ID_2'
      ]
    };
    let permission1 = {
      regex: '^/_data/historianStore/(.*)',
      actions: ['get', 'set'],
      table: 'STANDARD_ABC',
      path: '/device/{{user.custom_data.oem}}/{{user.custom_data.company}}/{{$1}}'
    };
    await adminClient.data.set('/_data/historianStore/SPECIAL_DEVICE_ID_1', {
      test: 'data'
    });
    await adminClient.exchange.security.upsertLookupTable(testTable);
    await adminClient.exchange.security.upsertLookupPermission(testGroupSaved.name, permission1);
    let testClient = await startClient(testUser);
    try {
      let data = await testClient.data.get('/_data/historianStore/SPECIAL_DEVICE_ID_1');
      if (data) throw new Error('Test Error : Should not be authorized');
    } catch (e) {
      expect(e.toString()).to.be('AccessDenied: unauthorized');
    }

    await adminClient.exchange.security.linkGroup(testGroupSaved, testUserSaved);
    let data = await testClient.data.get('/_data/historianStore/SPECIAL_DEVICE_ID_1');

    await adminClient.exchange.security.removeLookupPath(
      'STANDARD_ABC',
      'device/OEM_ABC/COMPANY_ABC/SPECIAL_DEVICE_ID_1'
    );
    try {
      data = await testClient.data.get('/_data/historianStore/SPECIAL_DEVICE_ID_1');
      if (data) throw new Error('Test Error : Should not be authorized');
    } catch (e) {
      expect(e.toString()).to.be('AccessDenied: unauthorized');
    }
    await testClient.disconnect();
  });
});
