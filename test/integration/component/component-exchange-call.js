const tests = require('../../__fixtures/utils/test_helper').create();
describe(tests.testName(__filename, 3), function() {
  const Happner = require('../../..');
  let server;

  const Module = {
    exec: async function($happn) {
      return await $happn.exchange.$call({
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

  before(function(done) {
    Happner.create({
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
        component: {}
      }
    })
      .then(function(_server) {
        server = _server;
        done();
      })
      .catch(done);
  });

  after(function(done) {
    if (!server) return done();
    server.stop({ reconnect: false }, done);
  });

  it('we are able to call component methods without going through the exchange API', async () => {
    let results = {};

    await server.event.$on({ component: 'component1', path: 'test/event1' }, function(data) {
      results.event = data;
      expect(data).to.eql({ result: 3 });
    });

    results.exec = await server.exchange.$call(
      {
        mesh: undefined,
        component: 'component2',
        method: 'exec'
      },
      undefined
    );

    await tests.delay(2000);
    tests.expect(results).to.eql({
      event: { result: 3 },
      exec: 3
    });
  });
});
