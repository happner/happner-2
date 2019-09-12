describe(require('../../__fixtures/utils/test_helper').create().testName(__filename, 3), function() {

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
      web:{
        routes:{
          'static':'static',
          '/test/route':['testMethod'],
          'global':['testMethod']
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
      web:{
        routes:{
          'static':'static',
          '/test/route':['testMethod'],
          'global':'global'
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
});
