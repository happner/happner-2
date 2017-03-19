var expect = require('expect.js');
var Happner = require('..');

describe('g2 - local events', function () {

  var server;

  before('start server', function (done) {
    Happner.create({
      modules: {
        'component1': {
          instance: {
            start: function ($happn, callback) {
              setInterval(function () {


                $happn.localEmit('eventName', {some: 'data'});


              }, 100);
              callback();
            }
          }
        },
        'component2': {
          instance: {
            start: function ($happn, callback) {
              callback();
            },
            awaitLocalEvent: function ($happn, callback) {


              $happn.localEvent.component1.once('eventName', function (data) {
                callback(null, data);
              });


            }
          }
        }
      },
      components: {
        'component1': {
          startMethod: 'start'
        },
        'component2': {
          startMethod: 'start'
        }
      }
    })
      .then(function (_server) {
        server = _server;
      })
      .then(done).catch(done);
  });

  after('stop server', function (done) {
    if (!server) return done();
    server.stop({reconnect: false}, done);
  });

  it('can subscribe to and emit local events from within components', function (done) {

    server.exchange.component2.awaitLocalEvent()
      .then(function (result) {
        expect(result).to.eql({some: 'data'});
      })
      .then(done).catch(done);

  });

  it('can subscribe to local events from mesh', function (done) {

    server.localEvent.component1.once('eventName', function (data) {
      expect(data).to.eql({some: 'data'});
      done();
    });

  });

});
