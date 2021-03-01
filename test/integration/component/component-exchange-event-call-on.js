const tests = require('../../__fixtures/utils/test_helper').create();
describe(tests.testName(__filename, 3), function() {
  this.timeout(10000);
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
        },
        component2: {
          path: tests.path.resolve(
            __dirname,
            '../../__fixtures/test/integration/component/component-exchange-event-call-on'
          )
        }
      },
      components: {
        component: {},
        component1: {},
        component2: {}
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

    it('we are able to call component methods and listen to events using $once, with mesh name', async () => {
      let eventCounter = await callAndListenOnce(
        server,
        {
          mesh: 'MESH_NAME',
          component: 'component',
          method: 'exec'
        },
        { mesh: 'MESH_NAME', component: 'component1', path: 'test/event' }
      );
      tests.expect(eventCounter).to.eql(1);
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
          'invalid endpoint options: [MESH_NAME_1] mesh does not exist on the api',
          'invalid endpoint options: [MESH_NAME_1] mesh does not exist on the api'
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
          'invalid endpoint options: [MESH_NAME.component3] component does not exist on the api',
          'invalid endpoint options: [MESH_NAME.component3] component does not exist on the api'
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
          'invalid endpoint options: [component3] component does not exist on the api',
          'invalid endpoint options: [component3] component does not exist on the api'
        ]);
    });

    it('we are able to call component methods and listen to events with an $off, with mesh name', async () => {
      let eventCounter = await callAndListenOff(
        server,
        {
          mesh: 'MESH_NAME',
          component: 'component',
          method: 'exec'
        },
        { mesh: 'MESH_NAME', component: 'component1', path: 'test/event' }
      );
      tests.expect(eventCounter).to.eql(3);
    });

    it('we are able to call component methods and listen to events with an $off, with mesh name - negative test', async () => {
      let eventCounter = await callAndListenOff(
        server,
        {
          mesh: 'MESH_NAME',
          component: 'component',
          method: 'exec'
        },
        { mesh: 'MESH_NAME', component: 'component1', path: 'test/event' },
        true
      );
      tests.expect(eventCounter).to.eql(4);
    });

    it('we are able to call component methods and listen to events with an $offPath, with mesh name', async () => {
      let eventCounter = await callAndListenOffPath(
        server,
        {
          mesh: 'MESH_NAME',
          component: 'component',
          method: 'exec'
        },
        { mesh: 'MESH_NAME', component: 'component1', path: 'test/event' }
      );
      tests.expect(eventCounter).to.eql(2);
    });

    it('we are able to call component methods and listen to events with an $offPath, with mesh name - negative test', async () => {
      let eventCounter = await callAndListenOffPath(
        server,
        {
          mesh: 'MESH_NAME',
          component: 'component',
          method: 'exec'
        },
        { mesh: 'MESH_NAME', component: 'component1', path: 'test/event' },
        true
      );
      tests.expect(eventCounter).to.eql(4);
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

    it('we are able to call component methods and listen to events using $once, with mesh name', async () => {
      let eventCounter = await callAndListenOnce(
        clientAdmin,
        {
          mesh: 'MESH_NAME',
          component: 'component',
          method: 'exec'
        },
        { mesh: 'MESH_NAME', component: 'component1', path: 'test/event' }
      );
      tests.expect(eventCounter).to.eql(1);
    });

    it('we are able to call component methods and listen to events with an $off, with mesh name', async () => {
      let eventCounter = await callAndListenOff(
        clientAdmin,
        {
          mesh: 'MESH_NAME',
          component: 'component',
          method: 'exec'
        },
        { mesh: 'MESH_NAME', component: 'component1', path: 'test/event' }
      );
      tests.expect(eventCounter).to.eql(3);
    });

    it('we are able to call component methods and listen to events with an $off, with mesh name - negative test', async () => {
      let eventCounter = await callAndListenOff(
        clientAdmin,
        {
          mesh: 'MESH_NAME',
          component: 'component',
          method: 'exec'
        },
        { mesh: 'MESH_NAME', component: 'component1', path: 'test/event' },
        true
      );
      tests.expect(eventCounter).to.eql(4);
    });

    it('we are able to call component methods and listen to events with an $offPath, with mesh name', async () => {
      let eventCounter = await callAndListenOffPath(
        clientAdmin,
        {
          mesh: 'MESH_NAME',
          component: 'component',
          method: 'exec'
        },
        { mesh: 'MESH_NAME', component: 'component1', path: 'test/event' }
      );
      tests.expect(eventCounter).to.eql(2);
    });

    it('we are able to call component methods and listen to events with an $offPath, with mesh name - negative test', async () => {
      let eventCounter = await callAndListenOffPath(
        clientAdmin,
        {
          mesh: 'MESH_NAME',
          component: 'component',
          method: 'exec'
        },
        { mesh: 'MESH_NAME', component: 'component1', path: 'test/event' },
        true
      );
      tests.expect(eventCounter).to.eql(4);
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
          'invalid endpoint options: [MESH_NAME_1] mesh does not exist on the api',
          'invalid endpoint options: [MESH_NAME_1] mesh does not exist on the api'
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
          'invalid endpoint options: [MESH_NAME.component3] component does not exist on the api',
          'invalid endpoint options: [MESH_NAME.component3] component does not exist on the api'
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
          'invalid endpoint options: [component3] component does not exist on the api',
          'invalid endpoint options: [component3] component does not exist on the api'
        ]);
    });

    it('we get errors attempting to access a method that does not exist', async () => {
      let errors = await callWithInvalidParameters(
        clientAdmin,
        {
          mesh: 'MESH_NAME',
          component: 'component',
          method: 'unknownMethod'
        },
        { component: 'component', path: 'test/event' }
      );
      tests
        .expect(errors)
        .to.eql([
          'invalid endpoint options: [component.unknownMethod] method does not exist on the api'
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

  context('client tests - using callback', () => {
    it('we are able to call component methods and listen to events - with callback', function(done) {
      callAndListenCallback(
        clientAdmin,
        {
          component: 'component',
          method: 'exec'
        },
        { component: 'component1', path: 'test/event' },
        (e, results) => {
          if (e) return done(e);
          tests.expect(results).to.eql({
            event: { result: 3 },
            exec: 3
          });
          done();
        }
      );
    });

    it('we are able to call component methods and listen to events, with mesh name - with callback', function(done) {
      callAndListenCallback(
        clientAdmin,
        {
          mesh: 'MESH_NAME',
          component: 'component',
          method: 'exec'
        },
        { mesh: 'MESH_NAME', component: 'component1', path: 'test/event' },
        (e, results) => {
          if (e) return done(e);
          tests.expect(results).to.eql({
            event: { result: 3 },
            exec: 3
          });
          done();
        }
      );
    });

    it('we are able to call component methods and listen to events using $once, with mesh name - with callback', function(done) {
      callAndListenOnceCallback(
        clientAdmin,
        {
          mesh: 'MESH_NAME',
          component: 'component',
          method: 'exec'
        },
        { mesh: 'MESH_NAME', component: 'component1', path: 'test/event' },
        (e, results) => {
          if (e) return done(e);
          tests.expect(results).to.eql(1);
          done();
        }
      );
    });

    it('we are able to call component methods and listen to events with an $off, with mesh name - with callback', function(done) {
      callAndListenOffCallback(
        clientAdmin,
        {
          mesh: 'MESH_NAME',
          component: 'component',
          method: 'exec'
        },
        { mesh: 'MESH_NAME', component: 'component1', path: 'test/event' },
        false,
        (e, results) => {
          if (e) return done(e);
          tests.expect(results).to.eql(3);
          done();
        }
      );
    });

    it('we are able to call component methods and listen to events with an $off, with mesh name - with callback - negative test', function(done) {
      callAndListenOffCallback(
        clientAdmin,
        {
          mesh: 'MESH_NAME',
          component: 'component',
          method: 'exec'
        },
        { mesh: 'MESH_NAME', component: 'component1', path: 'test/event' },
        true,
        (e, results) => {
          if (e) return done(e);
          tests.expect(results).to.eql(4);
          done();
        }
      );
    });

    it('we are able to call component methods and listen to events with an $offPath, with mesh name - with callback', function(done) {
      callAndListenOffPathCallback(
        clientAdmin,
        {
          mesh: 'MESH_NAME',
          component: 'component',
          method: 'exec'
        },
        { mesh: 'MESH_NAME', component: 'component1', path: 'test/event' },
        false,
        (e, results) => {
          if (e) return done(e);
          tests.expect(results).to.eql(2);
          done();
        }
      );
    });

    it('we are able to call component methods and listen to events with an $offPath, with mesh name - with callback - negative test', function(done) {
      callAndListenOffPathCallback(
        clientAdmin,
        {
          mesh: 'MESH_NAME',
          component: 'component',
          method: 'exec'
        },
        { mesh: 'MESH_NAME', component: 'component1', path: 'test/event' },
        true,
        (e, results) => {
          if (e) return done(e);
          tests.expect(results).to.eql(4);
          done();
        }
      );
    });

    it('we get errors attempting to access a mesh that does not exist - with callback', function(done) {
      callWithInvalidParametersCallback(
        clientAdmin,
        {
          mesh: 'MESH_NAME_1',
          component: 'component',
          method: 'exec'
        },
        { mesh: 'MESH_NAME_1', component: 'component1', path: 'test/event' },
        (e, errors) => {
          tests
            .expect(errors)
            .to.eql([
              'invalid endpoint options: [MESH_NAME_1] mesh does not exist on the api',
              'invalid endpoint options: [MESH_NAME_1] mesh does not exist on the api'
            ]);
          done();
        }
      );
    });

    it('we get errors attempting to access a component that does not exist on a specified mesh - with callback', function(done) {
      callWithInvalidParametersCallback(
        clientAdmin,
        {
          mesh: 'MESH_NAME',
          component: 'component3',
          method: 'exec'
        },
        { mesh: 'MESH_NAME', component: 'component3', path: 'test/event' },
        (e, errors) => {
          tests
            .expect(errors)
            .to.eql([
              'invalid endpoint options: [MESH_NAME.component3] component does not exist on the api',
              'invalid endpoint options: [MESH_NAME.component3] component does not exist on the api'
            ]);
          done();
        }
      );
    });

    it('we get errors attempting to access a component that does not exist - with callback', function(done) {
      callWithInvalidParametersCallback(
        clientAdmin,
        {
          component: 'component3',
          method: 'exec'
        },
        { component: 'component3', path: 'test/event' },
        (e, errors) => {
          tests
            .expect(errors)
            .to.eql([
              'invalid endpoint options: [component3] component does not exist on the api',
              'invalid endpoint options: [component3] component does not exist on the api'
            ]);
          done();
        }
      );
    });

    it('we get errors attempting to access a method that does not exist - with callback', function(done) {
      callWithInvalidParametersCallback(
        clientAdmin,
        {
          mesh: 'MESH_NAME',
          component: 'component',
          method: 'unknownMethod'
        },
        { component: 'component', path: 'test/event' },
        (e, errors) => {
          tests
            .expect(errors)
            .to.eql([
              'Error: invalid endpoint options: [component.unknownMethod] method does not exist on the api'
            ]);
          done();
        }
      );
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

  async function callAndListenOnce(client, callParameters, listenParameters) {
    let eventCounter = 0;
    await client.event.$once(listenParameters, function() {
      eventCounter++;
    });
    await client.exchange.$call(callParameters);
    await client.exchange.$call(callParameters);
    await client.exchange.$call(callParameters);
    await tests.delay(2000);
    return eventCounter;
  }

  async function callAndListenOff(client, callParameters, listenParameters, negative) {
    let eventCounter = 0;
    const id = await client.event.$on(listenParameters, function() {
      eventCounter++;
    });
    await client.event.$on(listenParameters, function() {
      eventCounter++;
    });
    await client.exchange.$call(callParameters);
    if (!negative)
      await client.event.$off({
        component: listenParameters.component,
        mesh: listenParameters.mesh,
        id
      });
    await client.exchange.$call(callParameters);
    await tests.delay(2000);
    return eventCounter;
  }

  async function callAndListenOffPath(client, callParameters, listenParameters, negative) {
    let eventCounter = 0;
    await client.event.$on(listenParameters, function() {
      eventCounter++;
    });
    await client.event.$on(listenParameters, function() {
      eventCounter++;
    });
    await client.exchange.$call(callParameters);
    if (!negative) await client.event.$offPath(listenParameters);
    await client.exchange.$call(callParameters);
    await tests.delay(2000);
    return eventCounter;
  }

  function callWithInvalidParametersCallback(client, callParameters, listenParameters, callback) {
    let errors = [];

    client.event.$on(
      listenParameters,
      function() {
        //do nothing
      },
      e => {
        if (e) errors.push(e.message);
        client.exchange.$call(callParameters, e => {
          if (e) errors.push(e.message);
          callback(null, errors);
        });
      }
    );
  }

  function callAndListenCallback(client, callParameters, listenParameters, callback) {
    let results = {};
    client.event.$on(
      listenParameters,
      function(data) {
        results.event = data;
      },
      e => {
        if (e) return callback(e);
        client.exchange.$call(callParameters, (e, result) => {
          if (e) return callback(e);
          results.exec = result;
          setTimeout(() => {
            callback(null, results);
          }, 2000);
        });
      }
    );
  }

  function callAndListenOnceCallback(client, callParameters, listenParameters, callback) {
    let eventCounter = 0;
    client.event.$once(
      listenParameters,
      function() {
        eventCounter++;
      },
      e => {
        if (e) return callback(e);
        client.exchange.$call(callParameters, e => {
          if (e) return callback(e);
          client.exchange.$call(callParameters, e => {
            if (e) return callback(e);
            client.exchange.$call(callParameters, e => {
              if (e) return callback(e);
              setTimeout(() => {
                callback(null, eventCounter);
              }, 2000);
            });
          });
        });
      }
    );
  }

  function callAndListenOffCallback(client, callParameters, listenParameters, negative, callback) {
    let eventCounter = 0;
    let id;

    let finishCallback = () => {
      client.exchange.$call(callParameters, e => {
        if (e) return callback(e);
        setTimeout(() => {
          callback(null, eventCounter);
        }, 2000);
      });
    };

    client.event.$on(
      listenParameters,
      function() {
        eventCounter++;
      },
      (e, eventId) => {
        if (e) return callback(e);
        id = eventId;
        client.event.$on(
          listenParameters,
          function() {
            eventCounter++;
          },
          e => {
            if (e) return callback(e);
            client.exchange.$call(callParameters, e => {
              if (e) return callback(e);
              if (negative) return finishCallback();
              return client.event.$off(
                {
                  component: listenParameters.component,
                  mesh: listenParameters.mesh,
                  id
                },
                e => {
                  if (e) return callback(e);
                  finishCallback();
                }
              );
            });
          }
        );
      }
    );
  }

  function callAndListenOffPathCallback(
    client,
    callParameters,
    listenParameters,
    negative,
    callback
  ) {
    let eventCounter = 0;
    let finishCallback = () => {
      client.exchange.$call(callParameters, e => {
        if (e) return callback(e);
        setTimeout(() => {
          callback(null, eventCounter);
        }, 2000);
      });
    };
    client.event.$on(
      listenParameters,
      function() {
        eventCounter++;
      },
      e => {
        if (e) return callback(e);
        client.event.$on(
          listenParameters,
          function() {
            eventCounter++;
          },
          e => {
            if (e) return callback(e);
            client.exchange.$call(callParameters, e => {
              if (e) return callback(e);
              if (negative) return finishCallback();
              client.event.$offPath(listenParameters, e => {
                if (e) return callback(e);
                finishCallback();
              });
            });
          }
        );
      }
    );
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
