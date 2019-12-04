module.exports = Explicit;

var expect = require('expect.js');

function Explicit() {}

Explicit.prototype.asyncStart = function($happn, opts, optionalOpts, callback) {
  if (typeof callback === 'undefined') callback = optionalOpts;

  setTimeout(function() {
    callback(null);
  }, 200);
};

Explicit.prototype.asyncInit = function($happn, opts, optionalOpts, callback) {
  if (typeof callback === 'undefined') callback = optionalOpts;

  expect(opts.op).to.be('tions');

  var testUser = {
    username: 'TEST USER@blah.com',
    password: 'TEST PWD',
    custom_data: {
      something: 'useful'
    }
  };

  $happn.exchange.security.addUser(testUser).then(function() {
    callback(null);
  });
};

Explicit.prototype.asyncStartFails = function(callback) {
  callback(new Error('erm'));
};

Explicit.prototype.asyncInitFails = function(callback) {
  callback(new Error('erm'));
};

Explicit.prototype.methodName1 = function($happn, callback) {
  $happn.exchange.security.getUser('TEST USER@blah.com').then(function(user) {
    callback(null, user);
  });
};

if (global.TESTING_INIT_START) return; // When 'requiring' the module above,

var mesh;
var Mesh = require('../../..');

describe(
  require('../../__fixtures/utils/test_helper')
    .create()
    .testName(__filename, 3),
  function() {
    this.timeout(120000);

    before(function(done) {
      global.TESTING_INIT_START = true; //.............

      mesh = this.mesh = new Mesh();

      mesh.initialize(
        {
          happn: {
            port: 8001,
            secure: true
          },
          modules: {
            expliCit: {
              path: __filename
            }
          },
          components: {
            explicit: {
              accessLevel: 'mesh',
              moduleName: 'expliCit',
              startMethod: 'asyncStart',
              initMethod: 'asyncInit',
              schema: {
                exclusive: true,
                methods: {
                  asyncInit: {
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
                  asyncStart: {
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
                    parameters: [{ type: 'callback', required: true }]
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
      delete global.TESTING_INIT_START; //.............
      mesh.stop({ reconnect: false }, done);
    });

    it('validates init method created a user', function(done) {
      this.mesh.api.exchange.explicit.methodName1(function(err, user) {
        expect(user.username).to.be('TEST USER@blah.com');
        done();
      });
    });
  }
);
