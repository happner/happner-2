const test = require('../../__fixtures/utils/test_helper').create();
describe(test.testName(__filename, 3), function() {
  const Happner = require('../../..');
  let server, testClient;
  const adminClient = new Happner.MeshClient({ secure: true });
  this.timeout(120000);

  before(startsServer);
  before(connectsAdminClient);
  before(createsTestUser);
  beforeEach(connectsTestUser);
  afterEach(disconnectsTestUser);

  after(async () => {
    if (server) await server.stop({ reconnect: false });
  });

  it('can check isAuthorized methods', async () => {
    test
      .expect(await testClient.exchange.component.isMethodAuthorized('component', 'method1'))
      .to.eql({
        authorized: true,
        forbidden: []
      });
    test
      .expect(
        await testClient.exchange.component.isMethodAuthorized('component', 'methodForbidden')
      )
      .to.eql({
        authorized: false,
        forbidden: [
          {
            authorized: false,
            path: '/_exchange/requests/MESH_NAME/component/methodForbidden',
            action: 'set'
          }
        ]
      });
    test
      .expect(
        await testClient.exchange.component.isMethodAuthorized(
          'component',
          'methodExpresslyForbidden'
        )
      )
      .to.eql({
        authorized: false,
        forbidden: [
          {
            authorized: false,
            path: '/_exchange/requests/MESH_NAME/component/methodExpresslyForbidden',
            action: 'set'
          }
        ]
      });
  });

  it('can check isAuthorized data', async () => {
    test
      .expect(await testClient.exchange.component.isDataAuthorized('test/data/get/1', ['get']))
      .to.eql({
        authorized: true,
        forbidden: []
      });
    test
      .expect(
        await testClient.exchange.component.isDataAuthorized('test/data/get/1', ['get', 'set'])
      )
      .to.eql({
        authorized: false,
        forbidden: [
          {
            authorized: false,
            path: 'test/data/get/1',
            action: 'set'
          }
        ]
      });
    test
      .expect(
        await testClient.exchange.component.isDataAuthorized('test/data/testUser/get/1', ['get'])
      )
      .to.eql({
        authorized: true,
        forbidden: []
      });

    test
      .expect(
        await testClient.exchange.component.isDataAuthorized('test/data/testUser/get/1', [
          'get',
          'set'
        ])
      )
      .to.eql({
        authorized: false,
        forbidden: [
          {
            authorized: false,
            path: 'test/data/testUser/get/1',
            action: 'set'
          }
        ]
      });
  });

  it('can check isAuthorized event', async () => {
    test
      .expect(await testClient.exchange.component.isEventAuthorized('component', 'test/1'))
      .to.eql({
        authorized: true,
        forbidden: []
      });
    test
      .expect(await testClient.exchange.component.isEventAuthorized('component', 'forbidden/1'))
      .to.eql({
        authorized: false,
        forbidden: [
          { authorized: false, path: '/_events/MESH_NAME/component/forbidden/1', action: 'on' }
        ]
      });
    test
      .expect(await testClient.exchange.component.isEventAuthorized('component', 'testUser/*'))
      .to.eql({
        authorized: true,
        forbidden: []
      });
  });

  it('can check isAuthorized combination', async () => {
    test
      .expect(
        await testClient.exchange.component.isCombinationAuthorized({
          methods: [`MESH_NAME/component/method1`, `MESH_NAME/component/method2`],
          events: [`MESH_NAME/component/test/*`, `MESH_NAME/component/test/testUser/*`],
          data: {
            'test/data/get/*': { actions: ['get'] },
            'test/data/set/*': { actions: ['set'] },
            'test/data/on/*': { actions: ['on'] },
            'test/data/testUser/get/*': { actions: ['get'] }
          }
        })
      )
      .to.eql({
        authorized: true,
        forbidden: []
      });
    test
      .expect(
        await testClient.exchange.component.isCombinationAuthorized({
          methods: [`MESH_NAME/component/method1`, `MESH_NAME/component/forbidden`],
          events: [`MESH_NAME/component/test/*`, `MESH_NAME/component/forbidden/*`],
          data: {
            'test/data/get/*': { actions: ['get'] },
            'test/data/set/*': { actions: ['set'] },
            'test/data/forbidden/*': { actions: ['on'] },
            'test/data/testUser/get/*': { actions: ['get'] },
            'test/data/partly/authorized': { actions: ['get'] }
          }
        })
      )
      .to.eql({
        authorized: false,
        forbidden: [
          {
            authorized: false,
            path: '/_exchange/requests/MESH_NAME/component/forbidden',
            action: 'set'
          },
          { authorized: false, path: 'test/data/forbidden/*', action: 'on' },
          { authorized: false, path: 'test/data/partly/authorized', action: 'get' },
          { authorized: false, path: '/_events/MESH_NAME/component/forbidden/*', action: 'on' }
        ]
      });
  });

  it('it can check lookup tables', async () => {
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
    await adminClient.exchange.security.upsertLookupTable(testTable);
    await adminClient.exchange.security.upsertLookupPermission('testUser_group', permission1);
    await testClient.data.get('/_data/historianStore/SPECIAL_DEVICE_ID_1');
    test
      .expect(
        await testClient.exchange.component.isCombinationAuthorized({
          data: {
            'test/data/get/*': { actions: ['get'] },
            'test/data/set/*': { actions: ['set'] },
            'test/data/on/*': { actions: ['on'] },
            'test/data/testUser/get/*': { actions: ['get'] },
            '/_data/historianStore/SPECIAL_DEVICE_ID_1': { actions: ['get'] }
          }
        })
      )
      .to.eql({
        authorized: true,
        forbidden: []
      });
  });

  it('validate paths actions and username', async () => {
    try {
      await testClient.exchange.component.isCombinationAuthorized({});
    } catch (e) {
      test
        .expect(e.message)
        .to.be('unable to find paths and actions for authorization check, username: testUser');
    }
    try {
      await testClient.exchange.component.isCombinationAuthorized();
    } catch (e) {
      test
        .expect(e.message)
        .to.be('failed authorization check, permissions query is null or not an object');
    }
    try {
      await testClient.exchange.component.isCombinationAuthorized({}, {});
    } catch (e) {
      test.expect(e.message).to.be('failed authorization check, username null or not a string');
    }
  });

  async function startsServer() {
    server = await Happner.create({
      name: 'MESH_NAME',
      secure: true,
      modules: {
        component: {
          instance: {
            isMethodAuthorized: async function($happn, $origin, component, method, username) {
              return await $happn.isAuthorized(username || $origin.username, {
                methods: [`MESH_NAME/${component}/${method}`]
              });
            },
            isEventAuthorized: async function($happn, $origin, component, event, username) {
              return await $happn.isAuthorized(username || $origin.username, {
                events: [`MESH_NAME/${component}/${event}`]
              });
            },
            isDataAuthorized: async function($happn, $origin, path, actions, username) {
              return await $happn.isAuthorized(username || $origin.username, {
                data: {
                  [path]: { actions }
                }
              });
            },
            isCombinationAuthorized: async function($happn, $origin, combination, username) {
              return await $happn.isAuthorized(username || $origin.username, combination);
            },
            method1: function($happn, data, callback) {
              $happn.emit('method1', { data });
              callback();
            },
            method2: async function($happn, data) {
              $happn.emit('method2', { data });
              callback();
            },
            method3: function($happn, data) {
              return new Promise((resolve, reject) => {
                if (data.raiseError) {
                  return reject(new Error(data.raiseError));
                }
                $happn.emit('method3', { data });
                resolve();
              });
            },
            methodForbidden: async function() {
              throw new Error('unexpected operation...');
            },
            methodExpresslyForbidden: async function() {
              throw new Error('unexpected operation...');
            }
          }
        }
      },
      components: {
        component: {}
      }
    });
  }

  async function connectsAdminClient() {
    await adminClient.login({
      username: '_ADMIN', // pending
      password: 'happn'
    });
  }

  async function createsTestUser() {
    await test.users.add(
      server,
      'testUser',
      'xxx',
      {
        methods: {
          '/MESH_NAME/component/method1': { authorized: true },
          '/MESH_NAME/component/method2': { authorized: true },
          '/MESH_NAME/component/method3': { authorized: true },
          '/MESH_NAME/component/isMethodAuthorized': { authorized: true },
          '/MESH_NAME/component/isDataAuthorized': { authorized: true },
          '/MESH_NAME/component/isEventAuthorized': { authorized: true },
          '/MESH_NAME/component/isCombinationAuthorized': { authorized: true },
          '/MESH_NAME/component/methodExpresslyForbidden': { authorized: false }
        },
        events: {
          '/MESH_NAME/component/test/*': { authorized: true },
          '/MESH_NAME/component/{{user.username}}/*': { authorized: true }
        },
        data: {
          'test/data/get/*': { actions: ['get'] },
          'test/data/set/*': { actions: ['set'] },
          'test/data/remove/*': { actions: ['remove'] },
          'test/data/on/*': { actions: ['on'] },
          'test/data/all/*': { actions: ['*'] },
          'test/data/{{user.username}}/get/*': { actions: ['get'] },
          'test/data/partly/authorized': { authorized: false, actions: ['get'] }
        }
      },
      { company: 'COMPANY_ABC', oem: 'OEM_ABC' }
    );
  }
  async function connectsTestUser() {
    testClient = new Happner.MeshClient();

    await testClient.login({
      username: 'testUser',
      password: 'xxx'
    });
  }
  async function disconnectsTestUser() {
    if (testClient) await testClient.disconnect();
  }
});
