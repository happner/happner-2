describe(
  require('../../__fixtures/utils/test_helper')
    .create()
    .testName(__filename, 3),
  function() {
    var expect = require('expect.js');
    var Happner = require('../../..');
    var path = require('path');
    var libFolder =
      path.resolve(__dirname, '../../..') +
      path.sep +
      ['test', '__fixtures', 'test', 'integration', 'component'].join(path.sep) +
      path.sep;
    var server, client;

    before('start server', function(done) {
      Happner.create({
        modules: {
          componentName: {
            path: libFolder + 'component-versions'
          }
        },
        components: {
          componentName: {},
          'happner-test-modules': {
            $configure: function(configName) {
              return configName;
            }
          }
        }
      })
        .then(function(_server) {
          server = _server;
        })
        .then(done)
        .catch(done);
    });

    before('start client', function(done) {
      var _client = new Happner.MeshClient();
      _client
        .login()
        .then(function() {
          client = _client;
        })
        .then(done)
        .catch(done);
    });

    after('stop client', function(done) {
      if (!client) return done();
      client.disconnect(done);
    });

    after('stop server', function(done) {
      if (!server) return done();
      server.stop({ reconnect: false }, done);
    });

    it('loads package.json from require', function() {
      expect(server._mesh.elements['happner-test-modules'].module.package.version).to.be('1.0.2');
    });

    it('loads version from component package.json from require', function() {
      expect(server.describe().components['happner-test-modules'].version).to.be('1.0.2');
    });

    it('places __version onto exchange', function(done) {
      server.exchange.componentName.getVersion(function(e, version) {
        if (e) return done(e);
        try {
          expect(version).to.be('3.0.0');
          done();
        } catch (e) {
          done(e);
        }
      });
    });

    it('loads package.json from path', function() {
      expect(server._mesh.elements.componentName.module.package.version).to.be('3.0.0');
    });

    it('loads version from component package.json from path', function() {
      expect(server.describe().components.componentName.version).to.be('3.0.0');
    });

    var eventHappenedOK = false;

    it('includes meta componentVersion in events', function(done) {
      this.timeout(5000);

      client.event.componentName.on('event/one', function(data, meta) {
        try {
          expect(meta.componentVersion).to.be('3.0.0');
          eventHappenedOK = true;
          done();
          //setTimeout(done, 2000);//wait 2 secs
        } catch (e) {
          done(e);
        }
      });

      client.exchange.componentName.causeEmit('event/one', function(e) {
        if (eventHappenedOK && e == 'Request timed out') {
          //this is ok, what happens here is the test moves on but the event handler has still
          //got a timeout
          console.warn('we already moved on to the next test - so no handler for this anymore');
          return;
        }

        if (e) return done(e);
      });
    });
  }
);
