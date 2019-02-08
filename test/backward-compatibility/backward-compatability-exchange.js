describe(require('../__fixtures/utils/test_helper').create().testName(__filename), function () {

  var path = require('path');
  var child_process = require('child_process');
  var OldHappner = require('happner');
  var Promise = require('bluebird');
  var expect = require('expect.js');

  var scriptPath = ['test', '__fixtures', 'test', 'backward-compatibility', 'backward-compatibility-exchange-server.js'].join(path.sep);

  [ 'secure', 'insecure'].forEach(function (security) {

    context(security, function () {

      var server;

      var startServer = function () {

        return new Promise(function (resolve, reject) {

          server = child_process.fork(scriptPath, [security]);

          server.on('message', function (message) {
            if (message == 'READY') {
              resolve();
            }
            if (message == 'ERROR') {
              reject(new Error('failed to start server'));
            }
          });
        });
      };

      var stopServer = function () {
        return new Promise(function (resolve) {
          if (!server) return resolve();
          server.on('exit', function () {
            server = undefined;
            resolve();
          });
          server.kill();
        });
      };

      before('start happner-2 server', function (done) {

        this.timeout(4000);

        startServer().then(done).catch(done);

      });

      after('stop happner-2 server', function (done) {

        this.timeout(4000);

        stopServer().then(done).catch(done);

      });

      context('endpoint from old happner', function () {

        var client;

        before('start happner client', function (done) {

          OldHappner.create({
            port: 55001,
            datalayer: {
              secure: security == 'secure'
            },
            endpoints: {
              'SERVER': {
                config: {
                  username: '_ADMIN',
                  password: 'happn'
                }
              }
            }
          })

            .then(function (_client) {
              client = _client;
            })

            .then(done).catch(done);

        });

        after('stop happner client', function (done) {

          if (!client) return done();
          client.stop({reconnect: false}, done);

        });

        (security == 'insecure' ? xit : it)('exchange calls survive server restart', function (done) {

          this.timeout(20 * 1000);

          Promise.resolve()

            .then(function () {
              // does exchange work?
              return client.exchange.SERVER.component.method();
            })

            .then(function (result) {
              expect(result).to.be('OK');
            })

            .then(function () {
              return stopServer();
            })

            .then(function () {
              return startServer();
            })

            .then(function () {
              // wait long enough for endpoint reconnect
              return Promise.delay(5000);
            })

            .then(function () {
              // does exchange still work?
              return client.exchange.SERVER.component.method();
            })

            .then(function (result) {
              expect(result).to.be('OK');
            })

            .then(done).catch(done);

        });

      });

      context('mesh client from old happner', function () {

        var client;

        before('start happner meshclient', function (done) {

          client = new OldHappner.MeshClient();

          client.login({
            username: '_ADMIN',
            password: 'happn'
          }, done);
        });

        after('stop happner meshclient', function (done) {

          this.timeout(30000);
          client.disconnect(function(e){
            done();
          });
        });

        (security == 'insecure' ? xit : it)('exchange calls survive server restart', function (done) {

          this.timeout(20 * 1000);

          Promise.resolve()

            .then(function () {
              // does exchange work?
              return client.exchange.component.method();
            })

            .then(function (result) {
              expect(result).to.be('OK');
            })

            .then(function () {
              return stopServer();
            })

            .then(function () {
              return startServer();
            })

            .then(function () {
              // wait long enough for client reconnect
              return Promise.delay(5000);
            })

            .then(function () {
              // does exchange still work?
              return client.exchange.component.method();
            })

            .then(function (result) {
              expect(result).to.be('OK');
            })

            .then(done).catch(done);

        });
      });
    });
  });
});
