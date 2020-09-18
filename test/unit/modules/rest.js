describe(
  require('../../__fixtures/utils/test_helper')
    .create()
    .testName(__filename, 3),
  function() {
    var expect = require('expect.js');

    function mock$happn(options) {
      if (!options) options = {};

      var $happn = {};

      options._mesh = options._mesh || {};

      options._mesh.happn = options._mesh.happn || {};

      options._mesh.happn.server = options._mesh.happn.server || {};

      options._mesh.happn.server.services = options._mesh.happn.server.services || {};

      options._mesh.happn.server.services.stats = options._mesh.happn.server.services.stats || {
        on: function() {}
      };

      $happn._mesh = options._mesh;

      $happn.emitLocal = options.emitLocal || function() {};

      $happn.log = options.log || {
        info: function() {},
        error: function() {}
      };

      return $happn;
    }

    function mockRestModule(options, callback) {
      if (!options) options = {};
      const RestModule = require('../../../lib/modules/rest/index');
      const restModule = new RestModule();
      const Events = require('events');
      const _mesh = new Events.EventEmitter();
      _mesh.description = {
        initializing: true,
        setOptions: {},
        _meta: {}
      };
      options.$happn =
        options.$happn ||
        mock$happn({
          _mesh,
          emitLocal: function(path, data, callback) {
            callback();
          },
          log: {
            info: function() {},
            error: function() {},
            trace: function() {},
            warn: function() {}
          }
        });

      restModule.initialize(options.$happn, function(e) {
        if (e) return callback(e);
        return callback(null, restModule, _mesh);
      });
    }

    it('tests the initialize and __updateDescription functions', function(done) {
      mockRestModule(null, function(e, restModule, _mesh) {
        if (e) return done(e);
        //removed unwanted fields from original description
        expect(restModule.__exchangeDescription).to.eql({ callMenu: {} });
        _mesh.emit('description-updated', { extraField: true });
        expect(restModule.__exchangeDescription).to.eql({ callMenu: {}, extraField: true });
        done();
      });
    });
  }
);
