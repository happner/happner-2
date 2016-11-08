module.exports = Explicit;

var DONE = false;

function Explicit() {
}

Explicit.prototype.asyncStart = function ($happn, opts, optionalOpts, callback) {

  if (typeof callback == 'undefined') callback = optionalOpts;

  setTimeout(function () {
    DONE = true;
    callback(null)
  }, 200);
}

Explicit.prototype.asyncStartFails = function (callback) {

  callback(new Error('erm'));
}

Explicit.prototype.methodName1 = function (opts, blob, callback) {
  if (typeof blob == 'function') callback = blob;
  callback(null, {yip: 'eee'});
}


if (global.TESTING_16) return; // When 'requiring' the module above,
// don't run the tests below
//.............


var should = require('chai').should();
var mesh;
var Mesh = require('../');

describe('a6 - component start and validation -', function () {

  require('benchmarket').start();
  after(require('benchmarket').store());

  this.timeout(120000);

  before(function (done) {

    global.TESTING_16 = true; //.............

    mesh = this.mesh = new Mesh();

    mesh.initialize({
      util: {
        // logLevel: 'error'
      },
      dataLayer: {
        port: 8001,
      },
      modules: {
        'expliCit': {
          path: __filename
        }
      },
      components: {
        'explicit': {
          moduleName: 'expliCit',
          startMethod: 'asyncStart',
          schema: {
            exclusive: true,
            methods: {

              'asyncStart': {
                type: 'async',
                parameters: [
                  {name: 'opts', required: true, value: {op: 'tions'}},
                  {name: 'optionalOpts', required: false},
                  {type: 'callback', required: true}
                ],
                callback: {
                  parameters: [
                    {type: 'error'}
                  ]
                }
              },

              'methodName1': {
                // alias: 'm1',
                parameters: [
                  {name: 'opts', required: true, value: {op: 'tions'}},
                  {name: 'blob', required: false},
                  {type: 'callback', required: true}
                ]
              }
            }
          }
        }
      }

    }, function (err) {
      if (err) return done(err);

      mesh.start(function (err) {
        if (err) {
          console.log(err.stack);
          //process.exit(err.errno || 1);
          return done(err);
        }
        return done();
      });
    });
  });

  after(function (done) {
    delete global.TESTING_16; //.............
    mesh.stop({reconnect: false}, done);
  })

  it('has called and finished the component async start method', function (done) {

    DONE.should.eql(true)
    done();

  });


  it('has called back with error into the mesh start callback because the component start failed', function (done) {

    var anotherMesh = new Mesh();
    anotherMesh.initialize({
      util: {
        logger: {}
      },
      datalayer: {
        port: 8002,
      },
      modules: {
        'expliCit': {
          path: __filename
        }
      },
      components: {
        'explicit': {
          moduleName: 'expliCit',
          startMethod: 'asyncStartFails',
          schema: {
            methods: {
              'asyncStartFails': {
                type: 'async',
                parameters: [
                  {type: 'callback', required: true}
                ],
                callback: {
                  parameters: [
                    {type: 'error'}
                  ]
                }
              }
            }
          }
        }
      }
    }, function (err) {
      if (err) return done(err);

      anotherMesh.start(function (err, mesh) {
        // console.log('ERROR', err);
        should.exist(err);
        done();
      });
    });
  });

  xit('validates methods', function (done) {

    this.mesh.api.exchange.explicit.methodName1({op: 'tions3'}, function (err, res) {
      res.should.be.an.instanceof(Error);
      done();
    });
  });

  require('benchmarket').stop();

});
