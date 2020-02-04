/**
 * Created by Johan on 10/14/2015.
 */
var path = require('path');

describe(
  require('../../__fixtures/utils/test_helper')
    .create()
    .testName(__filename, 3),
  function() {
    // Uses unit test 2 modules
    var Mesh = require('../../..');
    var client;
    var mesh;
    var request = require('request');

    this.timeout(120000);

    var libFolder =
      path.resolve(__dirname, '../../..') +
      path.sep +
      ['test', '__fixtures', 'test', 'integration', 'web'].join(path.sep) +
      path.sep;
    var expect = require('expect.js');

    var singularActive = function(req, res) {
      res.end('ok');
    };
    var multiActive = function(req, res, next) {
      res.write('_2');
      next();
    };

    var middlewareTestFunc = function(req, res, next) {
      res.write('_didVariable');
      next();
    };

    var config = {
      name: 'middlewareMesh',
      happn: {
        port: 10000,
        secure: true,
        services: {
          connect: {
            config: {
              middleware: {
                security: {
                  // cookieName: 'custom_token',
                  exclusions: ['/index.html']
                }
              }
            }
          }
        }
      },
      web: {
        middleware:[
          middlewareTestFunc,
          (req, res, next) => {
            res.write('_didInline');
            next();
          },
          {
            component:'middlewareTest',
            methods:['doSomething', 'doSomethingElse']
          },
          {
            component:'middlewareTestGlobal',
            methods:['doAnotherSomething', 'doAnotherSomethingElse']
          }
        ],
        routes: {
          '/': 'middlewareTest/root',
          '/testAddRouteInfo': 'middlewareTest/addRouteInfo',
          '/inline': function(req, res) {
            res.end('OK!NESS');
          }
        }
      },
      modules: {
        middlewareTest: {
          path: libFolder + 'web-middleware'
        },
        middlewareTestGlobal: {
          path: libFolder + 'web-middleware-global'
        }
      },
      components: {
        middlewareTestGlobal: {},
        middlewareTest: {
          moduleName: 'middlewareTest',
          web: {
            routes: {
              root: ['checkIndex', 'content'],
              addRouteInfo: ['injectRouteInfo'],
              singular: 'singularMethod',
              multi: ['multiMethod1', 'multiMethod2', 'multiMethod3'],
              singularActive: singularActive,
              multiActive: ['multiMethod1', multiActive, 'multiMethod3'],
              injectHappn: 'injectHappnMethod',
              injectOrigin: [
                'injectOriginMethod',
                function(req, res) {
                  res.end();
                }
              ],
              injectForwardOrder: 'injectForwardOrder',
              injectReverseOrder: 'injectReverseOrder'
            }
          }
        }
      }
    };

    before(function(done) {
      Mesh.create(config)
        .then(function(_mesh) {
          mesh = _mesh;
          done();
        })
        .catch(done);
    });

    before('get session token', function(done) {
      client = new Mesh.MeshClient({
        port: 10000
      });
      client
        .login({
          username: '_ADMIN',
          password: 'happn'
        })
        .then(function() {
          done();
        })
        .catch(done);
    });

    after('disconnect client', function(done) {
      client.disconnect(done);
    });

    after(function(done) {
      mesh.stop({ reconnect: false }, done);
    });

    var cookieRequest = function(url, callback) {
      var j = request.jar();
      // var cookie = request.cookie('custom_token=' + client.token);
      var cookie = request.cookie('happn_token=' + client.token);
      j.setCookie(cookie, url);
      request({ url: url, jar: j }, callback);
    };

    it('can load and execute global middleware', function(done) {
      cookieRequest('http://localhost:10000/middlewareTest/singular', function(e, res, body) {
        if (e) return done(e);
        try {
          expect(res.statusCode).to.be(200);
          expect(body).to.be('_didVariable_didInline_didSomething_didSomethingElse_didAnotherSomething_didAnotherSomethingElseOK');
          done();
        } catch (e) {
          done(e);
        }
      });
    });
  }
);
