var expect = require('expect.js');
var Happner = require('..');
var path = require('path');

describe('f8 - component versions', function () {

  var server;

  beforeEach('stop server', function (done) {
    if (!server) return done();
    server.stop({reconnect: false}, done);
  });

  it('loads version from component package.json from require', function (done) {

    Happner.create({
      components: {
        'happner-test-modules': {
          $configure: function(configName) {
            return configName;
          }
        }
      }
    })
      .then(function (_server) {
        server = _server;
        expect(server.describe().components['happner-test-modules'].version).to.be('1.0.2');
      })
      .then(done).catch(done);
  });

  it('loads version from component package.json from path', function (done) {
    Happner.create({
      modules:{
        'componentName': {
          path: __dirname + path.sep + 'lib' + path.sep + 'f8-component' + path.sep + 'index.js'
        }
      },
      components: {
        'componentName': {
        }
      }
    })
      .then(function (_server) {
        server = _server;
        expect(server.describe().components.componentName.version).to.be('3.0.0');
      })
      .then(done).catch(done);
  });

});
