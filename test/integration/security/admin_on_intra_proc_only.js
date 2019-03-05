const log = require('why-is-node-running');
describe(require('../../__fixtures/utils/test_helper').create().testName(__filename, 3), function() {

  var happner = require('../../../lib/mesh');
  var happner_client = happner.client;

  var adminClient;
  var expect = require('expect.js');
  var test_id = Date.now() + '_' + require('shortid').generate();

  var testClient;
  var serviceInstance;
  var serviceInstanceLocked;
  var serviceInstanceLockedConvenient;

  var getService = function(config, cb) {
    return happner.create(config, cb);
  };

  before('it starts secure defaulted service', function(done) {

    getService({
      secure: true,
      port: 55000
    }, function(e, instance){
      if (e) return done(e);
      serviceInstance = instance;
      done();
    });
  });

  before('it starts secure locked down service', function(done) {

    getService({
      secure: true,
      port: 55001,
      happn: {
        services: {
          security: {
            config: {
              disableDefaultAdminNetworkConnections: true
            }
          }
        }
      },
      modules: {
        'module': {
          instance: {
            method1: function ($happn, callback) {
              $happn.emit('event1');
              callback(null, 'reply1');
            },
            method2: function ($happn, callback) {
              $happn.emit('event2');
              callback(null, 'reply2');
            },
            webmethod1: function (req, res) {
              res.end('ok1');
            },
            webmethod2: function (req, res) {
              res.end('ok2');
            }
          }
        }
      },
      components: {
        'component': {
          module: 'module',
          web: {
            routes: {
              webmethod1: 'webmethod1',
              webmethod2: 'webmethod2'
            }
          }
        }
      }
    }, function(e, instance){
      if (e) return done(e);
      serviceInstanceLocked = instance;
      done();
    });
  });

  before('it starts secure locked down service, convenience option', function(done) {

    getService({
      secure: true,
      port: 55002,
      happn: {
        disableDefaultAdminNetworkConnections: true
      }
    }, function(e, instance){
      if (e) return done(e);
      serviceInstanceLockedConvenient = instance;
      done();
    });
  });

  after('should disconnect the test clients', function(done) {

    this.timeout(10000);

    if (!testClient) return done();

    testClient.disconnect({
      reconnect: false
    }, done);
  });

  after('should stop the serviceInstance', function(done) {

    this.timeout(10000);
    if (!serviceInstance) return done();
    serviceInstance.stop(done);
  });

  after('should stop the serviceInstanceLocked', function(done) {

    this.timeout(10000);
    if (!serviceInstanceLocked) return done();
    serviceInstanceLocked.stop(done);
  });

  after('should stop the serviceInstanceLockedConvenient', function(done) {

    this.timeout(10000);
    if (!serviceInstanceLockedConvenient) return done();
    serviceInstanceLockedConvenient.stop(done);
  });

  it('authenticates with the _ADMIN user, using the default password on the non-locked service', function(done) {

    var testClient = new happner.MeshClient();

    testClient.login({
        username: '_ADMIN',
        password: 'happn'
    }, done);
  });

  it('fails to authenticate with the _ADMIN user, on the locked service', function(done) {

    var failClient = new happner.MeshClient({port: 55001});

    failClient.login({
        username: '_ADMIN',
        password: 'happn',

    }, function(e, instance) {

      expect(e.toString()).to.be('AccessDenied: use of _ADMIN credentials over the network is disabled');
      done();
    });
  });

  it('fails to authenticate with the _ADMIN user, on the convenience locked service', function(done) {

    var failClient = new happner.MeshClient({port: 55002});

    failClient.login({
        username: '_ADMIN',
        password: 'happn'
    }, function(e) {

      expect(e.toString()).to.be('AccessDenied: use of _ADMIN credentials over the network is disabled');
      done();
    });
  });

  var http = require('http');

  function doRequest(path, token, port, callback) {

    var request = require('request');
    var options;

    if (!token) options = {
        url: 'http://127.0.0.1:' + port + path
      };
    else options = {
        url: 'http://127.0.0.1:' + port + path + '?happn_token=' + token
      };

    request(options, function (error, response, body) {
      callback(error, body);
    });
  }

  it('fails to authenticate with the _ADMIN user, over a web post', function(done) {

    doRequest('/auth/login?username=_ADMIN&password=happn', null, 55001, function(e, body){
      expect(JSON.parse(body).error.message).to.be('use of _ADMIN credentials over the network is disabled');
      done();
    });
  });

  it('proves we are able to execute on local exchange methods', function(done){

    serviceInstanceLocked.event.component.on('event1', function () {

      // ensure not allowed
      serviceInstanceLocked.exchange.component.method2()
        .then(function(){
          done();
        })
        .catch(done);
    });
    serviceInstanceLocked.exchange.component.method1().catch(done);
  });
});
