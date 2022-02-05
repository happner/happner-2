const test = require('../../__fixtures/utils/test_helper').create();
class TestInstanceClass {
  static create() {
    return new TestInstanceClass();
  }
  async testMethod() {
    return true;
  }
}
const Happner = require('../../..');
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
  }
});
