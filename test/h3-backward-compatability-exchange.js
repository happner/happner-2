describe.only(require('path').basename(__filename), function () {

  var Happner = require('..');
  var OldHappner = require('happner');
  var Promise = require('bluebird');
  var expect = require('expect.js');

  [ 'secure', 'insecure'].forEach(function (security) {

    context(security, function () {

      var server;

      var startServer = function () {
        return Happner.create({
          name: 'SERVER',
          happn: {
            secure: security == 'secure',
            services: {
              security: {
                config: {
                  adminUser: {
                    username: '_ADMIN',
                    password: 'happn'
                  }
                }
              }
            }
          },
          modules: {
            'component': {
              instance: {
                method: function ($happn, callback) {
                  return callback(null, 'OK');
                }
              }
            }
          },
          components: {
            'component': {}
          }
        });
      };

      before('start happner-2 server', function (done) {

        startServer()

          .then(function (_server) {
            server = _server;
          })

          .then(done).catch(done);

      });

      after('stop happner-2 server', function (done) {

        if (!server) return done();
        server.stop({reconnect: false}, done);

      });

      context('endpoint from old happner', function () {

        var client;

        before('start happner client', function (done) {

          OldHappner.create({
            port: 55001,
            datalayer: {
              secure: true
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

        it('exchange calls survive server restart', function (done) {

          this.timeout(10 * 1000);

          Promise.resolve()

            .then(function () {
              // does exchange work?
              return client.exchange.SERVER.component.method();
            })

            .then(function (result) {
              expect(result).to.be('OK');
            })

            .then(function () {
              // stop the server
              return server.stop();
            })

            .then(function () {
              // restart the server
              return startServer();
            })

            .then(function (_server) {
              server = _server;
            })

            .then(function () {
              // wait long enough for endpoint reconnect
              return Promise.delay(1000);
            })

            .then(function () {
              // does exchange still work?
              console.log('retry');
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

          client.disconnect(done);

        });

        it('exchange calls survive server restart', function (done) {

          this.timeout(10 * 1000);

          Promise.resolve()

            .then(function () {
              // does exchange work?
              return client.exchange.component.method();
            })

            .then(function (result) {
              expect(result).to.be('OK');
            })

            .then(function () {
              // stop the server
              return server.stop();
            })

            .then(function () {
              // restart the server
              return startServer();
            })

            .then(function (_server) {
              server = _server;
            })

            .then(function () {
              // wait long enough for client reconnect
              return Promise.delay(1000);
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
