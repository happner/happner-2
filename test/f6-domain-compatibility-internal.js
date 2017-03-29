
var Happner = require('../');
var Promise = require('bluebird');
var expect = require('expect.js');

describe('f6 - domain compatibility endpoint', function () {

  context('insecure', function () {

    var server;

    before('start server', function (done) {
      server = undefined;
      Happner.create({
        name: 'MESH_NAME',
        domain: 'DOMAIN_NAME',
        modules: {
          'component1': {
            instance: {
              relay: function ($happn, callback) {
                console.log('RELAY');
                $happn.exchange.component2.job(callback);
              }
            }
          },
          'component2': {
            instance: {
              job: function (callback) {
                callback(null, 'OK');
              }
            }
          }
        },
        components: {
          'component1': {},
          'component2': {}
        }
      }).then(function (_server) {
        server = _server;
        done();
      }).catch(done);
    });

    after('stop server', function (done) {
      if (!server) return done();
      server.stop({reconnect: false}, done);
    });

    it.only('one component can call another', function (done) {
      server.exchange.component1.relay(function (e, reply) {
        if (e) return done(e);
        expect(reply).to.be('OK');
      });
    });

    it('can subscribe to events on another component', function (done) {
    });

  });

  context('secure', function () {

    var server;

    it('one component can call another', function (done) {
    });

    it('can subscribe to events on another component', function (done) {
    });

  });

});
