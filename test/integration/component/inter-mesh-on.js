const test = require('../../__fixtures/utils/test_helper').create();

describe(test.testName(__filename), function() {
  this.timeout(120000);
  const Happner = require('../../..');
  const clientAdmin = new Happner.MeshClient({});
  let server;

  const Echo = {
    echo: async function($happn, shout) {
      await $happn.emit(
        shout,
        Array(3)
          .fill(shout)
          .join('..')
      );
    }
  };

  const Shout = {
    andWaitForEcho: async function($happn, shout) {
      let events = [];
      await $happn.event.$on(
        {
          component: 'echo',
          path: shout
        },
        data => {
          events.push(data.value);
        }
      );
      await $happn.exchange.$call({
        component: 'echo',
        method: 'echo',
        arguments: [shout]
      });
      await test.delay(2000);
      return events.pop();
    }
  };

  before(async () => {
    server = await Happner.create({
      secure: true,
      authorityDelegationOn: true,
      name: 'MESH_NAME',
      modules: {
        shout: {
          instance: Shout
        },
        echo: {
          instance: Echo
        }
      },
      components: {
        shout: {},
        echo: {}
      }
    });
    await clientAdmin.login({ username: '_ADMIN', password: 'happn' });
  });

  after(function(done) {
    if (!server) return done();
    if (clientAdmin) clientAdmin.disconnect({ reconnect: false });
    server.stop({ reconnect: false }, done);
  });

  it('echos a shout successfully', async () => {
    const response = await clientAdmin.exchange.shout.andWaitForEcho('yeeehaw');
    test.expect(response).to.be('yeeehaw..yeeehaw..yeeehaw');
  });
});
