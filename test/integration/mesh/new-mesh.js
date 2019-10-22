describe(
  require('../../__fixtures/utils/test_helper')
    .create()
    .testName(__filename, 3),
  function() {
    this.timeout(120000);

    var expect = require('expect.js');

    var Mesh = require('../../..');
    var mesh;

    it('tests the client newMesh call', function(done) {
      Mesh.create(function(e, instance) {
        if (e) return done(e);
        mesh = instance;

        mesh._mesh._createElement(
          {
            component: {},
            module: {
              config: {}
            }
          },
          {},
          function(e) {
            mesh.stop(
              {
                reconnect: false
              },
              done
            );
          }
        );
      });
    });

    it('tests the client newMesh call, _updateElement', function(done) {
      Mesh.create(function(e, instance) {
        if (e) return done(e);
        mesh = instance;

        var mockElement1 = {
          component: {
            name: 'testComponent',
            config: {}
          },
          module: {
            name: 'testComponent',
            config: {
              instance: {
                testMethod: function(callback) {
                  callback(null, true);
                }
              }
            }
          }
        };

        var mockElement2 = {
          component: {
            name: 'testComponent',
            config: {}
          },
          module: {
            name: 'testComponent',
            config: {
              instance: {
                testMethod: function(callback) {
                  callback(null, false);
                }
              }
            }
          }
        };

        mesh._mesh._createElement(mockElement1, {}, function(e) {
          if (e) return done(e);
          mesh.exchange.testComponent.testMethod(function(e, result) {
            expect(result).to.be(true);
            mesh._mesh._updateElement(mockElement2, function(e) {
              if (e) return done(e);
              mesh.exchange.testComponent.testMethod(function(e, result) {
                expect(result).to.be(false);
                mesh.stop(
                  {
                    reconnect: false
                  },
                  done
                );
              });
            });
          });
        });
      });
    });

    it('tests a re-initialized mesh', function(done) {
      Mesh.create(function(e, instance) {
        if (e) return done(e);
        mesh = instance;

        mesh._mesh._createElement(
          {
            component: {},
            module: {
              config: {}
            }
          },
          {},
          function(e) {
            mesh.stop(
              {
                reconnect: false
              },
              function(e) {
                if (e) return done(e);

                mesh.initialize({}, function(e, instance) {
                  instance._mesh._createElement(
                    {
                      component: {},
                      module: {
                        config: {}
                      }
                    },
                    {},
                    function(e) {
                      mesh.stop(
                        {
                          reconnect: false
                        },
                        done
                      );
                    }
                  );
                });
              }
            );
          }
        );
      });
    });
  }
);
