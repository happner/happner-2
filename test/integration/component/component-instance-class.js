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
  before(createServer);
  after(destroyServer);

  it('can call the test method', async () => {
    let client = new Happner.MeshClient({ secure: true });
    await client.login({
      username: '_ADMIN',
      password: 'happn'
    });
    test.expect(typeof client.exchange.test.testMethod).to.equal('function');
  });

  //todo: also check for bad domain
  it.only('can call the test method light client missing argument', async () => {
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
  });

  async function destroyServer() {
    if (server) await server.stop({ reconnect: false });
  }

  async function createServer() {
    server = await Happner.create({
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
    });
    console.log('created?');
  }
});
