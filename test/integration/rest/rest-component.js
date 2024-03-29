module.exports = SeeAbove;

function SeeAbove() {}

SeeAbove.prototype.method1 = function(opts, callback) {
  if (opts.errorAs === 'callback') return callback(new Error('THIS IS JUST A TEST'));
  if (opts.errorAs === 'throw') throw new Error('THIS IS JUST A TEST');

  opts.number++;
  callback(null, opts);
};

SeeAbove.prototype.method2 = function(opts, callback) {
  if (opts.errorAs === 'callback') return callback(new Error('THIS IS JUST A TEST'));
  if (opts.errorAs === 'throw') throw new Error('THIS IS JUST A TEST');

  opts.number++;
  callback(null, opts);
};

SeeAbove.prototype.method3 = function($happn, $origin, opts, callback) {
  if (opts.errorAs === 'callback') return callback(new Error('THIS IS JUST A TEST'));
  if (opts.errorAs === 'throw') throw new Error('THIS IS JUST A TEST');

  opts.number++;
  callback(null, opts);
};

SeeAbove.prototype.method4 = function($happn, $origin, number, another, callback) {
  callback(null, { product: parseInt(number) + parseInt(another) });
};

SeeAbove.prototype.method5 = function($happn, $req_headers, $req_method, callback) {
  callback(null, { headers: $req_headers, method: $req_method });
};

SeeAbove.prototype.method6 = function($happn, arg1, arg2, arg3, arg4, callback) {
  callback(null, { arg1: arg1, arg2: arg2, arg3: arg3, arg4: arg4 });
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

if (global.TESTING_E9) return; // When 'requiring' the module above,

var path = require('path');
var test = require('../../__fixtures/utils/test_helper').create();
describe(test.testName(__filename, 3), function() {
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

  var REMOTE_MESH = 'remote-mesh-insecure.js';

  this.timeout(120000);

  var mesh;
  var remote;

  var startRemoteMesh = function(callback) {
    var timedOut = setTimeout(function() {
      callback(new Error('remote mesh start timed out'));
    }, 60000);

    // spawn remote mesh in another process
    remote = spawn('node', [libFolder + REMOTE_MESH]);

    remote.stdout.on('data', function(data) {
      //process.stdout.write(data);

      if (data.toString().match(/READY/)) {
        clearTimeout(timedOut);

        setTimeout(function() {
          callback();
        }, 1000);
      }
    });
  };

  before(function(done) {
    global.TESTING_E9 = true; //.............

    startRemoteMesh(function(e) {
      if (e) return done(e);

      Mesh.create(
        {
          port: 10000,
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
          },
          endpoints: {
            remoteMesh: {
              // remote mesh node
              reconnect: {
                max: 2000, //we can then wait 10 seconds and should be able to reconnect before the next 10 seconds,
                retries: 100
              },
              config: {
                port: 10001,
                host: 'localhost'
              }
            }
          }
        },
        function(err, instance) {
          delete global.TESTING_E9; //.............
          mesh = instance;

          if (err) return done(err);
          mesh.exchange.remoteMesh.remoteComponent.remoteFunction('one', 'two', 'three', function(
            err
          ) {
            if (err) return done(err);
            done();
          });
        }
      );
    });
  });

  after(async () => {
    if (remote) remote.kill();
    if (mesh) await mesh.stop({ reconnect: false });
  });

  var happnUtils = require('../../../lib/system/utilities');

  var mock$Happn = {
    log: {
      error: test.sinon.stub(),
      info: test.sinon.stub()
    },
    _mesh: {
      utilities: happnUtils,
      config: {
        happn: {
          secure: false
        }
      }
    },
    exchange: {
      testComponent: {
        method1: function(opts, callback) {
          opts.number++;
          callback(null, opts);
        }
      }
    }
  };

  var mock$Origin = {};

  var mockResponse = {
    writeHead: function(code, header) {
      this.header = { code: code, header: header };
    }
  };

  it('tests the rest components __respond method', function(done) {
    var RestModule = require('../../../lib/modules/rest/index.js');
    var restModule = new RestModule();

    var testStage = 'success';

    mockResponse.end = function(responseString) {
      try {
        if (testStage === 'done') return;

        var response = JSON.parse(responseString);

        //TODO: an unexpected GET or POST with a non-json content

        if (testStage === 'success') {
          expect(response.message).to.be('test success response');
          expect(response.data.test).to.be('data');
          testStage = 'error';

          restModule.__respond(
            mock$Happn,
            'test success response',
            { test: 'data' },
            new Error('a test error'),
            mockResponse
          );
        }

        if (testStage === 'error') {
          expect(response.error).to.not.be(null);
          expect(response.error.message).to.be('a test error');

          testStage = 'done';

          done();
        }
      } catch (e) {
        done(e);
      }
    };

    restModule.__respond(mock$Happn, 'test success response', { test: 'data' }, null, mockResponse);
  });

  it('tests the rest components __parseBody method', function(done) {
    var RestModule = require('../../../lib/modules/rest/index.js');
    var restModule = new RestModule();
    var MockRequest = require('../../__fixtures/utils/helper_mock_req');

    var request = new MockRequest({
      method: 'POST',
      url: '/rest/api',
      headers: {
        Accept: 'application/json'
      }
    });

    request.write({
      parameters: {
        opts: {
          number: 1
        }
      }
    });

    request.end();

    mockResponse.end = function(responseString) {
      var response = JSON.parse(responseString);

      if (!response.error) return done(new Error('bad response expected error'));

      done(new Error(response.error));
    };

    restModule.__parseBody(request, mockResponse, mock$Happn, function(body) {
      expect(body).to.not.be(null);
      expect(body).to.not.be(undefined);
      expect(body.parameters.opts.number).to.be(1);

      done();
    });
  });

  it('tests the rest components describe method over the api', function(done) {
    var restClient = require('restler');

    restClient.get('http://localhost:10000/rest/describe').on('complete', function(result) {
      expect(result.data['/testComponent/method1']).to.not.be(null);
      expect(result.data['/testComponent/method2']).to.not.be(null);

      // expect(result.data['/remoteMesh/remoteComponent/remoteFunction'].parameters['one']).to.be('{{one}}');
      // expect(result.data['/remoteMesh/remoteComponent/remoteFunction'].parameters['two']).to.be('{{two}}');
      // expect(result.data['/remoteMesh/remoteComponent/remoteFunction'].parameters['three']).to.be('{{three}}');

      done();
    });
  });

  it('tests the rest components handleRequest method', function(done) {
    var RestModule = require('../../../lib/modules/rest/index.js');
    var restModule = new RestModule();

    restModule.__exchangeDescription = {
      components: {
        testComponent: {
          methods: {
            method1: {
              parameters: [{ name: 'opts' }, { name: 'callback' }]
            }
          }
        }
      }
    };

    var MockRequest = require('../../__fixtures/utils/helper_mock_req');
    var request = new MockRequest({
      method: 'POST',
      url: 'testComponent/method1',
      headers: {
        Accept: 'application/json'
      }
    });

    var operation = {
      parameters: {
        opts: { number: 1 }
      }
    };

    request.write(operation);

    request.end();

    mockResponse.end = function(responseString) {
      var response = JSON.parse(responseString);
      test.log(response);
      expect(response.data.number).to.be(2);
      done();
    };

    restModule.handleRequest(request, mockResponse, mock$Happn, mock$Origin);
  });

  it('tests posting an operation to a local method', function(done) {
    var restClient = require('restler');

    var operation = {
      parameters: {
        opts: { number: 1 }
      }
    };

    restClient
      .postJson('http://localhost:10000/rest/method/testComponent/method1', operation)
      .on('complete', function(result) {
        test.log(result);
        expect(result.data.number).to.be(2);

        done();
      });
  });

  it('tests getting an operation from a local method with a simple parameter set', function(done) {
    var restClient = require('restler');

    restClient
      .get('http://localhost:10000/rest/method/testComponent/method4?number=1&another=2')
      .on('complete', function(result) {
        expect(result.data.product).to.be(3);
        done();
      });
  });

  it('tests request information is available to a method', function(done) {
    var restClient = require('restler');

    restClient
      .get('http://localhost:10000/rest/method/testComponent/method5')
      .on('complete', function(result) {
        expect(result.data).to.not.be(null);
        expect(result.data.method).to.be('GET');
        expect(result.data.headers).to.not.be(null);
        done();
      });
  });

  it('tests request expected falsy params are passed to method and not changed to null', function(done) {
    const restClient = require('restler');

    const operation = {
      parameters: {
        arg1: 0,
        arg2: null,
        arg3: false,
        arg4: ''
      }
    };

    restClient
      .postJson('http://localhost:10000/rest/method/testComponent/method6', operation)
      .on('complete', function(result) {
        expect(result.error).not.exist;
        expect(result.data).to.eql(operation.parameters);
        done();
      });
  });

  it('tests getting an operation from a local method with a serialized parameter', function(done) {
    var restClient = require('restler');

    var operation = {
      parameters: {
        number: 1,
        another: 2
      }
    };

    var encoded = encodeURIComponent(JSON.stringify(operation));

    restClient
      .get('http://localhost:10000/rest/method/testComponent/method4?encoded_parameters=' + encoded)
      .on('complete', function(result) {
        expect(result.data.product).to.be(3);
        done();
      });
  });

  it('tests posting an operation to a remote method fails', function(done) {
    var restClient = require('restler');

    var operation = {
      parameters: {
        one: 'one',
        two: 'two',
        three: 'three'
      }
    };

    restClient
      .postJson(
        'http://localhost:10000/rest/method/remoteMesh/remoteComponent/remoteFunction',
        operation
      )
      .on('complete', function(result) {
        expect(result.error).to.not.be(null);
        expect(result.error.message).to.be('attempt to access remote mesh: remoteMesh');

        done();
      });
  });

  it('tests posting an operation to a bad method', function(done) {
    var restClient = require('restler');

    var operation = {
      parameters: {
        opts: { number: 1 }
      }
    };
    restClient
      .postJson('http://localhost:10000/rest/method/blithering_idiot/testmethod', operation)
      .on('complete', function(result) {
        expect(result.error.message).to.be('component blithering_idiot does not exist on mesh');

        done();
      });
  });

  it('tests posting an operation to the security component fails', function(done) {
    //TODO login function gives us a token, token is used in body of rest request

    var restClient = require('restler');

    var operation = {
      parameters: {
        username: '_ADMIN',
        password: 'blah'
      }
    };

    restClient
      .postJson('http://localhost:10000/rest/method/security/updateOwnUser', operation)
      .on('complete', function(result) {
        expect(result.error.number).to.not.be(null);
        expect(result.error.message).to.be('attempt to access security component over rest');
        done();
      });
  });

  it('tests posting an operation an unsecured mesh, with a token works', function(done) {
    var restClient = require('restler');

    var operation = {
      parameters: {
        opts: { number: 1 }
      }
    };

    restClient
      .postJson(
        'http://localhost:10000/rest/method/testComponent/method1?happn_token=' + 'blahblah',
        operation
      )
      .on('complete', function(result) {
        expect(result.data.number).to.be(2);
        done();
      });
  });

  it('tests posting an operation to a local method, bad uri component', function(done) {
    var restClient = require('restler');

    var operation = {
      parameters: {
        opts: { number: 1 }
      }
    };
    restClient
      .postJson('http://localhost:10000/rest/method/nonexistant/uri', operation)
      .on('complete', function(result) {
        expect(result.error.message).to.be('component nonexistant does not exist on mesh');

        done();
      });
  });

  it('tests posting an operation to a local method, bad uri method', function(done) {
    var restClient = require('restler');

    var operation = {
      parameters: {
        opts: { number: 1 }
      }
    };
    restClient
      .postJson('http://localhost:10000/rest/method/testComponent/nonexistant', operation)
      .on('complete', function(result) {
        expect(result.error.message).to.be(
          'method nonexistant does not exist on component testComponent'
        );

        done();
      });
  });

  //require('benchmarket').stop();
});
