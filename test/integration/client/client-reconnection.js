describe(
  require('../../__fixtures/utils/test_helper')
    .create()
    .testName(__filename, 3),
  function() {
    this.timeout(120000);

    var expect = require('expect.js');

    var Mesh = require('../../..');
    var mesh;

    var adminClient = new Mesh.MeshClient({
      secure: true,
      port: 8004,
      reconnect: {
        max: 2000 //we can then wait 10 seconds and should be able to reconnect before the next 10 seconds,
      }
    });

    var test_id = Date.now() + '_' + require('shortid').generate();

    var startMesh = function(callback) {
      Mesh.create(
        {
          name: 'client-reconnection',
          happn: {
            secure: true,
            adminPassword: test_id,
            port: 8004
          },
          components: {
            data: {}
          }
        },
        function(e, instance) {
          if (e) return callback(e);
          mesh = instance;
          callback();
        }
      );
    };

    before(function(done) {
      startMesh(function(e) {
        if (e) return done(e);

        adminClient
          .login({ username: '_ADMIN', password: test_id })
          .then(done)
          .catch(done);
      });
    });

    var __stopped = false;

    after(function(done) {
      if (adminClient) adminClient.disconnect();
      if (__stopped) return done();
      mesh.stop(done);
    });

    var eventsToFire = {
      'reconnect/scheduled': false,
      'reconnect/successful': false
    };

    var eventsFired = false;

    it('tests the client reconnection', function(done) {
      var fireEvent = function(key) {
        if (eventsFired) return;

        eventsToFire[key] = true;

        for (var eventKey in eventsToFire) if (eventsToFire[eventKey] === false) return;

        eventsFired = true;

        adminClient.exchange.data.set('/test/path', { test: 'data' }, done);
      };

      adminClient.exchange.data.set('/test/path', { test: 'data' }, function(e) {
        if (e) return done(e);

        adminClient.on('reconnect/scheduled', function() {
          //TODO some expect code
          fireEvent('reconnect/scheduled');
        });

        adminClient.on('reconnect/successful', function() {
          //TODO some expect code
          fireEvent('reconnect/successful');
        });

        mesh.stop({ reconnect: true }, function(e) {
          if (e) return done(e);

          startMesh(function(e) {
            if (e) return done(e);
          });
        });
      });
    });

    var __doneMeasuring = false;

    it('tests the client reconnection configuration', function(done) {
      adminClient.exchange.data.set('/test/path', { test: 'data' }, function(e) {
        if (e) return done(e);

        var lastMeasurement;
        var measuredCount = 0;
        var measuredDifference = 0;

        adminClient.on('reconnect/scheduled', function() {
          if (__doneMeasuring) return;

          if (measuredCount === 0) {
            lastMeasurement = Date.now();
            return measuredCount++;
          }

          measuredCount++;
          measuredDifference += Date.now() - lastMeasurement;
          lastMeasurement = Date.now();

          if (measuredCount === 4) {
            __doneMeasuring = true;
            var measuredAverage = measuredDifference / 3;

            // use try/catch to avoid process.exit (issue 222)
            try {
              expect(measuredAverage < 3300).to.be(true); // allow 10% grace for windows
            } catch (e) {
              return done(e);
            }
            done();
          }
        });

        mesh.stop({ reconnect: true }, function(e) {
          if (e) return done(e);
          __stopped = true;
        });
      });
    });
  }
);
