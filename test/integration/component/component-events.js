describe(
  require('../../__fixtures/utils/test_helper')
    .create()
    .testName(__filename, 3),
  function() {
    var expect = require('expect.js');
    var Happner = require('../../..');
    var server;

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

    beforeEach(function() {
      this.originalSet = server._mesh.data.set;
    });

    afterEach(function() {
      server._mesh.data.set = this.originalSet;
    });

    after(function(done) {
      if (!server) return done();
      server.stop({ reconnect: false }, done);
    });

    it('components can emit events', function(done) {
      server.event.component1.on('test/event1', function(data) {
        expect(data).to.eql({ some: 'thing' });
        done();
      });

      server.exchange.component1.causeEmit().catch(done);
    });

    it('components can emit events with noCluster', function(done) {
      server._mesh.data.set = function(path, data, options) {
        expect(options.noCluster).to.be(true);
        done();
      };

      server.exchange.component1.causeEmitLocal().catch(done);
    });

    it('components can subscribe to variable depth events, default depth', function(done) {
      this.timeout(5000);

      var capturedEvents = [];

      server.event.component1.on('*', function(data, meta) {
        capturedEvents.push({ channel: meta.channel, path: meta.path });
      });

      server.exchange.component1
        .causeEmitToSpecificPath('test/path/1')
        .then(function() {
          server.exchange.component1.causeEmitToSpecificPath('test/path/1/2');
        })
        .then(function() {
          server.exchange.component1.causeEmitToSpecificPath('test/path/1/2/3');
        })
        .then(function() {
          server.exchange.component1.causeEmitToSpecificPath('test/path/1/2/3/4');
        })
        .then(function() {
          server.exchange.component1.causeEmitToSpecificPath('test/path/1/2/3/4/5');
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
      this.timeout(5000);

      var capturedEvents = [];

      server.event.component1.on('*', { depth: 6 }, function(data, meta) {
        capturedEvents.push({ channel: meta.channel, path: meta.path });
      });

      server.exchange.component1
        .causeEmitToSpecificPath('test/path/1')
        .then(function() {
          server.exchange.component1.causeEmitToSpecificPath('test/path/1/2');
        })
        .then(function() {
          server.exchange.component1.causeEmitToSpecificPath('test/path/1/2/3');
        })
        .then(function() {
          server.exchange.component1.causeEmitToSpecificPath('test/path/1/2/3/4');
        })
        .then(function() {
          server.exchange.component1.causeEmitToSpecificPath('test/path/1/2/3/4/5');
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

            server.event.component1.offPath('*', function(e) {
              if (e) return done(e);

              capturedEvents = [];

              server.exchange.component1
                .causeEmitToSpecificPath('test/path/1')
                .then(function() {
                  server.exchange.component1.causeEmitToSpecificPath('test/path/1/2');
                })
                .then(function() {
                  server.exchange.component1.causeEmitToSpecificPath('test/path/1/2/3');
                })
                .then(function() {
                  server.exchange.component1.causeEmitToSpecificPath('test/path/1/2/3/4');
                })
                .then(function() {
                  server.exchange.component1.causeEmitToSpecificPath('test/path/1/2/3/4/5');
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
      this.timeout(5000);

      var capturedEvents = [];

      server.event.component1.on(
        '*',
        { depth: 6 },
        function(data, meta) {
          capturedEvents.push({ channel: meta.channel, path: meta.path });
        },
        function(e, handle) {
          if (e) return done(e);

          server.exchange.component1
            .causeEmitToSpecificPath('test/path/1')
            .then(function() {
              server.exchange.component1.causeEmitToSpecificPath('test/path/1/2');
            })
            .then(function() {
              server.exchange.component1.causeEmitToSpecificPath('test/path/1/2/3');
            })
            .then(function() {
              server.exchange.component1.causeEmitToSpecificPath('test/path/1/2/3/4');
            })
            .then(function() {
              server.exchange.component1.causeEmitToSpecificPath('test/path/1/2/3/4/5');
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

                server.event.component1.off(handle, function(e) {
                  if (e) return done(e);

                  capturedEvents = [];

                  server.exchange.component1
                    .causeEmitToSpecificPath('test/path/1')
                    .then(function() {
                      server.exchange.component1.causeEmitToSpecificPath('test/path/1/2');
                    })
                    .then(function() {
                      server.exchange.component1.causeEmitToSpecificPath('test/path/1/2/3');
                    })
                    .then(function() {
                      server.exchange.component1.causeEmitToSpecificPath('test/path/1/2/3/4');
                    })
                    .then(function() {
                      server.exchange.component1.causeEmitToSpecificPath('test/path/1/2/3/4/5');
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
