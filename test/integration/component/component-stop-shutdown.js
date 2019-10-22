module.exports = Explicit;

var expect = require('expect.js');

global.STOPPED = false;

global.SHUTDOWN = false;

global.SHUTDOWNNOTFAIL = false;

global.STOPNOTFAIL = false;

function Explicit() {}

Explicit.prototype.asyncStop = function($happn, opts, optionalOpts, callback) {
  if (typeof callback === 'undefined') callback = optionalOpts;

  setTimeout(function() {
    global.STOPPED = true;
    global.STOPPEDTIME = new Date();
    callback(null);
  }, 200);
};

Explicit.prototype.asyncShutdown = function($happn, opts, optionalOpts, callback) {
  if (typeof callback === 'undefined') callback = optionalOpts;

  expect(opts.op).to.be('tions');

  setTimeout(function() {
    global.SHUTDOWN = true;
    global.SHUTDOWNTIME = new Date();
    callback(null);
  }, 200);
};

Explicit.prototype.asyncStopFails = function($happn, opts, optionalOpts, callback) {
  if (typeof callback === 'undefined') callback = optionalOpts;

  if (!global.STOPNOTFAIL) return callback(new Error('erm'));

  callback();
};

Explicit.prototype.asyncShutdownFails = function($happn, opts, optionalOpts, callback) {
  if (typeof callback === 'undefined') callback = optionalOpts;

  if (!global.SHUTDOWNNOTFAIL) return callback(new Error('erm'));

  callback();
};

Explicit.prototype.methodName1 = function(opts, blob, callback) {
  if (typeof blob === 'function') callback = blob;
  callback(null, { yip: 'eee' });
};

if (global.TESTING_16) return; // When 'requiring' the module above,

var mesh;
var shutdownMesh;
var stopMesh;
var Mesh = require('../../..');

describe(
  require('../../__fixtures/utils/test_helper')
    .create()
    .testName(__filename, 3),
  function() {
    this.timeout(120000);

    before(function(done) {
      global.TESTING_16 = true; //.............

      mesh = this.mesh = new Mesh();

      mesh.initialize(
        {
          util: {
            // logLevel: 'error'
          },
          happn: {
            port: 50007
          },
          modules: {
            expliCit: {
              path: __filename
            }
          },
          components: {
            explicit: {
              moduleName: 'expliCit',
              stopMethod: 'asyncStop',
              shutdownMethod: 'asyncShutdown',
              schema: {
                exclusive: true,
                methods: {
                  asyncStop: {
                    type: 'async',
                    parameters: [
                      { name: 'opts', required: true, value: { op: 'tions' } },
                      { name: 'optionalOpts', required: false },
                      { type: 'callback', required: true }
                    ],
                    callback: {
                      parameters: [{ type: 'error' }]
                    }
                  },
                  asyncShutdown: {
                    type: 'async',
                    parameters: [
                      { name: 'opts', required: true, value: { op: 'tions' } },
                      { name: 'optionalOpts', required: false },
                      { type: 'callback', required: true }
                    ],
                    callback: {
                      parameters: [{ type: 'error' }]
                    }
                  },
                  methodName1: {
                    // alias: 'm1',
                    parameters: [
                      { name: 'opts', required: true, value: { op: 'tions' } },
                      { name: 'blob', required: false },
                      { type: 'callback', required: true }
                    ]
                  }
                }
              }
            }
          }
        },
        function(err) {
          if (err) return done(err);

          mesh.start(function(err) {
            if (err) {
              console.log(err.stack);
              return done(err);
            }
            return done();
          });
        }
      );
    });

    after(function(done) {
      delete global.TESTING_16; //.............

      global.SHUTDOWNNOTFAIL = true;
      global.STOPNOTFAIL = true;

      if (shutdownMesh == null) return done();

      shutdownMesh.stop({ reconnect: false }, function(e) {
        expect(e).to.be(undefined);

        stopMesh.stop({ reconnect: false }, function() {
          expect(e).to.be(undefined);

          done();
        });
      });
    });

    it('validates stop and shutdown methods', function(done) {
      expect(global.STOPPED).to.be(false);
      expect(global.SHUTDOWN).to.be(false);

      this.mesh.stop({ reconnect: false }, function(e) {
        expect(e).to.be(undefined);

        expect(global.STOPPED).to.be(true);
        expect(global.SHUTDOWN).to.be(true);

        expect(global.SHUTDOWNTIME > global.STOPPEDTIME).to.be(true);

        done();
      });
    });

    var findMessage = function(log, message) {
      var found = false;

      log.forEach(function(entry) {
        if (entry.message == message) found = true;
      });

      return found;
    };

    it('has called back with error into the mesh stop callback because the component shutdown failed', function(done) {
      shutdownMesh = new Mesh();

      shutdownMesh.initialize(
        {
          util: {
            // logLevel: 'error'
          },
          happn: {
            port: 50008
          },
          modules: {
            expliCit: {
              path: __filename
            }
          },
          components: {
            explicit: {
              moduleName: 'expliCit',
              stopMethod: 'asyncStop',
              shutdownMethod: 'asyncShutdownFails',
              schema: {
                exclusive: true,
                methods: {
                  asyncStop: {
                    type: 'async',
                    parameters: [
                      { name: 'opts', required: true, value: { op: 'tions' } },
                      { name: 'optionalOpts', required: false },
                      { type: 'callback', required: true }
                    ],
                    callback: {
                      parameters: [{ type: 'error' }]
                    }
                  },
                  asyncShutdownFails: {
                    type: 'async',
                    parameters: [
                      { name: 'opts', required: true, value: { op: 'tions' } },
                      { name: 'optionalOpts', required: false },
                      { type: 'callback', required: true }
                    ],
                    callback: {
                      parameters: [{ type: 'error' }]
                    }
                  },
                  methodName1: {
                    // alias: 'm1',
                    parameters: [
                      { name: 'opts', required: true, value: { op: 'tions' } },
                      { name: 'blob', required: false },
                      { type: 'callback', required: true }
                    ]
                  }
                }
              }
            }
          }
        },
        function(err) {
          if (err) return done(err);

          shutdownMesh.stop(function(err, mesh, stopLog) {
            var foundShutdownError = findMessage(
              stopLog,
              'failure to shut down components: Error: erm'
            );

            expect(foundShutdownError).to.be(true);

            return done();
          });
        }
      );
    });

    it('has called back with error into the mesh stop callback because the component stop failed', function(done) {
      stopMesh = new Mesh();

      stopMesh.initialize(
        {
          util: {
            // logLevel: 'error'
          },
          happn: {
            port: 50009
          },
          modules: {
            expliCit: {
              path: __filename
            }
          },
          components: {
            explicit: {
              moduleName: 'expliCit',
              stopMethod: 'asyncStopFails',
              shutdownMethod: 'asyncShutdown',
              schema: {
                exclusive: true,
                methods: {
                  asyncStopFails: {
                    type: 'async',
                    parameters: [
                      { name: 'opts', required: true, value: { op: 'tions' } },
                      { name: 'optionalOpts', required: false },
                      { type: 'callback', required: true }
                    ],
                    callback: {
                      parameters: [{ type: 'error' }]
                    }
                  },
                  asyncShutdown: {
                    type: 'async',
                    parameters: [
                      { name: 'opts', required: true, value: { op: 'tions' } },
                      { name: 'optionalOpts', required: false },
                      { type: 'callback', required: true }
                    ],
                    callback: {
                      parameters: [{ type: 'error' }]
                    }
                  },
                  methodName1: {
                    // alias: 'm1',
                    parameters: [
                      { name: 'opts', required: true, value: { op: 'tions' } },
                      { name: 'blob', required: false },
                      { type: 'callback', required: true }
                    ]
                  }
                }
              }
            }
          }
        },
        function(err) {
          if (err) return done(err);

          stopMesh.stop(function(err, mesh, stopLog) {
            var foundShutdownError = findMessage(stopLog, 'failure to stop components: Error: erm');

            expect(foundShutdownError).to.be(true);

            return done();
          });
        }
      );
    });
  }
);
