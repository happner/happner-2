module.exports = DataComponent7;

function DataComponent7() {}

DataComponent7.prototype.storeData = function($happn, path, data, callback) {
  try {
    $happn.data.set(path, data, {}, function(e, response) {
      return callback(e, response);
    });
  } catch (e) {
    callback(e);
  }
};

if (global.TESTING_7) return; // When 'requiring' the module above,
// don't run the tests below

describe(
  require('../../__fixtures/utils/test_helper')
    .create()
    .testName(__filename, 3),
  function() {
    this.timeout(120000);

    var Mesh = require('../../..');
    var test_id = Date.now() + '_' + require('shortid').generate();
    var fs = require('fs-extra');
    var dbFileName = './temp/' + test_id + '.nedb';

    global.TESTING_7 = true;

    var config = {
      name: 'testPersistedData',
      happn: {
        persist: true,
        defaultRoute: 'persist', //mem anyhow
        filename: dbFileName
      },
      modules: {
        DataComponent7: {
          path: __filename
        }
      },
      components: {
        DataComponent7: {
          moduleName: 'DataComponent7',
          data: {
            routes: {
              'things/*': 'persist',
              'stuff/*': 'mem'
            }
          },
          schema: {
            exclusive: false,
            methods: {}
          }
        },
        data: {
          data: {
            routes: {
              'things/*': 'persist',
              'stuff/*': 'mem'
            }
          }
        }
      }
    };

    after(function(done) {
      var _this = this;
      fs.unlink(dbFileName, function(e) {
        if (e) return callback(e);
        _this.mesh.stop({ reconnect: false }, done);
      });
    });

    before(function(done) {
      var _this = this;
      Mesh.create(config)
        .then(function(mesh) {
          _this.mesh = mesh;
          _this.datastores = mesh._mesh.happn.server.services.data.datastores;
          done();
        })
        .catch(done);
    });

    xit('tests storing data routed to mem', function(done) {
      var _this = this;
      var called = false;
      var originalFn = this.datastores.mem.db.update;
      this.datastores.mem.db.update = function() {
        called = true;
        originalFn.apply(this, arguments);
      };

      try {
        this.mesh.exchange.DataComponent7.storeData('stuff/this/thing', { test: 'data' }, function(
          e,
          response
        ) {
          if (e) return done(e);

          try {
            response._meta.path.should.equal('/_data/DataComponent7/stuff/this/thing');
            called.should.equal(true);
          } catch (e) {
            return done(e);
          } finally {
            _this.datastores.mem.update = originalFn;
          }

          done();
        });
      } catch (e) {
        done(e);
      } finally {
        this.datastores.mem.update = originalFn;
      }
    });

    xit('tests storing data routed to persist', function(done) {
      var _this = this;
      var called = false;
      var originalFn = this.datastores.persist.db.update;
      this.datastores.persist.db.update = function() {
        called = true;
        originalFn.apply(this, arguments);
      };

      try {
        this.mesh.exchange.DataComponent7.storeData('things/with/roman', { test: 'xata' }, function(
          e,
          response
        ) {
          if (e) return done(e);

          try {
            response._meta.path.should.equal('/_data/DataComponent7/things/with/roman');
            called.should.equal(true);
          } catch (e) {
            return done(e);
          } finally {
            _this.datastores.persist.update = originalFn;
          }

          done();
        });
      } catch (e) {
        done(e);
      } finally {
        this.datastores.persist.update = originalFn;
      }
    });

    xit('tests storing data routed to mem, in the data component', function(done) {
      var _this = this;
      var called = false;
      var originalFn = this.datastores.mem.db.update;
      this.datastores.mem.db.update = function() {
        called = true;
        originalFn.apply(this, arguments);
      };

      try {
        this.mesh.exchange.data.set('stuff/this/thing', { test: 'data' }, function(e, response) {
          if (e) return done(e);

          try {
            response._meta.path.should.equal('/_data/data/stuff/this/thing');
            called.should.equal(true);
          } catch (e) {
            return done(e);
          } finally {
            _this.datastores.mem.update = originalFn;
          }

          done();
        });
      } catch (e) {
        done(e);
      } finally {
        this.datastores.mem.update = originalFn;
      }
    });

    xit('tests storing data routed to persist, in the data component', function(done) {
      var _this = this;
      var called = false;
      var originalFn = this.datastores.persist.db.update;
      this.datastores.persist.db.update = function() {
        called = true;
        originalFn.apply(this, arguments);
      };

      try {
        this.mesh.exchange.data.set('things/with/roman', { test: 'xata' }, function(e, response) {
          if (e) return done(e);

          try {
            response._meta.path.should.equal('/_data/data/things/with/roman');
            called.should.equal(true);
          } catch (e) {
            return done(e);
          } finally {
            _this.datastores.persist.update = originalFn;
          }

          done();
        });
      } catch (e) {
        done(e);
      } finally {
        this.datastores.persist.update = originalFn;
      }
    });
  }
);
