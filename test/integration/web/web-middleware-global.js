const path = require('path');

describe(
  require('../../__fixtures/utils/test_helper')
    .create()
    .testName(__filename, 3),
  function() {
    var Mesh = require('../../..');
    var client;
    var request = require('request');

    this.timeout(120000);

    it('can load and execute global middleware', async () => {
      const mesh = await startMesh(goodConfig);
      const token = await getSessionToken();

      let response = await cookieRequest('http://localhost:10000/middlewareTest/singular', token);

      expect(response.result.statusCode).to.be(200);
      expect(response.body).to.be(
        '_didVariable_didInline_didSomething_didSomethingElse_didAnotherSomething_didAnotherSomethingElseOK'
      );

      await stopMesh(mesh);
    });

    it('fails to load global middleware, empty methods', async () => {
      try {
        await startMesh(badConfigEmptyMethods);
      } catch (e) {
        expect(e.message).to.be(
          'web.middleware.methods empty or null in web config, component: middlewareTest'
        );
      }
    });

    it('fails to load global middleware, no component name', async () => {
      try {
        await startMesh(badConfigNoComponentName);
      } catch (e) {
        expect(e.message).to.be('web.middleware.component null in web config');
      }
    });

    it('fails executing a web request, missing component for first handler', async () => {
      const mesh = await startMesh(badConfigMissingFirstComponent);
      const token = await getSessionToken();

      let response = await cookieRequest('http://localhost:10000/middlewareTest/singular', token);

      expect(response.result.statusCode).to.be(500);
      expect(response.result.statusMessage).to.be('system middleware failure');

      await stopMesh(mesh);
    });

    it('fails executing a web request, missing component for second handler', async () => {
      const mesh = await startMesh(badConfigMissingArbComponent);
      const token = await getSessionToken();

      let response = await cookieRequest('http://localhost:10000/middlewareTest/singular', token);

      //because there has been some writing already
      expect(response.result.statusCode).to.be(200);
      expect(response.result.statusMessage).to.be('OK');
      expect(response.body).to.be('_didVariable_didInline');

      await stopMesh(mesh);
    });

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

    var getSessionToken = function() {
      return new Promise((resolve, reject) => {
        client = new Mesh.MeshClient({
          port: 10000
        });
        client
          .login({
            username: '_ADMIN',
            password: 'happn'
          })
          .then(function() {
            const token = client.token;
            client.disconnect(() => {
              resolve(token);
            });
          })
          .catch(reject);
      });
    };

    var startMesh = function(config) {
      return Mesh.create(config);
    };

    var stopMesh = function(mesh) {
      return new Promise((resolve, reject) => {
        mesh.stop({ reconnect: false }, e => {
          if (e) return reject(e);
          resolve();
        });
      });
    };

    var cookieRequest = function(url, token) {
      return new Promise((resolve, reject) => {
        var j = request.jar();
        var cookie = request.cookie('happn_token=' + token);
        j.setCookie(cookie, url);
        request({ url: url, jar: j }, function(e, result, body) {
          if (e) return reject(e);
          resolve({ result, body });
        });
      });
    };

    var happn = {
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
    };

    var modules = {
      middlewareTest: {
        path: libFolder + 'web-middleware'
      },
      middlewareTestGlobal: {
        path: libFolder + 'web-middleware-global'
      }
    };

    var components = {
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
    };

    var goodConfig = {
      name: 'middlewareMesh',
      happn,
      web: {
        middleware: [
          middlewareTestFunc,
          (req, res, next) => {
            res.write('_didInline');
            next();
          },
          {
            component: 'middlewareTest',
            methods: ['doSomething', 'doSomethingElse']
          },
          {
            component: 'middlewareTestGlobal',
            methods: ['doAnotherSomething', 'doAnotherSomethingElse']
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
      modules,
      components
    };

    var badConfigEmptyMethods = {
      name: 'middlewareMesh',
      happn,
      web: {
        middleware: [
          middlewareTestFunc,
          (req, res, next) => {
            res.write('_didInline');
            next();
          },
          {
            component: 'middlewareTest',
            methods: []
          },
          {
            component: 'middlewareTestGlobal',
            methods: ['doAnotherSomething', 'doAnotherSomethingElse']
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
      modules,
      components
    };

    var badConfigNoComponentName = {
      name: 'middlewareMesh',
      happn,
      web: {
        middleware: [
          middlewareTestFunc,
          (req, res, next) => {
            res.write('_didInline');
            next();
          },
          {
            component: null,
            methods: ['test1', 'test2']
          },
          {
            component: 'middlewareTestGlobal',
            methods: ['doAnotherSomething', 'doAnotherSomethingElse']
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
      modules,
      components
    };

    var badConfigMissingFirstComponent = {
      name: 'middlewareMesh',
      happn,
      web: {
        middleware: [
          {
            component: 'nonExistent',
            methods: ['test1', 'test2']
          },
          middlewareTestFunc,
          (req, res, next) => {
            res.write('_didInline');
            next();
          },
          {
            component: 'middlewareTestGlobal',
            methods: ['doAnotherSomething', 'doAnotherSomethingElse']
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
      modules,
      components
    };

    var badConfigMissingArbComponent = {
      name: 'middlewareMesh',
      happn,
      web: {
        middleware: [
          middlewareTestFunc,
          (req, res, next) => {
            res.write('_didInline');
            next();
          },
          {
            component: 'nonExistent',
            methods: ['test1', 'test2']
          },
          {
            component: 'middlewareTestGlobal',
            methods: ['doAnotherSomething', 'doAnotherSomethingElse']
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
      modules,
      components
    };
  }
);
