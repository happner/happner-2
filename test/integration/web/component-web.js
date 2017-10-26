var path = require('path');

describe(path.basename(__filename), function () {

  var libFolder = path.resolve(__dirname, '../../..') + path.sep + ['test', '__fixtures', 'test', 'integration', 'web'].join(path.sep) + path.sep;
  var request = require('request');
  var testport = 8080;
  var fs = require('fs');
  require('chai').should();
  var Mesh = require('../../..');
  var mesh;

  this.timeout(120000);

  function getBody(url, done) {
    request({
        gzip: true,
        uri: url,
        method: 'GET'
      },
      function (e, r, b) {

        if (!e) {
          done(null, b);
        }
        else
          done(e);

      });
  }

  var config = {
    name: "testMiddleware",
    happn: {
      port: testport
    },
    modules: {
      "module5": {
        path: libFolder + "module-middleware",
        construct: {
          type: "sync"
        }
      }
    },
    components: {
      "component5": {
        moduleName: "module5",
        // "scope":"component",
        schema: {
          exclusive: false
        },
        web: {
          routes: {
            // http://localhost:3001/neptronicUI/...
            "static5": ["preProcessor", "static"],
            "testScope": "testScope"
          }
        }
      },

      "component5Module": {
        moduleName: "module5",
        // "scope":"module",
        schema: {
          exclusive: false
        },
        web: {
          routes: {
            // http://localhost:3001/neptronicUI/...
            "testScope": "testScope"
          }
        }
      }
    }
  };

  before(function (done) {

    var x = new Mesh();

    x.initialize(config, function (err) {
      if (err) return done(err);
      x.start(function (err) {
        if (err) return done(err);
        mesh = x;
        done();
      });

    });
  });

  after(function (done) {
    if (!mesh) return done();
    mesh.stop({reconnect: false}, done);
  });


  it('starts the mesh, loads the middleware module - which loads the browser plugin', function (done) {

    getBody('http://127.0.0.1:' + testport + '/testMiddleware/api/client', function (e, body) {

      return done(e);
    });
  });

  it('tests that we can do chain middleware in a module', function (done) {
    getBody('http://127.0.0.1:' + testport + '/testMiddleware/component5/static5/test.html', function (e, body) {

      body.should.eql(fs.readFileSync(libFolder + 'component-web/preprocessed-test.html').toString());
      done(e);
    });
  });

  it('tests that the scope is set to module', function (done) {
    request({
      uri: 'http://127.0.0.1:' + testport + '/component5Module/testScope?scope=ModuleFive',
      method: 'GET'
    }, function (e, resp, body) {
      resp.statusCode.should.eql(200);
      done(e);
    });
  });
});
