describe(
  require('../../__fixtures/utils/test_helper')
    .create()
    .testName(__filename, 3),
  function() {
    var expect = require('expect.js');
    var Mesh = require('../../..');
    var mesh;

    function attachClient(reconnect, callback) {
      if (typeof reconnect === 'function') {
        callback = reconnect;
        reconnect = {};
      }

      if (!reconnect) reconnect = {};

      var meshClient = new Mesh.MeshClient({
        secure: true,
        reconnect
      });

      meshClient
        .login({
          username: '_ADMIN',
          password: 'happn'
        })
        .then(function() {
          callback(null, meshClient);
        })
        .catch(callback);
    }

    function startService(callback) {
      try {
        Mesh.create(
          {
            name: 'client-reconnection',
            happn: {
              secure: true
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
      } catch (e) {
        callback(e);
      }
    }

    function stopService(callback) {
      if (mesh) mesh.stop(callback);
    }

    after(function(done) {
      stopService(done);
    });

    before('should initialize the service', function(done) {
      this.timeout(20000);
      startService(done);
    });

    /*
   We are initializing 2 clients to test saving data against the database, one client will push data into the
   database whilst another listens for changes.
   */
    it('should initialize a client, check the standard configuration is in place', function(callback) {
      try {
        attachClient(function(e, instance) {
          if (e) return callback(e);

          expect(instance.data.socket.options.reconnect.retries).to.be(Infinity);
          expect(instance.data.socket.options.reconnect.max).to.be(180000);
          expect(instance.data.socket.recovery.retries).to.be(Infinity);
          expect(instance.data.socket.recovery.max).to.be(180000);

          instance.disconnect(callback);
        });
      } catch (e) {
        callback(e);
      }
    });

    /*
   We are initializing 2 clients to test saving data against the database, one client will push data into the
   database whilst another listens for changes.
   */
    it('should initialize a client, and set up configurable options', function(callback) {
      try {
        attachClient(
          {
            retries: 60,
            max: 2100000
          },
          function(e, instance) {
            if (e) return callback(e);

            expect(instance.data.socket.options.reconnect.retries).to.be(60);
            expect(instance.data.socket.options.reconnect.max).to.be(2100000);

            expect(instance.data.socket.recovery.retries).to.be(60);
            expect(instance.data.socket.recovery.max).to.be(2100000);

            instance.disconnect(callback);
          }
        );
      } catch (e) {
        callback(e);
      }
    });

    /*
   We are initializing 2 clients to test saving data against the database, one client will push data into the
   database whilst another listens for changes.
   */
    it('should initialize a client, and set up configurable options, not nested', function(callback) {
      try {
        attachClient(
          {
            retries: 50,
            max: 2000000
          },
          function(e, instance) {
            if (e) return callback(e);

            expect(instance.data.socket.options.reconnect.retries).to.be(50);
            expect(instance.data.socket.options.reconnect.max).to.be(2000000);

            expect(instance.data.socket.recovery.retries).to.be(50);
            expect(instance.data.socket.recovery.max).to.be(2000000);

            instance.disconnect(callback);
          }
        );
      } catch (e) {
        callback(e);
      }
    });

    it('should initialize a client, and set up configurable options', function(callback) {
      try {
        attachClient(
          {
            retries: 10,
            max: 2000
          },
          function(e, instance) {
            if (e) return callback(e);

            expect(instance.data.socket.options.reconnect.retries).to.be(10);
            expect(instance.data.socket.options.reconnect.max).to.be(2000);

            expect(instance.data.socket.recovery.retries).to.be(10);
            expect(instance.data.socket.recovery.max).to.be(2000);

            instance.disconnect(callback);
          }
        );
      } catch (e) {
        callback(e);
      }
    });

    it('should initialize a client, and set up configurable options - with stopped service, we check the backoff', function(callback) {
      this.timeout(30000);

      try {
        attachClient(
          {
            retries: Infinity,
            max: 1000
          },
          function(e, instance) {
            if (e) return callback(e);
            let reconnectCount = 0;

            instance.data.onEvent('reconnect-scheduled', function() {
              reconnectCount++;
            });

            stopService(function() {
              setTimeout(function() {
                instance.disconnect();
                if (reconnectCount < 14)
                  return callback(new Error('expected reconnecvt count too small'));
                callback();
              }, 15000);
            });
          }
        );
      } catch (e) {
        callback(e);
      }
    });

    it('should initialize a client, and set up configurable options - with stopped service, we check the allowed retries', function(callback) {
      this.timeout(30000);

      try {
        startService(function(e) {
          if (e) return callback(e);

          attachClient(
            {
              retries: 10,
              max: 1000
            },
            function(e, instance) {
              if (e) return callback(e);
              let reconnectCount = 0;

              instance.data.onEvent('reconnect-scheduled', function() {
                reconnectCount++;
              });

              stopService(function() {
                setTimeout(function() {
                  instance.disconnect();
                  if (reconnectCount !== 10)
                    return callback(new Error('expected reconnecvt count not 10'));
                  callback();
                }, 13000);
              });
            }
          );
        });
      } catch (e) {
        callback(e);
      }
    });
  }
);
