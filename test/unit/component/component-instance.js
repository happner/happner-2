describe(
  require('../../__fixtures/utils/test_helper')
    .create()
    .testName(__filename, 3),
  function() {
    var expect = require('expect.js');

    it('test the describe method', function() {
      var ComponentInstance = require('../../../lib/system/component-instance');
      var componentInstance = new ComponentInstance();
      componentInstance.name = 'test-component-instance';
      componentInstance.module = {
        name: 'test-name-module',
        version: '1.0.0',
        instance: mockModuleInstance()
      };
      componentInstance.description = {
        test: 'description'
      };
      componentInstance.config = {
        methods: {
          testMethod1: {
            parameters: [
              {
                name: 'arg11'
              },
              {
                name: 'arg12'
              }
            ]
          },
          testMethod2: {}
        },
        events: {},
        web: {
          routes: {
            'test/route/1': ['testMethod3', 'testMethod4'],
            'test/route/2': 'testMethod5',
            static: 'staticHandler'
          }
        }
      };
      expect(componentInstance.describe(false)).to.eql({
        name: 'test-component-instance',
        version: '1.0.0',
        methods: {
          testMethod1: {
            isAsyncMethod: true,
            parameters: [
              {
                name: 'arg11'
              },
              {
                name: 'arg12'
              }
            ]
          },
          testMethod2: {
            isAsyncMethod: true,
            parameters: [
              {
                name: 'arg21'
              },
              {
                name: 'arg22'
              }
            ]
          }
        },
        routes: {
          '/test-component-instance/test/route/1': {
            type: 'mware'
          },
          '/test-component-instance/test/route/2': {
            type: 'mware'
          },
          '/': {
            type: 'mware'
          }
        },
        events: {},
        data: {}
      });
    });

    it('test the describe method - cached', function() {
      var ComponentInstance = require('../../../lib/system/component-instance');
      var componentInstance = new ComponentInstance();
      componentInstance.description = {
        test: 'description'
      };
      expect(componentInstance.describe(true)).to.eql({
        test: 'description'
      });
    });

    it('test the describe method - clear-cache', function() {
      var ComponentInstance = require('../../../lib/system/component-instance');
      var componentInstance = new ComponentInstance();
      componentInstance.name = 'test-name';
      componentInstance.module = {
        name: 'test-name-module',
        version: '1.0.0'
      };
      componentInstance.description = {
        test: 'description'
      };
      componentInstance.config = {};
      expect(componentInstance.describe(false)).to.eql({
        name: 'test-name',
        version: '1.0.0',
        methods: {},
        routes: {},
        events: {},
        data: {}
      });
    });

    it('test the describe method - clear-cache, web routes', function() {
      var ComponentInstance = require('../../../lib/system/component-instance');
      var componentInstance = new ComponentInstance();
      componentInstance.name = 'test-name';
      componentInstance.module = {
        name: 'test-name-module',
        version: '1.0.0'
      };
      componentInstance.description = {
        test: 'description'
      };
      componentInstance.config = {
        web: {
          routes: {
            static: 'static',
            '/test/route': ['testMethod'],
            global: ['testMethod']
          }
        }
      };
      expect(componentInstance.describe(false)).to.eql({
        name: 'test-name',
        version: '1.0.0',
        methods: {},
        routes: {
          '/': { type: 'static' },
          '/test-name//test/route': { type: 'mware' },
          '/test-name/global': { type: 'mware' }
        },
        events: {},
        data: {}
      });
    });

    it('test the describe method - clear-cache, web routes www', function() {
      var ComponentInstance = require('../../../lib/system/component-instance');
      var componentInstance = new ComponentInstance();
      componentInstance.name = 'www';
      componentInstance.module = {
        name: 'test-name-module',
        version: '1.0.0'
      };
      componentInstance.description = {
        test: 'description'
      };
      componentInstance.config = {
        web: {
          routes: {
            static: 'static',
            '/test/route': ['testMethod'],
            global: 'global'
          }
        }
      };
      expect(componentInstance.describe(false)).to.eql({
        name: 'www',
        version: '1.0.0',
        methods: {},
        routes: {
          '/': { type: 'static' },
          '//test/route': { type: 'mware' }
        },
        events: {},
        data: {}
      });
    });

    it('test the __reply method missing peer', function(done) {
      var ComponentInstance = require('../../../lib/system/component-instance');
      var componentInstance = new ComponentInstance();
      componentInstance.log = {
        error: msg => {
          expect(msg).to.be('Failure on callback, missing peer');
          done();
        }
      };
      componentInstance.__reply(
        'testCallbackAddress',
        'testCallbackPeer',
        mockResponse(),
        mockOptions(),
        mockMesh(
          {
            publish: () => {
              done(new Error('should not have happened'));
            }
          },
          {}
        )
      );
    });

    it('test the __callBackWithWarningAndError method', function(done) {
      var ComponentInstance = require('../../../lib/system/component-instance');
      var componentInstance = new ComponentInstance();
      let warningMsg;
      componentInstance.log = {
        warn: msg => {
          warningMsg = msg;
        }
      };
      componentInstance.__callBackWithWarningAndError('Test Category', 'Test Error', e => {
        expect(e.message).to.be('Test Error');
        expect(warningMsg).to.be('Test Category:Test Error');
        done();
      });
    });

    it('tests the semver component', () => {
      var ComponentInstance = require('../../../lib/system/component-instance');
      var componentInstance = new ComponentInstance();
      let semver = componentInstance.semver;
      expect(semver.satisfies('1.0.1', '^1.0.0')).to.be(true);
      expect(semver.satisfies('2.0.0', '^1.0.0')).to.be(false);
      expect(semver.satisfies('1.0.0-prerelease-1', '^1.0.0')).to.be(false);
      expect(semver.coercedSatisfies('1.0.0-prerelease-1', '^1.0.0')).to.be(true);
      expect(semver.coercedSatisfies('2.0.0-prerelease-1', '^1.0.0')).to.be(false);
      expect(semver.satisfies('1.0.1', '*')).to.be(true);
      expect(semver.coercedSatisfies('2.0.0-prerelease-1', '*')).to.be(true);
      expect(semver.satisfies('1.0.1', '*')).to.be(true);
      expect(semver.coercedSatisfies('1.0.3-smc-842-1', '^1.0.0')).to.be(true);
      expect(semver.coercedSatisfies('16.1.4-prerelease-9', '16.1.4-prerelease-9')).to.be(true);
    });

    it('tests the _inject method', () => {
      var ComponentInstance = require('../../../lib/system/component-instance');
      var componentInstance = new ComponentInstance();
      componentInstance.bindToOrigin = origin => {
        return { bound: origin };
      };
      let params = [1, 2];
      componentInstance._inject(
        {
          parameters: [
            { name: 'param1' },
            { name: 'param2' },
            { name: '$happn' },
            { name: '$origin' }
          ]
        },
        params,
        { test: 'origin' }
      );
      expect(params).to.eql([1, 2, { bound: { test: 'origin' } }, { test: 'origin' }]);

      params = [1, 2];
      componentInstance._inject(
        {
          parameters: [
            { name: '$happn' },
            { name: '$origin' },
            { name: 'param1' },
            { name: 'param2' }
          ]
        },
        params,
        { test: 'origin' }
      );
      expect(params).to.eql([{ bound: { test: 'origin' } }, { test: 'origin' }, 1, 2]);

      params = [1, 2];
      componentInstance._inject(
        {
          parameters: [
            { name: '$happn' },
            { name: 'param1' },
            { name: 'param2' },
            { name: '$origin' }
          ]
        },
        params,
        { test: 'origin' }
      );
      expect(params).to.eql([{ bound: { test: 'origin' } }, 1, 2, { test: 'origin' }]);

      params = [1, 2];
      componentInstance._inject(
        {
          parameters: [
            { name: 'param1' },
            { name: '$happn' },
            { name: 'param2' },
            { name: '$origin' }
          ]
        },
        params,
        { test: 'origin' }
      );
      expect(params).to.eql([1, { bound: { test: 'origin' } }, 2, { test: 'origin' }]);

      params = [1];
      componentInstance._inject(
        {
          parameters: [
            { name: 'param1' },
            { name: '$happn' },
            { name: 'param2' },
            { name: '$origin' }
          ]
        },
        params,
        { test: 'origin' }
      );
      expect(params).to.eql([1, { bound: { test: 'origin' } }, undefined, { test: 'origin' }]);

      params = [];
      componentInstance._inject(
        {
          parameters: [
            { name: 'param1' },
            { name: '$happn' },
            { name: 'param2' },
            { name: '$origin' }
          ]
        },
        params,
        { test: 'origin' }
      );
      expect(params).to.eql([
        undefined,
        { bound: { test: 'origin' } },
        undefined,
        { test: 'origin' }
      ]);
    });

    function mockResponse() {
      return {};
    }

    function mockOptions() {
      return {};
    }

    function mockMesh(data, peers) {
      return {
        data,
        happn: {
          server: {
            services: {
              orchestrator: {
                peers
              }
            }
          }
        }
      };
    }
    function mockModuleInstance() {
      class MockModule {
        static create() {
          return new MockModule();
        }
        async testMethod1(arg11, arg12) {
          await test.delay(10);
          test.log(`method 1 called, ${[arg11, arg12]}`);
        }
        async testMethod2(arg21, arg22) {
          await test.delay(10);
          test.log(`method 1 called, ${[arg21, arg22]}`);
        }
      }
      return MockModule.create();
    }
  }
);
