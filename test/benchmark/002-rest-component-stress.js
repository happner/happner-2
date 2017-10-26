module.exports = SeeAbove;

function SeeAbove() {}

SeeAbove.prototype.method1 = function (opts, callback) {

  if (opts.errorAs == 'callback') return callback(new Error('THIS IS JUST A TEST'));
  if (opts.errorAs == 'throw') throw new Error('THIS IS JUST A TEST');

  opts.number++;
  callback(null, opts);
};

SeeAbove.prototype.method2 = function (opts, callback) {

  if (opts.errorAs == 'callback') return callback(new Error('THIS IS JUST A TEST'));
  if (opts.errorAs == 'throw') throw new Error('THIS IS JUST A TEST');

  opts.number++;
  callback(null, opts);
};

SeeAbove.prototype.method3 = function ($happn, $origin, opts, callback) {

  if (opts.errorAs == 'callback') return callback(new Error('THIS IS JUST A TEST'));
  if (opts.errorAs == 'throw') throw new Error('THIS IS JUST A TEST');

  opts.number++;
  callback(null, opts);
};

SeeAbove.prototype.synchronousMethod = function(opts, opts2){
  return opts + opts2;
};

SeeAbove.prototype.$happner = {
  config: {
    'testComponent': {
      schema: {
        methods: {
          'methodName1': {
            alias: 'ancientmoth'
          },
          'methodName2': {
            alias: 'ancientmoth'
          },
          'synchronousMethod': {
            type: 'sync-promise'//NB - this is how you can wrap a synchronous method with a promise
          }
        }
      }
    }
  }
};


if (global.TESTING_REST_COMP_STRESS) return; // When 'requiring' the module above,

/**
 * Simon Bishop
 * @type {expect}
 */

describe(require('../__fixtures/utils/test_helper').create().testName(__filename), function () {

  var sep = require('path').sep;

  var spawn = require('child_process').spawn;

  // Uses unit test 2 modules
  var expect = require('expect.js');

  var Mesh = require('../..');

  var path = require('path');

  var libFolder = __dirname + sep + '__fixtures' + sep;

  var async = require('async');

  var REMOTE_MESH = '002-remote-mesh';

  this.timeout(120000);

  var mesh;
  var remote;

  var startRemoteMesh = function(callback){

    var timedOut = setTimeout(function(){
      callback(new Error('remote mesh start timed out'));
    },5000);

    console.log('starting remote:::', libFolder + REMOTE_MESH);

    // spawn remote mesh in another process
    remote = spawn('node', [libFolder + REMOTE_MESH]);

    remote.stdout.on('data', function (data) {

      if (data.toString().match(/READY/)) {

        clearTimeout(timedOut);

        setTimeout(function(){
          callback();
        },1000);
      } else console.log('REMOTE:::',data.toString());
    });
  };

  before(function (done) {

    global.TESTING_REST_COMP_STRESS = true; //.............

    startRemoteMesh(function(e){

      if (e) return done(e);

      Mesh.create({
        port: 10000,
        util: {
          // logger: {}
        },
        modules: {
          'testComponent': {
            path: __filename   // .............
          }
        },
        components: {
          'testComponent': {}
        },
        endpoints:{
          'remoteMesh': {  // remote mesh node
            reconnect:{
              max:2000, //we can then wait 10 seconds and should be able to reconnect before the next 10 seconds,
              retries:100
            },
            config: {
              port: 10001,
              host: 'localhost'
            }
          }
        }
      }, function (err, instance) {

        delete global.TESTING_REST_COMP_STRESS; //.............
        mesh = instance;

        if (err) return done(err);
        mesh.exchange.remoteMesh.remoteComponent.remoteFunction('one','two','three', function(err, result){
          if (err) return done(err);
          done();
        });
      });

    });
  });

  after(function (done) {

    this.timeout(30000);

    var completeDisconnect = function(){
      if (remote) remote.kill();
      done();
    };

    if (mesh) return mesh.stop({reconnect: false}, completeDisconnect);

    completeDisconnect();
  });

  var CONNECTIONS_COUNT = 1000;

  var generateRequests = function(testKey, count){
    var requests = [];

    for (var i = 0;i < count; i++){
      var operation = {
        uri:'testComponent/method1',
        parameters:{
          'opts':{'number':i},
          'key':testKey
        }
      };

      requests.push(operation);
    }

    return requests;
  };

  var verifyResponses = function(responses, done){

    var errors = [];

    responses.map(function(response){

      try{

        expect(response.request.parameters.opts.number).to.be(response.response.data.number - 1);
      }catch(e){
        errors.push(response);
      }

    });

    if (errors.length == 0) return done();
    else {
      console.log(errors);
      return done(new Error('failures found in responses:::'));
    }

  };

  xit('tests N posts to the REST component in parallel', function(done){

    var requests = generateRequests('PARALLEL', CONNECTIONS_COUNT);
    var responses = [];
    var restClient = require('restler');

    async.each(requests, function(request, requestCB){

      restClient.postJson('http://localhost:10000/rest/method/' + request.uri, request).on('complete', function(result){

        responses.push({request:request, response:result});

        requestCB();
      });

    }, function(e){

      if (e) return done(e);

      return verifyResponses(responses, done);

    });
  });

  it('tests N posts to the REST component in series', function(done){

    var requests = generateRequests('SERIES', CONNECTIONS_COUNT);
    var responses = [];
    var restClient = require('restler');

    async.eachSeries(requests, function(request, requestCB){

      restClient.postJson('http://localhost:10000/rest/method/' + request.uri, request).on('complete', function(result){

        responses.push({request:request, response:result});

        requestCB();
      });

    }, function(e){

      if (e) return done(e);

      return verifyResponses(responses, done);

    });

  });
});
