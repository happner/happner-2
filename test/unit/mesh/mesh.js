const tests = require('../../__fixtures/utils/test_helper').create();
const Events = require('events');
describe(tests.testName(__filename, 3), function() {
  function mockMesh(config) {
    const Mesh = require('../../../lib/mesh');
    const mesh = new Mesh(config || {});
    const mockSecurityService = new Events.EventEmitter();
    mesh._mesh.happn = {
      server: {
        connect: {
          stack: []
        },
        services: {
          cache: {
            __caches: {},
            new: () => {
              return {
                clear: () => {}
              };
            }
          },
          security: mockSecurityService
        }
      }
    };
    mesh._mesh.data = {
      on: (_path, _cfg, _handler, cb) => {
        cb();
      },
      set: (_path, _val, _cfg, cb) => {
        cb();
      },
      offPath: (_path, cb) => {
        cb();
      }
    };
    mesh._mesh.config = {
      name: 'mock-mesh',
      happn: {},
      endpoints: []
    };
    mesh._mesh.endpoints = {
      'mock-mesh': {
        data: {
          onEvent: () => {},
          session: {}
        }
      }
    };
    mesh.log = {
      info: function() {},
      error: function() {},
      trace: function() {},
      debug: function() {},
      $$DEBUG: function() {},
      $$TRACE: function() {},
      createLogger: function() {
        return mesh.log;
      }
    };
    mesh.exchange = {};
    mesh.event = {};
    mesh.localEvent = new Events.EventEmitter();

    mesh.unsubscribeFromProcessEvents = function() {};
    mesh._mesh.log = mesh.log;
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

  it('tests the describe method', function(done) {
    const config = {};
    const mesh = mockMesh(config);
    try {
      mesh._mesh.config = {};
      mesh.describe();
    } catch (e) {
      tests.expect(e.message).to.be('Not ready');
      mesh._mesh = {
        endpoints: {
          test_name: {}
        },
        config: {
          name: 'test_name',
          happn: {}
        }
      };
      tests.expect(mesh.describe()).to.eql({
        name: undefined,
        initializing: false,
        components: {},
        brokered: false,
        setOptions: undefined
      });
      mesh._mesh.config.brokered = true;
      tests.expect(mesh.describe()).to.eql({
        name: undefined,
        initializing: false,
        components: {},
        brokered: true,
        setOptions: undefined
      });
      done();
    }
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
    tests.expect(moduleInst.module.instance.testMethod5['$happnSeq']).to.be(0);
    tests.expect(moduleInst.module.instance.testMethod6['$happnSeq']).to.be(0);
    tests.expect(moduleInst.module.instance.testMethod7['$happnSeq']).to.be(1);
  });

  it('tests the _updateElement method', function(done) {
    var config = {};
    var mesh = mockMesh(config);
    mesh._mesh.on('description-updated', desc => {
      tests.expect(JSON.parse(JSON.stringify(desc))).to.eql({
        initializing: false,
        components: {
          test: {
            name: 'test',
            version: '1.0.0',
            methods: {
              method: {
                parameters: [
                  {
                    name: 'param1'
                  },
                  {
                    name: 'callback'
                  }
                ]
              },
              method1: {
                parameters: [
                  {
                    name: 'callback'
                  }
                ]
              }
            },
            routes: {},
            events: {},
            data: {}
          }
        },
        brokered: false
      });
      done();
    });
    mesh._createElement(
      {
        module: {
          name: 'test',
          config: {
            instance: {
              method: function(callback) {
                callback(null, name + ' OK');
              }
            }
          }
        },
        component: {
          name: 'test'
        }
      },
      e => {
        if (e) return done(e);
        mesh._updateElement(
          {
            module: {
              name: 'test',
              config: {
                instance: {
                  method: function(param1, callback) {
                    callback(null, name + ' ' + param1 + ' OK');
                  },
                  method1: function(callback) {
                    callback(null, name + ' OK');
                  }
                }
              }
            },
            component: {
              name: 'test'
            }
          },
          e => {
            if (e) return done(e);
          }
        );
      }
    );
  });

  it('tests the componentAsyncMethod method', function(done) {
    var config = {};
    var mesh = mockMesh(config);

    let component = {
      instance: {}
    };
    //Error Case
    component.instance.operate = (methodName, args, callback) => {
      tests.expect(methodName).to.be('start');
      callback(new Error('Bad'));
    };
    let calls = ['thisCall'];
    mesh.componentAsyncMethod('componentName', component, { methodName: 'start' }, calls, 0, e => {
      tests.expect(calls).to.eql([]);
      tests.expect(e.toString()).to.be('Error: Bad');
    });

    //Normal Case
    component.instance.operate = (methodName, args, callback) => {
      tests.expect(methodName).to.be('start');
      callback(null, [null, 'awesome']);
    };
    calls = ['thatCall', 'thisCall'];
    mesh.componentAsyncMethod(
      'componentName',
      component,
      { methodName: 'start' },
      calls,
      1,
      (e, result) => {
        tests.expect(calls).to.eql(['thatCall']);
        tests.expect(result).to.be('awesome');
      }
    );

    //Tests Logging
    component.instance.operate = (methodName, args, callback) => {
      tests.expect(methodName).to.be('start');
      callback(null, [null, 'awesome']);
    };
    mesh.log.info = (msg, log, component) => {
      tests.expect(msg).to.be("%s component '%s'");
      tests.expect(log).to.be.true;
      tests.expect(component).to.be('componentName');
    };
    mesh.componentAsyncMethod(
      'componentName',
      component,
      { methodName: 'start', logAction: true },
      calls,
      0,
      (e, result) => {
        tests.expect(result).to.be('awesome');
        done();
      }
    );
  });

  it('tests the deferStartMethod method', async function() {
    var config = {};
    var mesh = mockMesh(config);
    let component = {
      instance: {}
    };
    mesh._mesh.clusterClient = new Events();
    let called = false;
    let calls = ['thisCall'];
    mesh.componentAsyncMethod = (name, comp, options, callsIn, call, callback) => {
      tests.expect(name).to.be('componentName');
      tests.expect(comp).to.be(component);
      tests.expect(options).to.eql({ methodName: 'start' });
      tests.expect(callsIn).to.be(calls);
      tests.expect(call).to.be(0);
      called = true;
      callback(null, 'awesome');
    };
    mesh.deferStartMethod(
      'componentName',
      component,
      { methodName: 'start' },
      calls,
      0,
      (e, result) => {
        tests.expect(e).to.be.null;
        tests.expect(result).to.be('awesome');
      }
    );
    await tests.delay(2000);
    tests.expect(called).to.be(false);
    mesh._mesh.clusterClient.emit('componentName/startup/dependencies/satisfied');
    await tests.delay(1000);
    tests.expect(called).to.be(true);
  }).timeout(6000);

  it('tests the eachComponentDo method - startMethod, no deps', function(done) {
    var config = {};
    var mesh = mockMesh(config);
    mesh._mesh.elements.componentName = {
      component: {
        config: {
          startMethod: 'start'
        }
      }
    };
    mesh.componentAsyncMethod = () => done();
    mesh.deferStartMethod = () => {
      done(new Error("defer shouldn't be called"));
    };
    let options = { targets: ['componentName'], methodCategory: 'startMethod' };
    mesh._eachComponentDo(options, e => {
      tests.expect(e).to.be(null);
    });
  });

  it('tests the eachComponentDo method - startMethod, deps not met', function(done) {
    var config = {};
    var mesh = mockMesh(config);

    mesh._mesh.elements.componentName = {
      component: {
        config: {
          startMethod: 'start',
          dependencies: {
            missingComponent: {
              version: '*'
            }
          }
        }
      }
    };
    mesh.componentAsyncMethod = () => done(new Error("defer shouldn't be called"));
    mesh.deferStartMethod = () => done();
    let options = { targets: ['componentName'], methodCategory: 'startMethod' };
    mesh._eachComponentDo(options, e => {
      tests.expect(e).to.be(null);
    });
  });

  it('tests the eachComponentDo method - startMethod, clusterClient, deps met', function(done) {
    var config = {};
    var mesh = mockMesh(config);

    mesh._mesh.elements.componentName = {
      component: {
        config: {
          startMethod: 'start',
          dependencies: {
            presentComponent: {
              version: '*'
            }
          }
        }
      }
    };
    mesh._mesh.clusterClient = { __implementors: { addAndCheckDependencies: () => true } };
    mesh.componentAsyncMethod = () => done();
    mesh.deferStartMethod = () => done(new Error("defer shouldn't be called"));
    let options = { targets: ['componentName'], methodCategory: 'startMethod' };
    mesh._eachComponentDo(options, e => {
      tests.expect(e).to.be(null);
    });
  });

  it('tests the eachComponentDo method - startMethod, clusterClient, deps not met', function(done) {
    var config = {};
    var mesh = mockMesh(config);

    mesh._mesh.elements.componentName = {
      component: {
        config: {
          startMethod: 'start',
          dependencies: {
            missingComponent: {
              version: '*'
            }
          }
        }
      }
    };
    mesh._mesh.clusterClient = { __implementors: { addAndCheckDependencies: () => false } };
    mesh.componentAsyncMethod = () => done(new Error("async shouldn't be called"));
    mesh.deferStartMethod = () => done();
    let options = { targets: ['componentName'], methodCategory: 'startMethod' };
    mesh._eachComponentDo(options, e => {
      tests.expect(e).to.be(null);
    });
  });

  it('tests the eachComponentDo method - startMethod, clusterClient, empty dependencies', function(done) {
    var config = {};
    var mesh = mockMesh(config);

    mesh._mesh.elements.componentName = {
      component: {
        config: {
          startMethod: 'start',
          dependencies: {}
        }
      }
    };
    mesh._mesh.clusterClient = {
      __implementors: {
        addAndCheckDependencies: () => done(new Error("addAndCheck Shouldn't be called"))
      }
    };
    mesh.componentAsyncMethod = () => done();
    mesh.deferStartMethod = () => done(new Error("defer shouldn't be called"));
    let options = { targets: ['componentName'], methodCategory: 'startMethod' };
    mesh._eachComponentDo(options, e => {
      tests.expect(e).to.be(null);
    });
  });

  it('tests the eachComponentDo method - undefinedMethod, not StartMethod category', function(done) {
    var config = {};
    var mesh = mockMesh(config);

    mesh._mesh.elements.componentName = {
      component: {
        config: {
          startMethod: 'start',
          dependencies: {
            missingComponent: {
              version: '*'
            }
          }
        }
      }
    };
    mesh._mesh.clusterClient = {
      __implementors: {
        addAndCheckDependencies: () => done(new Error("addAndCheck Shouldn't be called"))
      }
    };
    mesh.componentAsyncMethod = () => done();
    mesh.deferStartMethod = () => done(new Error("defer shouldn't be called"));
    let options = { targets: ['componentName'], methodName: 'unknownMethod' };
    mesh._eachComponentDo(options, e => {
      tests.expect(e).to.be(null);
    });
  });

  it('tests that the _createElement method will start and intialize an injected component if the mesh is already started and initialized', function(done) {
    var config = {};
    var mesh = mockMesh(config);
    let initialized, started;
    let component = {
      module: {
        name: 'componentName',
        config: {
          instance: {
            initialize: async () => {
              initialized = true;
            },
            start: async () => {
              started = true;
            }
          }
        }
      },
      component: {
        name: 'componentName',
        config: {
          initMethod: 'initialize',
          startMethod: 'start'
        }
      }
    };

    mesh._mesh.initialized = true;
    mesh._mesh.started = true;

    mesh._createElement(component, true, e => {
      if (e) done(e);
      tests.expect(initialized).to.be(true);
      tests.expect(started).to.be(true);
      done();
    });
  });

  it('tests that the _createElement method will NOT start and intialize an injected component if the mesh is not started and not initialized', function(done) {
    var config = {};
    var mesh = mockMesh(config);
    let initialized = false,
      started = false;
    let component = {
      module: {
        name: 'componentName',
        config: {
          instance: {
            initialize: async () => {
              initialized = true;
            },
            start: async () => {
              started = true;
            }
          }
        }
      },
      component: {
        name: 'componentName',
        config: {
          initMethod: 'initialize',
          startMethod: 'start'
        }
      }
    };

    mesh._mesh.initialized = false;
    mesh._mesh.started = false;

    mesh._createElement(component, true, e => {
      if (e) done(e);
      tests.expect(initialized).to.be(false);
      tests.expect(started).to.be(false);
      done();
    });
  });

  it('tests that the attachSystemComponents method', function() {
    var mesh = mockMesh({});
    const testConfig = {
      modules: {
        test1: {
          path: 'test1Path'
        }
      },
      components: {
        test1: {}
      }
    };
    mesh.attachSystemComponents(testConfig);
    tests.expect(testConfig).to.eql({
      modules: {
        api: {
          path: 'system:api'
        },
        security: {
          path: 'system:security'
        },
        system: {
          path: 'system:system'
        },
        data: {
          path: 'system:data'
        },
        rest: {
          path: 'system:rest'
        },
        test1: {
          path: 'test1Path'
        }
      },
      components: {
        security: {
          accessLevel: 'mesh',
          initMethod: 'initialize'
        },
        api: {
          accessLevel: 'mesh',
          startMethod: 'start',
          stopMethod: 'stop',
          web: {
            routes: {
              client: 'client'
            }
          }
        },
        system: {
          accessLevel: 'mesh',
          initMethod: 'initialize'
        },
        rest: {
          accessLevel: 'mesh',
          initMethod: 'initialize',
          web: {
            routes: {
              method: 'handleRequest',
              describe: 'describe',
              login: 'login'
            }
          }
        },
        test1: {}
      }
    });
  });

  function getTestClass() {
    class ParentClass {
      testParentMethod() {}
    }
    class Class extends ParentClass {
      constructor() {
        super();
        this.testMethod4 = this.testMethod4.bind(this);
        this.testMethod5 = $happn => $happn;
        // prettier-ignore
        this.testMethod6 = ($happn) => $happn;
        this.testMethod7 = (param, $happn) => ({ $happn, param });
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
