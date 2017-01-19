// connect old happner client to new happner server
// (use config.domain to support load balancer)

var OldHappner = require('happner');
var Happner = require('../');
var expect = require('expect.js');

describe('f5 - domain compatibility client', function () {

  var server, client;

  before('start server', function (done) {
    server = undefined;
    Happner.create({
      name: 'MESH_NAME',
      // domain: 'MESH_DOMAIN', // domain name is inherited from mesh name if unspecified
      modules: {
        'testComponent': {
          instance: {
            method: function ($happn, callback) {
              // return inherited domain name
              callback(null, $happn.info.mesh.domain);
            },
            sendEvent: function ($happn, callback) {
              $happn.emit('/event', $happn.info.mesh.domain);
              callback();
            }
          }
        }
      },
      components: {
        testComponent: {}
      }
    }).then(function (_server) {
      server = _server;
      done();
    }).catch(done);
  });

  before('start client', function (done) {
    var x = new OldHappner.MeshClient();
    x.login().then(function () {
      client = x;
      done();
    }).catch(done);
  });

  after('stop client', function (done) {
    if (!client) return done();
    client.disconnect(done);
  });

  after('stop server', function (done) {
    if (!server) return done();
    server.stop({reconnect: false}, done);
  });

  it('can call component methods', function (done) {
    client.exchange.testComponent.method()
      .then(function (result) {
        expect(result).to.equal('MESH_NAME'); // inherited domain name
      })
      .then(done).catch(done);
  });

  it('can subscribe to events', function (done) {
    client.event.testComponent.on('/event', function (data) {
      try {
        expect(data).to.eql({value: 'MESH_NAME'});
        done();
      } catch (e) {
        done(e);
      }
    });
    client.exchange.testComponent.sendEvent().catch(done);
  });

  it('can use data', function (done) {
    client.data.set('/some/path', {val: 'ue'}, function (e) {
      if (e) return done(e);
      client.data.get('/some/path', function (e, result) {
        delete(result._meta);
        expect(result).to.eql({val: 'ue'});
        done();
      });
    })
  });

});
