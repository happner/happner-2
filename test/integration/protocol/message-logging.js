const tests = require('../../__fixtures/utils/test_helper').create();
describe(tests.testName(__filename, 3), function() {
  this.timeout(30000);
  const Happner = require('../../..');
  const clientAdmin = new Happner.MeshClient({});
  let server,
    messages = [],
    tempFile = tests.path.resolve(__dirname, '../tmp/message-logging.json');

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
      happn: {
        services: {
          protocol: {
            config: {
              inboundLayers: [
                function(message, cb) {
                  messages.push({ DIRECTION: 'IN', ...message });
                  return cb(null, message);
                }
              ],
              outboundLayers: [
                function(message, cb) {
                  messages.push({ DIRECTION: 'OUT', ...message });
                  return cb(null, message);
                }
              ]
            }
          }
        }
      },
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
    await clientAdmin.login({ username: '_ADMIN', password: 'happn' });
  });

  after(function(done) {
    if (!server) return done();
    if (clientAdmin) clientAdmin.disconnect({ reconnect: false });
    server.stop({ reconnect: false }, done);
  });

  context('client tests', () => {
    it('we do a series of actions against the API- and examine the inbound and outbound messages', async () => {
      await callAndListen(
        clientAdmin,
        {
          component: 'component',
          method: 'exec'
        },
        { component: 'component1', path: 'test/event' }
      );
      await callAndListen(
        clientAdmin,
        {
          mesh: 'MESH_NAME',
          component: 'component',
          method: 'exec'
        },
        { mesh: 'MESH_NAME', component: 'component1', path: 'test/event' }
      );
      await callAndListenOnce(
        clientAdmin,
        {
          mesh: 'MESH_NAME',
          component: 'component',
          method: 'exec'
        },
        { mesh: 'MESH_NAME', component: 'component1', path: 'test/event' }
      );
      await callAndListenOff(
        clientAdmin,
        {
          mesh: 'MESH_NAME',
          component: 'component',
          method: 'exec'
        },
        { mesh: 'MESH_NAME', component: 'component1', path: 'test/event' }
      );
      await callAndListenOffPath(
        clientAdmin,
        {
          mesh: 'MESH_NAME',
          component: 'component',
          method: 'exec'
        },
        { mesh: 'MESH_NAME', component: 'component1', path: 'test/event' }
      );
      await callWithInvalidParameters(
        clientAdmin,
        {
          mesh: 'MESH_NAME_1',
          component: 'component',
          method: 'exec'
        },
        { mesh: 'MESH_NAME_1', component: 'component1', path: 'test/event' }
      );
      await callWithInvalidParameters(
        clientAdmin,
        {
          mesh: 'MESH_NAME',
          component: 'component3',
          method: 'exec'
        },
        { mesh: 'MESH_NAME', component: 'component3', path: 'test/event' }
      );
      await tests.fs.writeFileSync(tempFile, JSON.stringify(messages, null, 2));
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
});
