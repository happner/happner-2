describe(require('../../__fixtures/utils/test_helper').create().testName(__filename, 3), function () {

  var expect = require('expect.js');

  function mockData(state){

    if (!state) state = 1;//active

    return {
      status:state,
      get: function(path, opts, callback){
        return callback();
      },
      on:function(path, opts, handler, callback){
        return callback();
      },
      off:function(path, callback){
        return callback();
      },
      offPath:function(path, callback){
        return callback();
      },
      getPaths:function(path, callback){
        return callback();
      },
      set: function(path, data, opts, callback){
        return callback();
      },
      setSibling: function(path, data, callback){
        return callback();
      },
      increment: function(path, gauge, increment, callback){
        return callback();
      },
      remove: function(path, opts, callback){
        return callback();
      }
    };
  }

  it('test the on with a connection', function(done){
    var ComponentInstance = require('../../../lib/system/component-instance');
    var componentInstance = new ComponentInstance();
    var secureData = componentInstance.secureData(mockData(), 'test-component');

    secureData.on('test/path', {}, function(data){

    }, done);
  });

  it('test the on without a connection', function(done){
    var ComponentInstance = require('../../../lib/system/component-instance');
    var componentInstance = new ComponentInstance();
    var secureData = componentInstance.secureData(mockData(2), 'test-component');

    secureData.on('test/path', {}, function(data){

    }, function(e){
      expect(e.toString()).to.be('Error: client state not active or connected, on:' + 'test/path' + ', component:' + 'test-component');
      done();
    });
  });

  it('test the on without a connection, with default args', function(done){
    var ComponentInstance = require('../../../lib/system/component-instance');
    var componentInstance = new ComponentInstance();
    var secureData = componentInstance.secureData(mockData(2), 'test-component');

    secureData.on('test/path', function(data){

    }, function(e){
      expect(e.toString()).to.be('Error: client state not active or connected, on:' + 'test/path' + ', component:' + 'test-component');
      done();
    });
  });

  it('test the off with a connection', function(done){
    var ComponentInstance = require('../../../lib/system/component-instance');
    var componentInstance = new ComponentInstance();
    var secureData = componentInstance.secureData(mockData(), 'test-component');

    secureData.off('test/path', done);
  });

  it('test the off without a connection', function(done){
    var ComponentInstance = require('../../../lib/system/component-instance');
    var componentInstance = new ComponentInstance();
    var secureData = componentInstance.secureData(mockData(2), 'test-component');

    secureData.off('test/path', function(e){
      expect(e.toString()).to.be('Error: client state not active or connected, off ref:' + 'test/path' + ', component:' + 'test-component');
      done();
    });
  });

  it('test the offAll with a connection', function(done){
    var ComponentInstance = require('../../../lib/system/component-instance');
    var componentInstance = new ComponentInstance();
    var secureData = componentInstance.secureData(mockData(), 'test-component');

    secureData.offAll(done);
  });

  it('test the offAll without a connection', function(done){
    var ComponentInstance = require('../../../lib/system/component-instance');
    var componentInstance = new ComponentInstance();
    var secureData = componentInstance.secureData(mockData(2), 'test-component');

    secureData.offAll(function(e){
      expect(e.toString()).to.be('Error: client state not active or connected, offAll, component:test-component');
      done();
    });
  });

  it('test the offPath with a connection', function(done){
    var ComponentInstance = require('../../../lib/system/component-instance');
    var componentInstance = new ComponentInstance();
    var secureData = componentInstance.secureData(mockData(), 'test-component');

    secureData.offPath('test/path', done);
  });

  it('test the offPath without a connection', function(done){
    var ComponentInstance = require('../../../lib/system/component-instance');
    var componentInstance = new ComponentInstance();
    var secureData = componentInstance.secureData(mockData(2), 'test-component');

    secureData.offPath('test/path', function(e){
      expect(e.toString()).to.be('Error: client state not active or connected, offPath:test/path, component:test-component');
      done();
    });
  });

  it('test the get with a connection', function(done){
    var ComponentInstance = require('../../../lib/system/component-instance');
    var componentInstance = new ComponentInstance();
    var secureData = componentInstance.secureData(mockData(), 'test-component');

    secureData.get('test/path', {}, done);
  });

  it('test the get without a connection', function(done){
    var ComponentInstance = require('../../../lib/system/component-instance');
    var componentInstance = new ComponentInstance();
    var secureData = componentInstance.secureData(mockData(2), 'test-component');

    secureData.get('test/path', {}, function(e){
      expect(e.toString()).to.be('Error: client state not active or connected, get:' + 'test/path' + ', component:' + 'test-component');
      done();
    });
  });

  it('test the get without a connection, default args', function(done){
    var ComponentInstance = require('../../../lib/system/component-instance');
    var componentInstance = new ComponentInstance();
    var secureData = componentInstance.secureData(mockData(2), 'test-component');

    secureData.get('test/path', function(e){
      expect(e.toString()).to.be('Error: client state not active or connected, get:' + 'test/path' + ', component:' + 'test-component');
      done();
    });
  });

  it('test the getPaths with a connection', function(done){
    var ComponentInstance = require('../../../lib/system/component-instance');
    var componentInstance = new ComponentInstance();
    var secureData = componentInstance.secureData(mockData(), 'test-component');

    secureData.getPaths('test/path/*', done);
  });

  it('test the getPaths without a connection', function(done){
    var ComponentInstance = require('../../../lib/system/component-instance');
    var componentInstance = new ComponentInstance();
    var secureData = componentInstance.secureData(mockData(2), 'test-component');

    secureData.getPaths('test/path/*', function(e){
      expect(e.toString()).to.be('Error: client state not active or connected, getPaths:' + 'test/path/*' + ', component:' + 'test-component');
      done();
    });
  });

  it('test the set with a connection', function(done){
    var ComponentInstance = require('../../../lib/system/component-instance');
    var componentInstance = new ComponentInstance();
    var secureData = componentInstance.secureData(mockData(), 'test-component');

    secureData.set('test/path', {}, {}, done);
  });

  it('test the set without a connection', function(done){
    var ComponentInstance = require('../../../lib/system/component-instance');
    var componentInstance = new ComponentInstance();
    var secureData = componentInstance.secureData(mockData(2), 'test-component');

    secureData.set('test/path', {}, {}, function(e){
      expect(e.toString()).to.be('Error: client state not active or connected, set:' + 'test/path' + ', component:' + 'test-component');
      done();
    });
  });

  it('test the set without a connection, default args', function(done){
    var ComponentInstance = require('../../../lib/system/component-instance');
    var componentInstance = new ComponentInstance();
    var secureData = componentInstance.secureData(mockData(2), 'test-component');

    secureData.set('test/path', {}, function(e){
      expect(e.toString()).to.be('Error: client state not active or connected, set:' + 'test/path' + ', component:' + 'test-component');
      done();
    });
  });

  it('test the increment with a connection', function(done){
    var ComponentInstance = require('../../../lib/system/component-instance');
    var componentInstance = new ComponentInstance();
    var secureData = componentInstance.secureData(mockData(), 'test-component');

    secureData.increment('test/path', 'test-gauge', 1, done);
  });

  it('test the increment without a connection', function(done){
    var ComponentInstance = require('../../../lib/system/component-instance');
    var componentInstance = new ComponentInstance();
    var secureData = componentInstance.secureData(mockData(2), 'test-component');

    secureData.increment('test/path', 'test-gauge', 1, function(e){
      expect(e.toString()).to.be('Error: client state not active or connected, increment:' + 'test/path' + ', component:' + 'test-component');
      done();
    });
  });

  it('test the increment without a connection, default args 1', function(done){
    var ComponentInstance = require('../../../lib/system/component-instance');
    var componentInstance = new ComponentInstance();
    var secureData = componentInstance.secureData(mockData(2), 'test-component');

    secureData.increment('test/path', function(e){
      expect(e.toString()).to.be('Error: client state not active or connected, increment:' + 'test/path' + ', component:' + 'test-component');
      done();
    });
  });

  it('test the increment without a connection, default args 2', function(done){
    var ComponentInstance = require('../../../lib/system/component-instance');
    var componentInstance = new ComponentInstance();
    var secureData = componentInstance.secureData(mockData(2), 'test-component');

    secureData.increment('test/path', 'test-gauge', function(e){
      expect(e.toString()).to.be('Error: client state not active or connected, increment:' + 'test/path' + ', component:' + 'test-component');
      done();
    });
  });

  it('test the setSibling with a connection', function(done){
    var ComponentInstance = require('../../../lib/system/component-instance');
    var componentInstance = new ComponentInstance();
    var secureData = componentInstance.secureData(mockData(), 'test-component');

    secureData.setSibling('test/path', {}, done);
  });

  it('test the setSibling without a connection', function(done){
    var ComponentInstance = require('../../../lib/system/component-instance');
    var componentInstance = new ComponentInstance();
    var secureData = componentInstance.secureData(mockData(2), 'test-component');

    secureData.setSibling('test/path', {}, function(e){
      expect(e.toString()).to.be('Error: client state not active or connected, setSibling:' + 'test/path' + ', component:' + 'test-component');
      done();
    });
  });

  it('test the remove with a connection', function(done){
    var ComponentInstance = require('../../../lib/system/component-instance');
    var componentInstance = new ComponentInstance();
    var secureData = componentInstance.secureData(mockData(), 'test-component');

    secureData.remove('test/path', {}, done);
  });

  it('test the remove without a connection', function(done){
    var ComponentInstance = require('../../../lib/system/component-instance');
    var componentInstance = new ComponentInstance();
    var secureData = componentInstance.secureData(mockData(2), 'test-component');

    secureData.remove('test/path', {}, function(e){
      expect(e.toString()).to.be('Error: client state not active or connected, remove:' + 'test/path' + ', component:' + 'test-component');
      done();
    });
  });

  it('test the remove without a connection, default args', function(done){
    var ComponentInstance = require('../../../lib/system/component-instance');
    var componentInstance = new ComponentInstance();
    var secureData = componentInstance.secureData(mockData(2), 'test-component');

    secureData.remove('test/path', function(e){
      expect(e.toString()).to.be('Error: client state not active or connected, remove:' + 'test/path' + ', component:' + 'test-component');
      done();
    });
  });

});
