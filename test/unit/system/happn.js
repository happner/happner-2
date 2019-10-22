describe(
  require('../../__fixtures/utils/test_helper')
    .create()
    .testName(__filename, 3),
  function() {
    var expect = require('expect.js');

    const HappnLayer = require('../../../lib/system/happn');
    const happnLayer = new HappnLayer({});

    EventEmitter = require('events').EventEmitter;

    it('tests the __initializeAccess function', function() {
      var config = {};

      var initialAccess = happnLayer.__initializeAccess();

      expect(initialAccess.listen != null).to.be(true);
      delete initialAccess.listen;

      //console.log(JSON.stringify(happnLayer.__initializeAccess(), null, 2));
      expect(initialAccess).to.eql({
        serverReady: false,
        serverError: null,
        clientReady: false,
        clientError: null
      });
    });

    it('tests the __initializeStore function', function() {
      var config = {};

      happnLayer.access = happnLayer.__initializeAccess();

      var initialStore = happnLayer.__initializeStore();

      //console.log(JSON.stringify(happnLayer.__initializeAccess(), null, 2));
      expect(initialStore).to.eql({
        server: null,
        client: null,
        events: new EventEmitter()
      });
    });

    it('tests the __inboundLayer function, empty message', function(done) {
      happnLayer.__inboundLayer({ raw: {} }, done);
    });

    it('tests the __inboundLayer function, error', function(done) {
      try {
        happnLayer.log = {
          error: function() {
            done();
          }
        };
        happnLayer.__inboundLayer({ raw: {} }, function() {
          throw new Error('test error');
        });
      } catch (e) {
        expect(e.message.to.be('test error'));
      }
    });

    it('tests the __outboundLayer function, error', function(done) {
      try {
        happnLayer.log = {
          error: function() {
            done();
          }
        };
        happnLayer.__outboundLayer({ request: {} }, function() {
          throw new Error('test error');
        });
      } catch (e) {
        expect(e.message.to.be('test error'));
      }
    });

    it('tests the __inboundLayer function, bad session id', function(done) {
      this.timeout(5000);

      happnLayer.store = {
        server: {
          services: {
            session: {
              getClient: function() {
                return {
                  write: function() {}
                };
              }
            },
            protocol: {
              __getProtocol: function(message) {
                return {
                  success: function(message) {
                    return {
                      response: {}
                    };
                  }
                };
              }
            }
          }
        }
      };

      var calledBack = false;

      happnLayer.__inboundLayer(
        {
          raw: {
            action: 'on',
            path: '/SET@/_exchange/responses'
          },
          session: {
            id: 'session-id'
          }
        },
        function() {
          calledBack = true;
        }
      );

      setTimeout(function() {
        if (calledBack) return done(new Error('__inboundLayer caused callback'));
        done();
      }, 1000);
    });

    it('tests the __inboundLayer function, existing session id', function(done) {
      this.timeout(5000);

      happnLayer.store = {
        server: {
          services: {
            session: {
              getClient: function() {
                return {
                  write: function() {}
                };
              }
            },
            protocol: {
              __getProtocol: function(message) {
                return {
                  success: function(message) {
                    return {
                      response: {}
                    };
                  }
                };
              }
            }
          }
        }
      };

      var calledBack = false;

      happnLayer.__inboundLayer(
        {
          raw: {
            action: 'on',
            path: '/SET@/_exchange/responses/session-id'
          },
          session: {
            id: 'session-id'
          }
        },
        function() {
          calledBack = true;
        }
      );

      setTimeout(function() {
        if (!calledBack) return done(new Error('__inboundLayer did not cause callback'));
        done();
      }, 1000);
    });
  }
);
