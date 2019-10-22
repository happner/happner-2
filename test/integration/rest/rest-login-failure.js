/* RUN: LOG_LEVEL=off mocha test/18-exchange-promises.js */

module.exports = SeeAbove;

function SeeAbove() {}

SeeAbove.prototype.method1 = function(opts, callback) {
  if (opts.errorAs == 'callback') return callback(new Error('THIS IS JUST A TEST'));
  if (opts.errorAs == 'throw') throw new Error('THIS IS JUST A TEST');

  opts.number++;
  callback(null, opts);
};

SeeAbove.prototype.method2 = function(opts, callback) {
  if (opts.errorAs == 'callback') return callback(new Error('THIS IS JUST A TEST'));
  if (opts.errorAs == 'throw') throw new Error('THIS IS JUST A TEST');

  opts.number++;
  callback(null, opts);
};

SeeAbove.prototype.method3 = function($happn, $origin, opts, callback) {
  if (opts.errorAs == 'callback') return callback(new Error('THIS IS JUST A TEST'));
  if (opts.errorAs == 'throw') throw new Error('THIS IS JUST A TEST');

  opts.number++;
  callback(null, opts);
};

SeeAbove.prototype.method4 = function($happn, $origin, number, another, callback) {
  callback(null, { product: parseInt(number) + parseInt(another) });
};

SeeAbove.prototype.method5 = function($happn, $origin, $userSession, $restParams, callback) {
  $restParams.$userSession = $userSession;
  $restParams.$origin = $origin;
  callback(null, $restParams);
};

SeeAbove.prototype.method6 = function succeedWithEmptyResponse(
  $happn,
  $origin,
  $userSession,
  $restParams,
  callback
) {
  callback();
};

SeeAbove.prototype.synchronousMethod = function(opts, opts2) {
  return opts + opts2;
};

SeeAbove.prototype.$happner = {
  config: {
    testComponent: {
      schema: {
        methods: {
          methodName1: {
            alias: 'ancientmoth'
          },
          methodName2: {
            alias: 'ancientmoth'
          },
          synchronousMethod: {
            type: 'sync-promise' //NB - this is how you can wrap a synchronous method with a promise
          }
        }
      }
    }
  }
};

if (global.TESTING_E3B) return; // When 'requiring' the module above,

var path = require('path');

describe(
  require('../../__fixtures/utils/test_helper')
    .create()
    .testName(__filename, 3),
  function() {
    /**
     * Simon Bishop
     * @type {expect}
     */

    var spawn = require('child_process').spawn;

    // Uses unit test 2 modules
    var expect = require('expect.js');

    var Mesh = require('../../..');

    var libFolder =
      path.resolve(__dirname, '../../..') +
      path.sep +
      ['test', '__fixtures', 'test', 'integration', 'rest'].join(path.sep) +
      path.sep;

    var REMOTE_MESH = 'remote-mesh-secure.js';

    var ADMIN_PASSWORD = 'ADMIN_PASSWORD';

    this.timeout(120000);

    var mesh;
    var remote;

    var startRemoteMesh = function(callback) {
      var timedOut = setTimeout(function() {
        callback(new Error('remote mesh start timed out'));
      }, 5000);

      // spawn remote mesh in another process
      remote = spawn('node', [libFolder + REMOTE_MESH]);

      remote.stdout.on('data', function(data) {
        if (data.toString().match(/READY/)) {
          clearTimeout(timedOut);

          setTimeout(function() {
            callback();
          }, 1000);
        }
      });
    };

    before(function(done) {
      global.TESTING_E3B = true; //.............

      try {
        Mesh.create(
          {
            name: 'e3b-test',
            happn: {
              secure: true,
              adminPassword: ADMIN_PASSWORD,
              port: 10000
            },
            util: {
              // logger: {}
            },
            modules: {
              testComponent: {
                path: __filename // .............
              }
            },
            components: {
              testComponent: {}
            }
          },
          function(err, instance) {
            delete global.TESTING_E3B; //.............

            if (err) return done(err);

            mesh = instance;

            done();
          }
        );
      } catch (e) {
        done(e);
      }
    });

    after(function(done) {
      this.timeout(30000);

      if (!mesh) {
        if (remote) remote.kill();
        return done();
      }

      mesh.stop({ reconnect: false }, done);
    });

    var login = function(done, credentials) {
      var restClient = require('restler');

      var operation = {
        username: '_ADMIN',
        password: ADMIN_PASSWORD
      };

      if (credentials) operation = credentials;

      restClient
        .postJson('http://localhost:10000/rest/login', operation)
        .on('complete', function(result) {
          if (result.error) return done(new Error(result.error.message), result);
          done(null, result);
        });
    };

    it('tests the rest components login method over the wire', function(done) {
      login(function(e, response) {
        if (e) return done(e);
        expect(response.data.token).to.not.be(null);
        done();
      });
    });

    it('tests the rest components login method fails', function(done) {
      login(
        function(e, result) {
          expect(e).to.not.be(null);
          expect(result.error.message).to.be('Invalid credentials');
          expect(result.error.code).to.be(401);
          done();
        },
        { username: 'bad', password: 'bad' }
      );
    });
  }
);
