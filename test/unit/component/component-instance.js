describe(
  require('../../__fixtures/utils/test_helper')
    .create()
    .testName(__filename, 3),
  function() {
    var expect = require('expect.js');

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
  }
);
