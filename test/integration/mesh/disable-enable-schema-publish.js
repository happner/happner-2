/* eslint-disable no-console */
const test = require('../../__fixtures/utils/test_helper').create();
describe(test.testName(__filename, 3), function() {
  var Happner = require('../../..');
  this.timeout(60000);
  var mesh;
  before('start mesh', function(done) {
    Happner.create({
      name: 'MESH_NAME',
      modules: {
        factory: {
          // component that adds another component via _mesh
          instance: {
            createComponent: function($happn, name, callback) {
              $happn._mesh._createElement(
                {
                  module: {
                    name: name,
                    config: {
                      instance: {
                        method: function(callback) {
                          callback(null, name + ' OK');
                        }
                      }
                    }
                  },
                  component: {
                    name: name,
                    config: {}
                  }
                },
                callback
              );
            }
          }
        }
      },
      components: {
        factory: {
          accessLevel: 'mesh'
        }
      }
    })
      .then(function(_mesh) {
        mesh = _mesh;
        done();
      })
      .catch(done);
  });

  after('stop server 1', function(done) {
    if (!mesh) return done();
    mesh.stop({ reconnect: false }, done);
  });

  it('injects a new component - we check the client receives a new description publication', async () => {
    const client = new Happner.MeshClient();
    await client.login();
    let descriptionCount = 0;
    await client.data.on('/mesh/schema/description', () => {
      descriptionCount++;
    });
    await test.delay(5e3);
    test.expect(descriptionCount).to.be(0);
    mesh.exchange.factory.createComponent('componentName2');
    await test.delay(5e3);
    test.expect(descriptionCount).to.be(1);
  });

  it('injects a new component after we disable the schema publication - we check the client does not receive a new description publication, we re-enable and check the client did receive the publication', async () => {
    const client = new Happner.MeshClient();
    await client.login();
    let descriptionCount = 0;
    await client.data.on('/mesh/schema/description', () => {
      descriptionCount++;
    });
    await test.delay(5e3);
    test.expect(descriptionCount).to.be(0);
    mesh.disableSchemaPublish();
    mesh.exchange.factory.createComponent('componentName2');
    await test.delay(5e3);
    test.expect(descriptionCount).to.be(0);
    mesh.enableSchemaPublish();
    mesh.exchange.factory.createComponent('componentName3');
    await test.delay(5e3);
    test.expect(descriptionCount).to.be(1);
  });
});
/* eslint-enable no-console */
