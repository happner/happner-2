describe(require('../../__fixtures/utils/test_helper').create().testName(__filename, 3), function () {

  var path = require('path');
  var expect = require('expect.js');
  var server, client;
  var Happner = require('../../..');

  var libFolder = path.resolve(__dirname, '../../..') + path.sep + ['test', '__fixtures', 'test', 'integration', 'events'].join(path.sep);

  this.timeout(5000);

  beforeEach('start a mesh with 2 components, and a client', function (done) {

    Happner.create({
        modules: {
          'module': {
            path: libFolder + path.sep + 'component-on-emit-events'
          }
        },
        components: {
          'component1': {
            moduleName:'module',
            startMethod:'initialize'
          },
          'component2': {
            moduleName:'module',
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

  beforeEach('start client', function (done) {

    var _client = new Happner.MeshClient();
    _client.login()
      .then(function () {
        client = _client;
      })
      .then(done)
      .catch(done);
  });

  afterEach('stop client', function (done) {

    if (!client) return done();
    client.disconnect(done);
  });

  afterEach('stop server', function (done) {

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
        expect(events.ok).to.not.be(null);
        expect(events.publishOK.successful).to.be(1);

        done();
      });
    });
  });

  it('tests an emit using the acknowledged transactional consistency, checks the on-emit-ok event', function (done) {

    client.exchange.component1.causeEmit('default-transactional', 'default-transactional', {consistency:3}, function(e){

      if (e) return done(e);

      setTimeout(()=>{
        client.exchange.component1.getEvents(function(e, events){
          if (e) return done(e);
          expect(events.ok).to.not.be(null);
          expect(events.publishOK.successful).to.be(1);
          done();
        });
      }, 2000)
    });
  });

  it('tests a failing event emit makes it to the on-emit-error event', function (done) {

    client.exchange.component1.causeEmitError('default-transactional', 'default-transactional', {consistency:0}, function(e){

      if (e) return done(e);

      client.exchange.component1.getEvents(function(e, events){

        if (e) return done(e);

        expect(events.error).to.be('Error: TEST ERROR');

        expect(events.publishError).to.be('Error: TEST ERROR');

        done();
      });
    });
  });

  it('tests off([string] across components and clients', function (done) {

    this.timeout(5000);

    var clientEvents = [];

    client.data.on('/_events/*/component1/test-concurrent-event', function(data){

      clientEvents.push(data);

    }, function(e){

      if (e) return done(e);

      client.exchange.component1.causeEmitConcurrent('test-concurrent-event', 'default-transactional', {}, function(e){

        if (e) return done(e);

        client.exchange.component2.getConcurrentEvents(function(e, events){

          if (e) return done(e);

          expect(events.length).to.be(1);

          client.exchange.component1.causeOffConcurrent('test-concurrent-event', function(e){

            if (e) return done(e);

            client.exchange.component1.causeEmitConcurrent('test-concurrent-event', 'default-transactional', {}, function(e){

              if (e) return done(e);

              client.exchange.component2.getConcurrentEvents(function(e, events){

                if (e) return done(e);

                expect(events.length).to.be(1);

                //now do a bunch
                client.exchange.component1.causeEmitConcurrent('test-concurrent-event', 'default-transactional', {});
                client.exchange.component1.causeEmitConcurrent('test-concurrent-event', 'default-transactional', {});
                client.exchange.component1.causeEmitConcurrent('test-concurrent-event', 'default-transactional', {});

                setTimeout(function(){

                  client.exchange.component2.getConcurrentEvents(function(e, events) {

                    if (e) return done(e);

                    expect(events.length).to.be(1);

                    expect(clientEvents.length).to.be(5);

                    done();

                  });

                }, 2000);

              });
            });
          });
        });
      });
    });
  });

  it('tests off([listenerId] across components and clients', function (done) {

    this.timeout(5000);

    var clientEvents = [];
    var currentListenerId;

    client.data.on('/_events/*/component1/test-listener-id', function(data){

      clientEvents.push(data);

    }, function(e, listenerId){

      if (e) return done(e);

      currentListenerId = listenerId;

      client.exchange.component1.causeEmitListener('test-listener-id', 'default-transactional', {}, function(e){

        if (e) return done(e);

        client.exchange.component2.getListenerEvents(function(e, events){

          if (e) return done(e);

          expect(events.length).to.be(1);

          client.data.off(currentListenerId, function(e){

            if (e) return done(e);

            client.exchange.component1.causeOffConcurrent('test-listener-id', function(e){

              if (e) return done(e);

              client.exchange.component1.causeEmitListener('test-listener-id', 'default-transactional', {}, function(e){

                if (e) return done(e);

                client.exchange.component2.getListenerEvents(function(e, events){

                  if (e) return done(e);

                  setTimeout(function(){

                    expect(events.length).to.be(1);
                    expect(clientEvents.length).to.be(1);

                    done();

                  }, 2000);

                });
              });
            });
          });
        });
      });
    });
  });

  it('tests event.once', function (done) {

    this.timeout(5000);

    var clientEvents = [];
    var currentListenerId;

    client.event.component1.once('test-listener-id', function(data){

      clientEvents.push(data);

    }, function(e, listenerId){

      if (e) return done(e);

      currentListenerId = listenerId;

      client.exchange.component1.causeEmitListener('test-listener-id', 'default-transactional', {});
      client.exchange.component1.causeEmitListener('test-listener-id', 'default-transactional', {});
      client.exchange.component1.causeEmitListener('test-listener-id', 'default-transactional', {});

      setTimeout(function(){

        client.exchange.component1.getListenerEvents(function(e, events){

          if (e) return done(e);

          expect(events.length).to.be(3);
          expect(clientEvents.length).to.be(1);

          done();
        });

      }, 2000);
    });

  });

  it('negative tests event.once', function (done) {

    this.timeout(5000);

    var clientEvents = [];
    var currentListenerId;

    client.event.component1.on('test-listener-id', function(data){

      clientEvents.push(data);

    }, function(e, listenerId){

      if (e) return done(e);

      currentListenerId = listenerId;

      client.exchange.component1.causeEmitListener('test-listener-id', 'default-transactional', {});
      client.exchange.component1.causeEmitListener('test-listener-id', 'default-transactional', {});
      client.exchange.component1.causeEmitListener('test-listener-id', 'default-transactional', {});

      setTimeout(function(){

        client.exchange.component2.getListenerEvents(function(e, events){

          if (e) return done(e);

          expect(events.length).to.be(3);
          expect(clientEvents.length).to.be(3);

          done();
        });

      }, 2000);
    });

  });

});
