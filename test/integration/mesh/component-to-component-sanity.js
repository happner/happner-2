var path = require('path');

describe(
  require('../../__fixtures/utils/test_helper')
    .create()
    .testName(__filename, 3),
  function() {
    this.timeout(120000);

    var libFolder =
      path.resolve(__dirname, '../../..') +
      path.sep +
      ['test', '__fixtures', 'test', 'integration', 'mesh'].join(path.sep) +
      path.sep;

    var maximumPings = 1000;
    var Mesh = require('../../..');
    var mesh = new Mesh();

    var config = {
      name: 'testComponent2Component',
      modules: {
        module1: {
          path: libFolder + '2-module1',
          constructor: {
            type: 'sync',
            parameters: [{ value: { maximumPings: maximumPings } }]
          }
        },
        module2: {
          path: libFolder + '2-module2',
          constructor: {
            type: 'sync'
          }
        }
      },
      components: {
        component1: {
          moduleName: 'module1',
          // scope:"component",//either component(mesh aware) or module - default is module
          startMethod: 'start',
          schema: {
            exclusive: false, //means we dont dynamically share anything else
            methods: {
              start: {
                type: 'sync',
                parameters: [{ required: true, value: { message: 'this is a start parameter' } }]
              }
            }
          }
        },
        component2: {
          moduleName: 'module2',
          // scope:"component",
          schema: {
            exclusive: false
          }
        }
      }
    };

    after(function(done) {
      mesh.stop({ reconnect: false }, done);
    });

    it('starts the mesh, listens for the ping pong completed event, that module1 emits', function(done) {
      mesh = new Mesh();

      var onEventRef;

      mesh.initialize(config, function(err) {
        if (err) {
          done(err);
        } else {
          mesh.event.component1.on(
            'maximum-pings-reached',
            function(message) {
              //eslint-disable-next-line
              console.log(message.m);
              mesh.event.component1.off(onEventRef, function(err) {
                done(err);
              });
            },
            function(err, ref) {
              if (err) {
                done(err);
              } else {
                onEventRef = ref;
                mesh.start(function(err) {
                  if (err) {
                    done(err);
                  }
                });
              }
            }
          );
        }
      });
    });
  }
);
