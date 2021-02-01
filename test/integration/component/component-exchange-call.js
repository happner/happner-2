const tests = require('../../__fixtures/utils/test_helper').create();
describe(tests.testName(__filename, 3), function() {
  this.timeout(5000);
  const Happner = require('../../..');
  const clientAdmin = new Happner.MeshClient({});
  const clientTest = new Happner.MeshClient({});
  let server;

  const Module = {
    exec: async function($happn) {
      return await $happn.exchange.$call({
        mesh: undefined,
        component: 'component1',
        method: 'exec',
        arguments: [1, 2]
      });
    },
    execAsAdmin: async function($happn) {
      return await $happn.asAdmin.exchange.$call({
        mesh: undefined,
        component: 'component1',
        method: 'exec',
        arguments: [1, 2]
      });
    }
  };

  const Module1 = {
    exec: function($happn, argument1, argument2) {
      return new Promise(resolve => {
        const result = argument1 + argument2;
        $happn.emit('test/event', { result });
        return resolve(result);
      });
    }
  };

  before(async () => {
    server = await Happner.create({
      secure: true,
      authorityDelegationOn: true,
      name: 'MESH_NAME',
      modules: {
        component: {
          instance: Module
        },
        component1: {
          instance: Module1
        }
      },
      components: {
        component: {},
        component1: {}
      }
    });
    await setUpTestUser();
    await clientAdmin.login({ username: '_ADMIN', password: 'happn' });
    await clientTest.login({ username: 'test', password: 'test' });
  });

  after(function(done) {
    if (!server) return done();
    if (clientAdmin) clientAdmin.disconnect({ reconnect: false });
    if (clientTest) clientTest.disconnect({ reconnect: false });
    server.stop({ reconnect: false }, done);
  });

  context('server api tests', () => {
    it('we are able to call component methods and listen to events', async () => {
      let results = await callAndListen(
        server,
        {
          component: 'component',
          method: 'exec'
        },
        { component: 'component1', path: 'test/event' }
      );
      tests.expect(results).to.eql({
        event: { result: 3 },
        exec: 3
      });
    });

    it('we are able to call component methods and listen to events, with mesh name', async () => {
      let results = await callAndListen(
        server,
        {
          mesh: 'MESH_NAME',
          component: 'component',
          method: 'exec'
        },
        { mesh: 'MESH_NAME', component: 'component1', path: 'test/event' }
      );
      tests.expect(results).to.eql({
        event: { result: 3 },
        exec: 3
      });
    });

    it('we get errors attempting to access a mesh that does not exist', async () => {
      let errors = await callWithInvalidParameters(
        server,
        {
          mesh: 'MESH_NAME_1',
          component: 'component',
          method: 'exec'
        },
        { mesh: 'MESH_NAME_1', component: 'component1', path: 'test/event' }
      );

      tests
        .expect(errors)
        .to.eql([
          'invalid endpoint options: MESH_NAME_1 mesh does not exist on the api',
          'invalid endpoint options: MESH_NAME_1 mesh does not exist on the api'
        ]);
    });

    it('we get errors attempting to access a component that does not exist on a specified mesh', async () => {
      let errors = await callWithInvalidParameters(
        server,
        {
          mesh: 'MESH_NAME',
          component: 'component3',
          method: 'exec'
        },
        { mesh: 'MESH_NAME', component: 'component3', path: 'test/event' }
      );

      tests
        .expect(errors)
        .to.eql([
          'invalid endpoint options: MESH_NAME.component3 component does not exist on the api',
          'invalid endpoint options: MESH_NAME.component3 component does not exist on the api'
        ]);
    });

    it('we get errors attempting to access a component that does not exist', async () => {
      let errors = await callWithInvalidParameters(
        server,
        {
          component: 'component3',
          method: 'exec'
        },
        { component: 'component3', path: 'test/event' }
      );
      tests
        .expect(errors)
        .to.eql([
          'invalid endpoint options: component3 component does not exist on the api',
          'invalid endpoint options: component3 component does not exist on the api'
        ]);
    });
  });

  context('client tests', () => {
    it('we are able to call component methods and listen to events', async () => {
      let results = await callAndListen(
        clientAdmin,
        {
          component: 'component',
          method: 'exec'
        },
        { component: 'component1', path: 'test/event' }
      );
      tests.expect(results).to.eql({
        event: { result: 3 },
        exec: 3
      });
    });

    it('we are able to call component methods and listen to events, with mesh name', async () => {
      let results = await callAndListen(
        clientAdmin,
        {
          mesh: 'MESH_NAME',
          component: 'component',
          method: 'exec'
        },
        { mesh: 'MESH_NAME', component: 'component1', path: 'test/event' }
      );
      tests.expect(results).to.eql({
        event: { result: 3 },
        exec: 3
      });
    });

    it('we get errors attempting to access a mesh that does not exist', async () => {
      let errors = await callWithInvalidParameters(
        clientAdmin,
        {
          mesh: 'MESH_NAME_1',
          component: 'component',
          method: 'exec'
        },
        { mesh: 'MESH_NAME_1', component: 'component1', path: 'test/event' }
      );

      tests
        .expect(errors)
        .to.eql([
          'invalid endpoint options: MESH_NAME_1 mesh does not exist on the api',
          'invalid endpoint options: MESH_NAME_1 mesh does not exist on the api'
        ]);
    });

    it('we get errors attempting to access a component that does not exist on a specified mesh', async () => {
      let errors = await callWithInvalidParameters(
        clientAdmin,
        {
          mesh: 'MESH_NAME',
          component: 'component3',
          method: 'exec'
        },
        { mesh: 'MESH_NAME', component: 'component3', path: 'test/event' }
      );

      tests
        .expect(errors)
        .to.eql([
          'invalid endpoint options: MESH_NAME.component3 component does not exist on the api',
          'invalid endpoint options: MESH_NAME.component3 component does not exist on the api'
        ]);
    });

    it('we get errors attempting to access a component that does not exist', async () => {
      let errors = await callWithInvalidParameters(
        clientAdmin,
        {
          component: 'component3',
          method: 'exec'
        },
        { component: 'component3', path: 'test/event' }
      );
      tests
        .expect(errors)
        .to.eql([
          'invalid endpoint options: component3 component does not exist on the api',
          'invalid endpoint options: component3 component does not exist on the api'
        ]);
    });
  });

  context('asAdmin tests', () => {
    it('fails to call an edge function that is forbidden by an unauthorized user', async () => {
      let message;
      try {
        await clientTest.exchange.$call({
          component: 'component1',
          method: 'exec'
        });
      } catch (e) {
        message = e.message;
      }
      tests.expect(message).to.be('unauthorized');
    });

    it('fails to call an internal function that is forbidden by an unauthorized user', async () => {
      let message;
      try {
        await clientTest.exchange.$call({
          component: 'component',
          method: 'exec'
        });
      } catch (e) {
        message = e.message;
      }
      tests.expect(message).to.be('unauthorized');
    });

    it('succeeds in calling an internal function that is forbidden by an unauthorized user - through asAdmin', async () => {
      let message, result;
      try {
        result = await clientTest.exchange.$call({
          component: 'component',
          method: 'execAsAdmin'
        });
      } catch (e) {
        message = e.message;
      }
      tests.expect(message).to.be(undefined);
      tests.expect(result).to.be(3);
    });
  });

  async function callWithInvalidParameters(client, callParameters, listenParameters) {
    let errors = [];

    try {
      await client.event.$on(listenParameters, function() {
        //do nothing
      });
    } catch (e) {
      errors.push(e.message);
    }

    try {
      await client.exchange.$call(callParameters);
    } catch (e) {
      errors.push(e.message);
    }
    return errors;
  }

  async function callAndListen(client, callParameters, listenParameters) {
    let results = {};
    await client.event.$on(listenParameters, function(data) {
      results.event = data;
    });
    results.exec = await client.exchange.$call(callParameters);
    await tests.delay(2000);
    return results;
  }

  async function setUpTestUser() {
    const security = server.exchange.security;
    const group = await security.addGroup({
      name: 'group',
      permissions: {
        methods: {
          '/MESH_NAME/component/exec': { authorized: true },
          '/MESH_NAME/component/execAsAdmin': { authorized: true }
        }
      }
    });
    const user = await security.addUser({
      username: 'test',
      password: 'test'
    });
    await security.linkGroup(group, user);
  }
});
