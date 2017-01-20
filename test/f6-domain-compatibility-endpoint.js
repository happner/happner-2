// connect old happner endpoint to new happner server
// (use config.domain to support load balancer)

var OldHappner = require('happner');
var Happner = require('../');
var Promise = require('bluebird');

describe.only('f6 - domain compatibility endpoint', function () {

  var server, endpoint;

  before('start server', function (done) {
    server = undefined;
    Happner.create({
      name: 'MESH_NAME',
      domain: 'DOMAIN_NAME',
      happn: {
        secure: true
      },
      modules: {
        'testComponent': {
          instance: {
            method: function($happn, callback) {
              callback(null, $happn.info.mesh.domain);
            }
          }
        }
      },
      components: {
        'testComponent': {}
      }
    }).then(function (_server) {
      server = _server;
      done();
    }).catch(done);
  });

  before('create user', function (done) {
    var security = server.exchange.security;
    var group = {
      name: 'group',
      permissions: {
        events: {},
        // data: {},
        methods: {
          '/DOMAIN_NAME/testComponent/method': {authorized: true}
        }
      }
    };
    var user = {
      username: 'username',
      password: 'password'
    };

    Promise.all([
      security.addGroup(group),
      security.addUser(user)
    ])
      .spread(security.linkGroup)
      .then(function() {
        done();
      }).catch(done);
  });

  before('start endpoint', function (done) {
    endpoint = undefined;
    OldHappner.create({
      port: 55001,
      endpoints: {
        'DOMAIN_NAME': {
          config: {
            username: 'username',
            password: 'password'
          }
        }
      }
    }).then(function (_endpoint) {
      endpoint = _endpoint;
      done();
    }).catch(done);
  });

  after('stop endpoint', function (done) {
    if (!endpoint) return done();
    endpoint.stop({reconnect: false}, done);
  });

  after('stop server', function (done) {
    if (!server) return done();
    server.stop({reconnect: false}, done);
  });

  it('security');

  it('can call component methods');

  it('can subscribe to events');

  it('can use shared data');

});
