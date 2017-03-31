
var Happner = require('../');
var Promise = require('bluebird');
var expect = require('expect.js');

describe('f6 - domain compatibility endpoint', function () {

  function test (secure) {

    var server;

    before('start server', function (done) {
      server = undefined;
      Happner.create({
        name: 'MESH_NAME',
        domain: 'DOMAIN_NAME',
        happn: {
          secure: secure
        },
        modules: {
          'component1': {
            instance: {
              start: function ($happn, callback) {
                this.interval = setInterval(function () {
                  $happn.emit('test/event', {some: 'data'});
                }, 1000);
                callback();
              },
              stop: function (callback) {
                clearInterval(this.interval);
                callback();
              },
              relay: function ($happn, callback) {
                $happn.exchange.component2.job(callback);
              }
            }
          },
          'component2': {
            instance: {
              job: function (callback) {
                callback(null, 'OK');
              },
              awaitEvent: function ($happn, callback) {
                var subscriberId;
                $happn.event.component1.on('test/event', function (data, meta) {
                  $happn.event.component1.off(subscriberId);
                  callback(null, data);
                }, function (e, _subscriberId) {
                  if (e) return callback(e);
                  subscriberId = _subscriberId;
                });
              }
            }
          }
        },
        components: {
          'component1': {
            startMethod: 'start',
            stopMethod: 'stop'
          },
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

    it('one component can call another', function (done) {
      server.exchange.component1.relay(function (e, reply) {
        if (e) return done(e);
        expect(reply).to.be('OK');
        done();
      });
    });

    it('can subscribe to events on another component', function (done) {
      server.exchange.component2.awaitEvent(function (e, reply) {
        if (e) return done(e);
        expect(reply).to.eql({some: 'data'});
        done();
      });
    });

  }

  context('insecure', function () {

    var secure = false;
    test(secure);

  });

  context('secure', function () {

    var secure = true;
    test(secure);

  });

});
