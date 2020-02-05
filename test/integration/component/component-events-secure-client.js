describe(
  require('../../__fixtures/utils/test_helper')
    .create()
    .testName(__filename, 3),
  function() {
    var expect = require('expect.js');
    var Happner = require('../../..');
    var server;

    this.timeout(6000);

    var Module1 = {
      causeEmit: function($happn, callback) {
        $happn.emit('test/event1', { some: 'thing' });
        callback();
      },
      causeEmitLocal: function($happn, callback) {
        $happn.emitLocal('test/event2', { some: 'thing' });
        callback();
      },
      causeEmitToSpecificPath: function($happn, path, callback) {
        $happn.emit(path, { some: 'thing' });
        callback();
      }
    };

    before(function(done) {
      Happner.create({
        name: 'MESH_NAME',
        secure: true,
        modules: {
          component1: {
            instance: Module1
          }
        },
        components: {
          component1: {}
        }
      })
        .then(function(_server) {
          server = _server;
          done();
        })
        .catch(done);
    });

    var testClient;

    beforeEach(function(done) {
      //this.originalSet = server._mesh.data.set;
      testClient = new Happner.MeshClient();

      testClient
        .login({
          username: '_ADMIN',
          password: 'happn'
        })
        .then(function() {
          done();
        })
        .catch(done);
    });

    afterEach(function(done) {
      //wait a second so we dont get timeouts on
      if (testClient) return testClient.disconnect(done);
      // setTimeout(() => {
      //   testClient.disconnect(done);
      // }, 1000);
    });

    after(function(done) {
      if (!server) return done();
      server.stop({ reconnect: false }, done);
    });

    it('components can emit events', function(done) {
      testClient.event.component1.on('test/event1', function(data) {
        expect(data).to.eql({ some: 'thing' });
        done();
      });

      testClient.exchange.component1.causeEmit().catch(function(e) {
        //eslint-disable-next-line
        if (e.message === 'connection-ended') return;
        done(e);
      });
    });

    it('components can subscribe to variable depth events, default depth', function(done) {
      var capturedEvents = [];

      testClient.event.component1.on('*', function(data, meta) {
        capturedEvents.push({ channel: meta.channel, path: meta.path });
      });

      testClient.exchange.component1
        .causeEmitToSpecificPath('test/path/1')
        .then(function() {
          testClient.exchange.component1.causeEmitToSpecificPath('test/path/1/2');
        })
        .then(function() {
          testClient.exchange.component1.causeEmitToSpecificPath('test/path/1/2/3');
        })
        .then(function() {
          testClient.exchange.component1.causeEmitToSpecificPath('test/path/1/2/3/4');
        })
        .then(function() {
          testClient.exchange.component1.causeEmitToSpecificPath('test/path/1/2/3/4/5');
        })
        .then(function() {
          setTimeout(function() {
            expect(capturedEvents).to.eql([
              {
                channel: '/SET@/_events/MESH_NAME/component1/**',
                path: '/_events/MESH_NAME/component1/test/path/1'
              },
              {
                channel: '/SET@/_events/MESH_NAME/component1/**',
                path: '/_events/MESH_NAME/component1/test/path/1/2'
              },
              {
                channel: '/SET@/_events/MESH_NAME/component1/**',
                path: '/_events/MESH_NAME/component1/test/path/1/2/3'
              }
            ]);
            done();
          }, 2000);
        })
        .catch(done);
    });

    it('components can subscribe to variable depth events, specified depth, with off *', function(done) {
      var capturedEvents = [];

      testClient.event.component1.on('*', { depth: 6 }, function(data, meta) {
        capturedEvents.push({ channel: meta.channel, path: meta.path });
      });

      testClient.exchange.component1
        .causeEmitToSpecificPath('test/path/1')
        .then(function() {
          testClient.exchange.component1.causeEmitToSpecificPath('test/path/1/2');
        })
        .then(function() {
          testClient.exchange.component1.causeEmitToSpecificPath('test/path/1/2/3');
        })
        .then(function() {
          testClient.exchange.component1.causeEmitToSpecificPath('test/path/1/2/3/4');
        })
        .then(function() {
          testClient.exchange.component1.causeEmitToSpecificPath('test/path/1/2/3/4/5');
        })
        .then(function() {
          setTimeout(function() {
            expect(capturedEvents).to.eql([
              {
                channel: '/SET@/_events/MESH_NAME/component1/**',
                path: '/_events/MESH_NAME/component1/test/path/1'
              },
              {
                channel: '/SET@/_events/MESH_NAME/component1/**',
                path: '/_events/MESH_NAME/component1/test/path/1/2'
              },
              {
                channel: '/SET@/_events/MESH_NAME/component1/**',
                path: '/_events/MESH_NAME/component1/test/path/1/2/3'
              },
              {
                channel: '/SET@/_events/MESH_NAME/component1/**',
                path: '/_events/MESH_NAME/component1/test/path/1/2/3/4'
              }
            ]);

            testClient.event.component1.offPath('*', function(e) {
              if (e) return done(e);

              capturedEvents = [];

              testClient.exchange.component1
                .causeEmitToSpecificPath('test/path/1')
                .then(function() {
                  testClient.exchange.component1.causeEmitToSpecificPath('test/path/1/2');
                })
                .then(function() {
                  testClient.exchange.component1.causeEmitToSpecificPath('test/path/1/2/3');
                })
                .then(function() {
                  testClient.exchange.component1.causeEmitToSpecificPath('test/path/1/2/3/4');
                })
                .then(function() {
                  testClient.exchange.component1.causeEmitToSpecificPath('test/path/1/2/3/4/5');
                })
                .then(function() {
                  setTimeout(function() {
                    expect(capturedEvents).to.eql([]);
                    done();
                  }, 2000);
                });
            });
          }, 2000);
        })
        .catch(done);
    });

    it('components can subscribe to variable depth events, specified depth, with off handle', function(done) {
      var capturedEvents = [];

      testClient.event.component1.on(
        '*',
        { depth: 6 },
        function(data, meta) {
          capturedEvents.push({ channel: meta.channel, path: meta.path });
        },
        function(e, handle) {
          if (e) return done(e);

          testClient.exchange.component1
            .causeEmitToSpecificPath('test/path/1')
            .then(function() {
              testClient.exchange.component1.causeEmitToSpecificPath('test/path/1/2');
            })
            .then(function() {
              testClient.exchange.component1.causeEmitToSpecificPath('test/path/1/2/3');
            })
            .then(function() {
              testClient.exchange.component1.causeEmitToSpecificPath('test/path/1/2/3/4');
            })
            .then(function() {
              testClient.exchange.component1.causeEmitToSpecificPath('test/path/1/2/3/4/5');
            })
            .then(function() {
              setTimeout(function() {
                expect(capturedEvents).to.eql([
                  {
                    channel: '/SET@/_events/MESH_NAME/component1/**',
                    path: '/_events/MESH_NAME/component1/test/path/1'
                  },
                  {
                    channel: '/SET@/_events/MESH_NAME/component1/**',
                    path: '/_events/MESH_NAME/component1/test/path/1/2'
                  },
                  {
                    channel: '/SET@/_events/MESH_NAME/component1/**',
                    path: '/_events/MESH_NAME/component1/test/path/1/2/3'
                  },
                  {
                    channel: '/SET@/_events/MESH_NAME/component1/**',
                    path: '/_events/MESH_NAME/component1/test/path/1/2/3/4'
                  }
                ]);

                testClient.event.component1.off(handle, function(e) {
                  if (e) return done(e);

                  capturedEvents = [];

                  testClient.exchange.component1
                    .causeEmitToSpecificPath('test/path/1')
                    .then(function() {
                      testClient.exchange.component1.causeEmitToSpecificPath('test/path/1/2');
                    })
                    .then(function() {
                      testClient.exchange.component1.causeEmitToSpecificPath('test/path/1/2/3');
                    })
                    .then(function() {
                      testClient.exchange.component1.causeEmitToSpecificPath('test/path/1/2/3/4');
                    })
                    .then(function() {
                      testClient.exchange.component1.causeEmitToSpecificPath('test/path/1/2/3/4/5');
                    })
                    .then(function() {
                      setTimeout(function() {
                        expect(capturedEvents).to.eql([]);
                        done();
                      }, 2000);
                    });
                });
              }, 2000);
            })
            .catch(done);
        }
      );
    });

    it('components can subscribe to variable depth events, specified depth, with off handle - partial path', function(done) {
      var capturedEvents = [];

      testClient.event.component1.on(
        'test/path/**',
        { depth: 3 },
        function(data, meta) {
          capturedEvents.push({ channel: meta.channel, path: meta.path });
        },
        function(e, handle) {
          if (e) return done(e);

          testClient.exchange.component1
            .causeEmitToSpecificPath('test/path/1')
            .then(function() {
              testClient.exchange.component1.causeEmitToSpecificPath('test/path/1/2');
            })
            .then(function() {
              testClient.exchange.component1.causeEmitToSpecificPath('test/path/1/2/3');
            })
            .then(function() {
              testClient.exchange.component1.causeEmitToSpecificPath('test/path/1/2/3/4');
            })
            .then(function() {
              testClient.exchange.component1.causeEmitToSpecificPath('test/path/1/2/3/4/5');
            })
            .then(function() {
              setTimeout(function() {
                expect(capturedEvents).to.eql([
                  {
                    channel: '/SET@/_events/MESH_NAME/component1/test/path/**',
                    path: '/_events/MESH_NAME/component1/test/path/1'
                  },
                  {
                    channel: '/SET@/_events/MESH_NAME/component1/test/path/**',
                    path: '/_events/MESH_NAME/component1/test/path/1/2'
                  },
                  {
                    channel: '/SET@/_events/MESH_NAME/component1/test/path/**',
                    path: '/_events/MESH_NAME/component1/test/path/1/2/3'
                  }
                ]);

                testClient.event.component1.off(handle, function(e) {
                  if (e) return done(e);

                  capturedEvents = [];

                  testClient.exchange.component1
                    .causeEmitToSpecificPath('test/path/1')
                    .then(function() {
                      testClient.exchange.component1.causeEmitToSpecificPath('test/path/1/2');
                    })
                    .then(function() {
                      testClient.exchange.component1.causeEmitToSpecificPath('test/path/1/2/3');
                    })
                    .then(function() {
                      testClient.exchange.component1.causeEmitToSpecificPath('test/path/1/2/3/4');
                    })
                    .then(function() {
                      testClient.exchange.component1.causeEmitToSpecificPath('test/path/1/2/3/4/5');
                    })
                    .then(function() {
                      setTimeout(function() {
                        expect(capturedEvents).to.eql([]);
                        done();
                      }, 2000);
                    });
                });
              }, 2000);
            })
            .catch(done);
        }
      );
    });
  }
);
