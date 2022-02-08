const test = require('../../__fixtures/utils/test_helper').create();
class TestInstanceClass {
  static create() {
    return new TestInstanceClass();
  }
  async testMethod(arg1, $happn) {
    return typeof $happn.exchange.test.testMethod === 'function';
  }
}
const Happner = require('../../..');
const LightClient = require('happner-client').Light;
describe(test.testName(__filename, 3), function() {
  let server;
  before(createServer);
  after(destroyServer);

  it('can call the test method', async () => {
    let client = new Happner.MeshClient({ secure: true });
    await client.login({
      username: '_ADMIN',
      password: 'happn'
    });
    test.expect(typeof client.exchange.test.testMethod).to.equal('function');
    client.disconnect(() => {});
  });

  //TODO: figure this out.
  xit('can call the test method light client missing argument', async () => {
    let client = new LightClient({ domain: 'MESH_NAME', secure: true });
    await client.connect({ username: '_ADMIN', password: 'happn' });
    test
      .expect(
        await client.exchange.$call({
          component: 'test',
          method: 'testMethod',
          arguments: []
        })
      )
      .to.equal(true);
    client.disconnect(() => {});
  });

  async function destroyServer() {
    if (server) await server.stop({ reconnect: false });
  }

  function createServer() {
    return new Promise((resolve, reject) => {
      Happner.create(
        {
          secure: true,
          name: 'MESH_NAME',
          modules: {
            test: {
              instance: TestInstanceClass.create()
            }
          },
          components: {
            test: {}
          }
        },
        (e, instance) => {
          if (e) return reject(e);
          server = instance;
          resolve();
        }
      );
    });
  }
});
