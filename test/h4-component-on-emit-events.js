var path = require('path');
var filename = path.basename(__filename);

describe.only(filename, function () {

  var expect = require('expect.js');
  var server, client;
  var Happner = require('../');

  before('start a mesh with 2 components, and a client', function (done) {

    Happner.create({
        modules: {
          'componentName': {
            path: __dirname + path.sep + 'lib' + path.sep + 'h4-component'
          }
        },
        components: {
          'component1': {
            moduleName:'componentName',
            startMethod:'initialize'
          },
          'component2': {
            moduleName:'componentName',
            startMethod:'initialize'
          }
        }
      })
      .then(function (_server) {
        server = _server;
      })
      .then(done)
      .catch(done);

  });

  before('start client', function (done) {

    var _client = new Happner.MeshClient();
    _client.login()
      .then(function () {
        client = _client;
      })
      .then(done)
      .catch(done);
  });

  after('stop client', function (done) {

    if (!client) return done();
    client.disconnect(done);
  });

  after('stop server', function (done) {

    if (!server) return done();
    server.stop({reconnect: false}, done);
  });

  /*
   QUEUED: 0, //get a consistency report back after the subscribes have been notified
   DEFERRED: 1, //queues the publication, then calls back
   TRANSACTIONAL: 2, //waits until all recipients have been written to
   ACKNOWLEDGED: 3 //waits until all recipients have acknowledged
   */

  it('tests an emit using the default transactional consistency, checks the on-emit-ok event', function (done) {

    client.exchange.component1.causeEmit('default-transactional', 'default-transactional', {}, function(e){

      if (e) return done(e);

      client.exchange.component1.getEvents(function(e, events){

        if (e) return done(e);

        console.log(JSON.stringify(events, null, 2));

        expect(events[0]).to.not.be(null);

        done();
      });
    });

  });

  it('tests an emit using the queued transactional consistency, checks the on-emit-ok event', function (done) {

    client.exchange.component1.causeEmit('default-transactional', 'default-transactional', {consistency:0}, function(e){

      if (e) return done(e);

      client.exchange.component1.getEvents(function(e, events){

        if (e) return done(e);

        console.log(JSON.stringify(events, null, 2));

        expect(events[0]).to.not.be(null);

        done();
      });
    });

  });

  it('tests an emit using the deferred transactional consistency, checks the on-emit-ok event', function (done) {

    client.exchange.component1.causeEmit('default-transactional', 'default-transactional', {consistency:1}, function(e){

      if (e) return done(e);

      client.exchange.component1.getEvents(function(e, events){

        if (e) return done(e);

        console.log(JSON.stringify(events, null, 2));

        expect(events.ok).to.not.be(null);

        expect(events.publishOK.successful).to.be(1);

        done();
      });
    });
  });

  it('tests an emit using the acknowledged transactional consistency, checks the on-emit-ok event', function (done) {

    client.exchange.component1.causeEmit('default-transactional', 'default-transactional', {consistency:3}, function(e){

      if (e) return done(e);

      client.exchange.component1.getEvents(function(e, events){

        if (e) return done(e);

        console.log(JSON.stringify(events, null, 2));

        expect(events.ok).to.not.be(null);

        expect(events.publishOK.successful).to.be(1);

        done();
      });
    });

  });

  xit('tests a failing event emit makes it to the on-emit-error event', function (done) {

  });
});
