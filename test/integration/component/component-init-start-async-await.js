module.exports = Explicit;

const testHelper = require('../../__fixtures/utils/test_helper').create();
const should = require('chai').should();
const expect = require('expect.js');

var DONE = false;
var INITIALIZED = false;

function Explicit() {}

Explicit.prototype.start = async function($happn, opts, optionalOpts) {
  await testHelper.delay(200);
  DONE = true;
  return { opts, optionalOpts };
};

Explicit.prototype.init = async function($happn, opts, optionalOpts) {
  await testHelper.delay(200);
  INITIALIZED = true;
  return { opts, optionalOpts };
};

Explicit.prototype.asyncStartFails = function(callback) {
  callback(new Error('erm'));
};

Explicit.prototype.asyncInitFails = async function() {
  await testHelper.delay(200);
  throw new Error('erm');
};

Explicit.prototype.methodName1 = function(opts, blob, callback) {
  if (typeof blob === 'function') callback = blob;
  callback(null, { yip: 'eee', state: { started: DONE, initialized: INITIALIZED } });
};

if (global.TESTING_INIT_PROMISE) return; // When 'requiring' the module above,

var mesh;
var anotherMesh;
var Mesh = require('../../../lib/mesh');

describe(testHelper.testName(__filename, 3), function() {
  this.timeout(120000);

  before(function(done) {
    global.TESTING_INIT_PROMISE = true; //.............

    mesh = this.mesh = new Mesh();

    mesh.initialize(
      {
        util: {
          // logLevel: 'error'
        },
        happn: {
          port: 8001
        },
        modules: {
          expliCit: {
            path: __filename
          }
        },
        components: {
          explicit: {
            moduleName: 'expliCit',
            startMethod: 'start',
            initMethod: 'init',
            schema: {
              exclusive: true,
              methods: {
                init: {
                  parameters: [
                    { name: 'opts', required: true, value: { op: 'tions' } },
                    { name: 'optionalOpts', required: false }
                  ],
                  callback: {
                    parameters: [{ type: 'error' }]
                  }
                },
                start: {
                  parameters: [
                    { name: 'opts', required: true, value: { op: 'tions' } },
                    { name: 'optionalOpts', required: false }
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
            //eslint-disable-next-line
              console.log(err.stack);
            return done(err);
          }
          return done();
        });
      }
    );
  });

  after(function(done) {
    delete global.TESTING_INIT_PROMISE; //.............
    mesh.stop({ reconnect: false }, function(e) {
      if (e) return done(e);
      if (anotherMesh) return anotherMesh.stop({ reconnect: false }, done);
      done();
    });
  });

  it('validates start and init methods', function(done) {
    this.mesh.api.exchange.explicit.methodName1({ op: 'tions3' }, function(err, res) {
      expect(res.state.started).to.be(true);
      expect(res.state.initialized).to.be(true);
      done();
    });
  });

  it('has called back with error into the mesh start callback because the component start failed', function(done) {
    anotherMesh = new Mesh();

    anotherMesh.initialize(
      {
        util: {
          logger: {}
        },
        happn: {
          port: 8002
        },
        modules: {
          expliCit: {
            path: __filename
          }
        },
        components: {
          explicit: {
            moduleName: 'expliCit',
            initMethod: 'asyncInitFails',
            schema: {
              methods: {
                asyncInitFails: {
                  type: 'async'
                }
              }
            }
          }
        }
      },
      function(err) {
        if (err) return done(err);

        anotherMesh.start(function(err) {
          should.exist(err);
          done();
        });
      }
    );
  });
});
