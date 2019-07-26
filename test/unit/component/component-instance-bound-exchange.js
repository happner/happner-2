describe(require('../../__fixtures/utils/test_helper').create().testName(__filename, 3), function () {

  var expect = require('expect.js');

  it('tests the clearCachedBoundExchange function, uninitalized cache', function(){
    var ComponentInstance = require('../../../lib/system/component-instance');
    var componentInstance = new ComponentInstance();
    componentInstance.clearCachedBoundExchange();
  });

  it('tests the clearCachedBoundExchange function, initialized cache', function(done){
    var ComponentInstance = require('../../../lib/system/component-instance');
    var componentInstance = new ComponentInstance();
    componentInstance.boundExchangeCache = {
      clear:done
    }
    componentInstance.clearCachedBoundExchange();
  });

  it('tests the initializeCachedBoundExchange function, new cache', function(done){
    var ComponentInstance = require('../../../lib/system/component-instance');
    var componentInstance = new ComponentInstance();
    var EventEmitter = require('events').EventEmitter;
    var eventEmitter = new EventEmitter();
    var cleared = false;
    var mesh = {
      config:{
        boundExchangeCacheSize:5
      },
      happn:{
        server:{
          services:{
            security:eventEmitter,
            cache:{
              __caches:{},
              new:function(key, opts){
                expect(opts).to.eql({
                  type: 'LRU',
                  cache: {
                    max: mesh.config.boundExchangeCacheSize || 10000
                  }
                });
                return {
                  clear:function(){
                    if (cleared) return;
                    cleared = true;
                    done();
                  }
                };
              }
            }
          }
        }
      }
    }

    componentInstance.initializeCachedBoundExchange(mesh, 'test-component');
    mesh.happn.server.services.security.emit('security-data-changed', {});
  });

  it('tests the initializeCachedBoundExchange function, initialized cache', function(done){
    var ComponentInstance = require('../../../lib/system/component-instance');
    var componentInstance = new ComponentInstance();
    var EventEmitter = require('events').EventEmitter;
    var eventEmitter = new EventEmitter();
    var cleared = false;

    var mesh = {
      config:{
        boundExchangeCacheSize:5
      },
      happn:{
        server:{
          services:{
            security:eventEmitter,
            cache:{
              __caches:{
                'happner-bound-exchangeSecuredComponent':{
                  clear:done
                }
              },
              new:function(key, opts){
                expect(opts).to.eql({
                  type: 'LRU',
                  cache: {
                    max: mesh.config.boundExchangeCacheSize || 10000
                  }
                });
                return {
                  clear:function(){
                    if (cleared) return;
                    cleared = true;
                    done();
                  }
                };
              }
            }
          }
        }
      }
    }

    componentInstance.initializeCachedBoundExchange(mesh, 'test-component');
    mesh.happn.server.services.security.emit('security-data-changed', {});
  });

  it('tests the getCachedBoundExchange function, uninitialized cache', function(){
    var ComponentInstance = require('../../../lib/system/component-instance');
    var componentInstance = new ComponentInstance();
    expect(componentInstance.getCachedBoundExchange({
      username:'test-user'
    })).to.be(null);
  });

  it('tests the getCachedBoundExchange function, initialized cache', function(){
    var ComponentInstance = require('../../../lib/system/component-instance');
    var componentInstance = new ComponentInstance();

    componentInstance.boundExchangeCache = {
      getSync:function(){
        return {};
      }
    };

    expect(componentInstance.getCachedBoundExchange({
      username:'test-user'
    })).to.eql({});
  });

  it('tests the setCachedBoundExchange function, initialized cache', function(){
    var ComponentInstance = require('../../../lib/system/component-instance');
    var componentInstance = new ComponentInstance();

    var cached = {};

    componentInstance.boundExchangeCache = {
      getSync:function(key){
        return this[key];
      },
      setSync:function(key, value){
        this[key] = value;
      }
    };

    expect(componentInstance.setCachedBoundExchange('username', cached)).to.be(cached);
    expect(componentInstance.getCachedBoundExchange('username')).to.be(cached);
  });
});
