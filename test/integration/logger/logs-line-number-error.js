var path = require('path');
require('chai').should();
var Happner = require('../../..');
var fs = require('fs');

describe(
  require('../../__fixtures/utils/test_helper')
    .create()
    .testName(__filename, 3),
  function() {
    this.timeout(5000);

    var test_id = Date.now() + '_' + require('shortid').generate();
    var logFileName = path.resolve(__dirname, '../../tmp') + '/' + test_id + '.nedb';

    before('start server', function(done) {
      if (process.env.RUNNING_IN_ACTIONS || process.env.SILENCE) return done();

      try {
        fs.unlinkSync(logFileName);
      } catch (e) {
        // do nothing
      }
      Happner.create({
        name: 'Server',
        util: {
          logFile: logFileName
        },
        happn: {
          secure: true
        },
        modules: {
          ComponentName: {
            instance: {
              logMethod: function($happn, callback) {
                // "max-nasty" injection
                $happn.log.error('test error');
                callback();
              }
            }
          }
        },
        components: {
          ComponentName: {}
        }
      })
        .then(function(mesh) {
          var security = mesh.exchange.security;
          server = mesh;
          return Promise.all([
            security.addGroup({
              name: 'group',
              permissions: {
                events: {},
                data: {
                  '/allowed/get/*': { actions: ['get'] },
                  '/allowed/on/*': { actions: ['on', 'set'] },
                  '/allowed/remove/*': { actions: ['set', 'remove', 'get'] },
                  '/allowed/all/*': { actions: ['*'] }
                },
                methods: {
                  '/Server/ComponentName/logMethod': { authorized: true }
                }
              }
            }),
            security.addUser({
              username: 'username',
              password: 'password'
            })
          ]).then(function(results) {
            return security.linkGroup(...results);
          });
        })
        .then(function() {
          done();
        })
        .catch(done);
    });

    it('logs an error without an Error object, we read the logfile and check we have a location the error occurred on', function(done) {
      if (process.env.RUNNING_IN_ACTIONS || process.env.SILENCE) return done();

      var client = new Happner.MeshClient();
      client
        .login({
          username: 'username',
          password: 'password'
        })
        .then(function() {
          client.exchange.ComponentName.logMethod().then(function() {
            server.stop({ reconnect: false }).then(function() {
              var logged = fs.readFileSync(logFileName).toString();
              logged.should.match(/\/test\/integration\/logger\/logs-line-number-error.js:34:26/);
              done();
            });
          });
        })
        .catch(done);
    });

    after('delete file', function(done) {
      if (process.env.RUNNING_IN_ACTIONS || process.env.SILENCE) return done();

      try {
        fs.unlinkSync(dbFileName);
      } catch (e) {
        // do nothing
      }
      done();
    });
  }
);
