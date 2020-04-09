const tests = require('../../__fixtures/utils/test_helper').create();

describe(tests.testName(__filename, 3), function() {
  function mockMesh() {
    const Mesh = require('../../../lib/mesh');
    const mesh = new Mesh({});

    mesh.log = {
      info: function() {},
      error: function() {},
      trace: function() {},
      $$DEBUG: function() {},
      $$TRACE: function() {},
      createLogger: function() {
        return mesh.log;
      }
    };

    mesh.unsubscribeFromProcessEvents = function() {};
    return mesh;
  }

  this.timeout(5000);

  it('tests the _initializeDataLayer function, empty config', function(done) {
    var config = {};
    var mesh = mockMesh(config);

    mesh._initializeDataLayer(config, function() {
      tests.expect(config.happn.name).to.be(undefined);
      tests.expect(config.happn.port).to.be(55000);
      tests.expect(config.happn.secure).to.be(undefined);
      tests.expect(config.happn.persist).to.be(undefined);
      tests.expect(config.happn.services.data.config).to.eql({
        datastores: [
          {
            name: 'default',
            provider: './providers/nedb',
            isDefault: true,
            settings: {
              timestampData: true
            }
          }
        ]
      });

      tests.expect(config.happn.setOptions).to.eql({
        timeout: 10000,
        noStore: true
      });

      mesh.stop(done);
    });
  });

  it('tests the _initializeDataLayer function, config settings', function(done) {
    var config = {
      name: 'test',
      port: 55008,
      secure: true,
      persist: true
    };

    var mesh = mockMesh(config);

    mesh._initializeDataLayer(config, function() {
      tests.expect(config.happn.name).to.be('test');
      tests.expect(config.happn.port).to.be(55008);
      tests.expect(config.happn.secure).to.be(true);
      tests.expect(config.happn.persist).to.be(true);

      delete config.happn.services.data.config.datastores[0].settings.filename;

      tests.expect(config.happn.services.data.config).to.eql({
        datastores: [
          {
            name: 'persist',
            isDefault: true,
            settings: {
              autoload: true,
              timestampData: true
            },
            patterns: ['/_SYSTEM/*'],
            provider: './providers/nedb'
          },
          {
            name: 'mem',
            isDefault: false,
            patterns: [],
            provider: './providers/nedb'
          }
        ],
        secure: true
      });

      tests.expect(config.happn.setOptions).to.eql({
        timeout: 10000,
        noStore: true
      });

      mesh.stop(done);
    });
  });

  it('tests the _destroyElement nonexistent component', function(done) {
    var config = {};
    var mesh = mockMesh(config);

    mesh._destroyElement('nonexistent-component', function(e) {
      tests.expect(e).to.be(undefined);
      done();
    });
  });

  it('tests the _addInjectedArgument function', async () => {
    var config = {};
    var mesh = mockMesh(config);
    var expectedMessageHappened = false;

    mesh.log.debug = msg => {
      tests
        .expect(msg)
        .to.be(
          'cannot check native function testModule:testMethod4 arguments for $happn injection'
        );
      expectedMessageHappened = true;
    };

    const moduleInst = {
      module: {
        name: 'testModule',
        instance: getTestClass()
      }
    };

    mesh._addInjectedArgument(moduleInst, 'happn', function(e) {
      tests.expect(e).to.be(null);
    });
    await tests.delay(2000);
    tests.expect(expectedMessageHappened).to.be(true);
    tests.expect(moduleInst.module.instance.testMethod['$happnSeq']).to.be(0);
  });

  function getTestClass() {
    class ParentClass {
      testParentMethod() {}
    }
    class Class extends ParentClass {
      constructor() {
        super();
        this.testMethod4 = this.testMethod4.bind(this);
        this.property1 = {};
      }

      // eslint-disable-next-line no-unused-vars
      testMethod($happn, $origin) {}
      testMethod1() {}
      testMethod2() {}
      __testMethod3() {}
      testMethod4() {}
      testMethod__5() {}
    }
    return new Class();
  }
});
