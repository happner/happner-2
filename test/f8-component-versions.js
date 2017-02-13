var expect = require('expect.js');
var Happner = require('..');
var path = require('path');

describe('f8 - component versions', function () {

  var server, client;

  before('start server', function (done) {
    Happner.create({
      modules: {
        'componentName': {
          path: __dirname + path.sep + 'lib' + path.sep + 'f8-component'
        }
      },
      components: {
        'componentName': {},
        'happner-test-modules': {
          $configure: function (configName) {
            return configName;
          }
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

  it('loads package.json from require', function () {
    expect(server._mesh.elements['happner-test-modules'].module.package.version).to.be('1.0.2');
  });

  it('loads version from component package.json from require', function () {

    expect(server.describe().components['happner-test-modules'].version).to.be('1.0.2');

  });

  it('loads package.json from path', function () {
    expect(server._mesh.elements.componentName.module.package.version).to.be('3.0.0');
  });

  it('loads version from component package.json from path', function () {

    expect(server.describe().components.componentName.version).to.be('3.0.0');

  });

  it('includes meta componentVersion in events', function (done) {

    client.event.componentName.on('event/one', function (data, meta) {
      try {
        expect(meta.componentVersion).to.be('3.0.0');
        done();
      } catch (e) {
        done(e);
      }
    });

    client.exchange.componentName.causeEmit('event/one', function (e) {
      if (e) return done(e);
    });

  });



});
