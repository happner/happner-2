describe(
  require('../../__fixtures/utils/test_helper')
    .create()
    .testName(__filename, 3),
  function() {
    this.timeout(120000);

    var path = require('path');
    var Mesh = require('../../..');
    var spawn = require('child_process').spawn;
    var expect = require('expect.js');
    var libFolder =
      path.resolve(__dirname, '../../..') +
      path.sep +
      ['test', '__fixtures', 'test', 'integration', 'client'].join(path.sep);
    var Promise = require('bluebird');

    after(function(done) {
      remote.kill();
      done();
    });

    var testClient;

    before(function(done) {
      // spawn remote mesh in another process
      remote = spawn('node', [path.join(libFolder, 'websocket-client-mesh')]);

      remote.stdout.on('data', function(data) {
        if (data.toString().match(/READY/)) {
          testClient = new Mesh.MeshClient({ port: 3111 });

          testClient
            .login({
              username: '_ADMIN',
              password: 'password'
            })
            .then(function() {
              done();
            })
            .catch(function(e) {
              done(e);
            });
        }
      });
    });

    it('does a set on the datalayer component', function(done) {
      testClient.exchange.websocket_client.data.set(
        '/websocket_client/set',
        { val: 'set' },
        function(e, result) {
          if (e) return done(e);

          expect(result.val).to.be('set');

          done();
        }
      );
    });

    it('does a get on the datalayer component', function(done) {
      testClient.exchange.websocket_client.data.set(
        '/websocket_client/get',
        { val: 'get' },
        function(e, result) {
          if (e) return done(e);

          expect(result.val).to.be('get');

          testClient.exchange.websocket_client.data.get('/websocket_client/get', {}, function(
            e,
            getresult
          ) {
            if (e) return done(e);

            expect(getresult.val).to.be('get');
            done();
          });
        }
      );
    });

    it('contains the mesh name and version', function() {
      expect(testClient.info.version).to.be(require(__dirname + '/../../../package.json').version);
      expect(testClient.info.name).to.be('websocket_client');
    });

    it('does a delete on the datalayer component', function(done) {
      testClient.exchange.websocket_client.data.set(
        '/websocket_client/delete',
        { val: 'delete' },
        function(e, result) {
          if (e) return done(e);

          expect(result.val).to.be('delete');

          testClient.exchange.websocket_client.data.get('/websocket_client/delete', {}, function(
            e,
            getresult
          ) {
            if (e) return done(e);

            expect(getresult.val).to.be('delete');

            testClient.exchange.websocket_client.data.remove(
              '/websocket_client/delete',
              {},
              function(e) {
                if (e) return done(e);

                testClient.exchange.websocket_client.data.get(
                  '/websocket_client/delete',
                  {},
                  function(e, getremovedresult) {
                    if (e) return done(e);

                    expect(getremovedresult).to.be(null);
                    done();
                  }
                );
              }
            );
          });
        }
      );
    });

    xit('does an on, on the datalayer component', function() {});

    it('runs a method on a component', function() {
      return testClient.exchange.component.remoteCall();
    });

    it('deletes the right listeners when unsubscribing from data', function(done) {
      this.timeout(30000);

      var subID;

      var utils = {
        subscribeToData: function subscribeToData() {
          return new Promise(function(resolve) {
            testClient.event.data.on(
              'some/random/path',
              function call1() {},
              function(err, handle) {
                subID = handle;
                resolve();
              }
            );
          });
        },
        doRemoteCall: function doRemoteCall() {
          return testClient.exchange.component.remoteCall();
        },
        unsubscribeFromData: function() {
          return new Promise(function(resolve) {
            testClient.event.data.off(subID, resolve);
          });
        }
      };

      utils
        .subscribeToData()
        .then(utils.doRemoteCall)
        .then(utils.unsubscribeFromData)
        .then(utils.doRemoteCall)
        .then(function() {
          done();
        })
        .catch(function(err) {
          done(err);
        });
    });
  }
);
