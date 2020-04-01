const path = require('path');
const testHelper = require('../../__fixtures/utils/test_helper').create();

describe(testHelper.testName(__filename, 3), function() {
  var libFolder =
    path.resolve(__dirname, '../../..') +
    path.sep +
    ['test', '__fixtures', 'test', 'integration', 'data'].join(path.sep);
  var Mesh = require('../../..');
  var expect = require('expect.js');
  let proxy;
  this.timeout(200000);

  before(createProxy);

  it('compares traffic where publish is being used instead of set', comparePublish);

  it('compares traffic where compression switched on', compareCompression);

  it('compares traffic compression and publish switched on', comparePublishAndCompression);

  after(tearDownProxy);

  async function comparePublish() {
    const meshAndClientNoPublish = await createMeshAndClient(false, false);
    const totalBytesUnOptimised = await generateTraffic(meshAndClientNoPublish.client);
    await tearDownMeshAndClient(meshAndClientNoPublish);
    const meshAndClientWithPublish = await createMeshAndClient(false, true);
    const totalBytesOptimised = await generateTraffic(meshAndClientWithPublish.client);
    await tearDownMeshAndClient(meshAndClientWithPublish);
    expect(totalBytesOptimised < totalBytesUnOptimised).to.be(true);
  }

  async function compareCompression() {
    throw new Error('not implemented');
  }

  async function comparePublishAndCompression() {
    throw new Error('not implemented');
  }

  async function generateTraffic(client) {
    const proxiedBytesBefore = proxy.bytesTransferred;
    await client.exchange.compressionModule.methodBigPayload(getBigPayload(4096, 'test'));
    return proxy.bytesTransferred - proxiedBytesBefore;
  }

  function getBigPayload(size, str) {
    return Array.apply(null, Array(size)).map(() => str);
  }

  async function createProxy() {
    proxy = testHelper.TCPProxy.createProxy(12358, '127.0.0.1', 12359);
  }

  function tearDownProxy() {
    // eslint-disable-next-line no-console
    proxy ? proxy.end() : console.log('proxy wasnt started');
  }

  async function createMeshAndClient(compression, publish) {
    const mesh = await Mesh.create(getConfig(compression));
    const client = await createClient(publish);
    return { mesh, client };
  }

  function createClient(publish) {
    return new Promise((resolve, reject) => {
      const client = new Mesh.MeshClient({ port: 12358 });
      client
        .login({ username: '_ADMIN', password: 'happn' })
        .then(() => {
          resolve(client);
        })
        .catch(reject);
    });
  }

  async function tearDownMeshAndClient(meshAndClient) {
    await meshAndClient.client.disconnect({ reconnect: false });
    await meshAndClient.mesh.stop({ reconnect: false });
  }

  function getConfig(compression) {
    return {
      secure: true,
      name: 'testCompression',
      port: 12359,
      happn: {
        services: {
          session: {
            config: {
              primusOpts: {
                compression
              }
            }
          }
        }
      },
      modules: {
        compressionModule: {
          path: libFolder + path.sep + 'compression-module'
        }
      },
      components: {
        compressionModule: {
          schema: {
            exclusive: false
          }
        }
      }
    };
  }
});
