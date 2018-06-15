describe(require('../../__fixtures/utils/test_helper').create().testName(__filename, 3), function () {

  var expect = require('expect.js');

  function mock$happn(options){

    if (!options) options = {};

    var $happn = {};

    options._mesh = options._mesh || {};

    options._mesh.happn = options._mesh.happn || {};

    options._mesh.happn.server = options._mesh.happn.server || {};

    options._mesh.happn.server.services = options._mesh.happn.server.services || {};

    options._mesh.happn.server.services.stats = options._mesh.happn.server.services.stats || {
      on: function(path, handler){

      }
    };

    $happn._mesh = options._mesh;

    $happn.emitLocal = options.emitLocal || function(path, data){

    };

    $happn.log = options.log || {
      info:function(){

      },
      error:function(){

      }
    };

    return $happn;
  }

  function mockSystemModule(options, callback){
    if (!options) options = {};
    var systemModule = require('../../../lib/modules/system/index')();

    options.$happn = options.$happn || mock$happn({
      emitLocal: function(path, data, callback){

        callback();
      },
      log:{
        info:function(){

        },
        error:function(){

        },
        trace:function(message){

        },
        warn:function(){

        }
      }
    });

    systemModule.__getStats = options.__getStats || function ($happn, callback) {
      return callback(null, {});
    };

    systemModule.initialize(options.$happn, function(e){
      if (e) return callback(e);
      return callback(null, systemModule);
    });
  }

  it('tests the __handleHappnStats function', function (done) {

    var $happn = mock$happn({
      emitLocal: function(path, data, callback){

        callback();
      },
      log:{
        info:function(){

        },
        error:function(){

        },
        trace:function(message){
          expect(message).to.be('stats emitted ok');
          done();
        },
        warn:function(){

        }
      }
    });

    mockSystemModule({$happn:$happn}, function(e, systemModule){
      systemModule.__handleHappnStats($happn, {});
    });
  });

  it('tests the __handleHappnStats function, happn client is disconnected', function (done) {

    var $happn = mock$happn({
      emitLocal: function(path, data, callback){

        callback(new Error('client is disconnected'));
      },
      log:{
        info:function(){

        },
        error:function(){

        },
        trace:function(message){
          expect(message).to.be('failure to emit stats, internal client not connected');
          done();
        },
        warn:function(){

        }
      }
    });

    mockSystemModule({$happn:$happn}, function(e, systemModule){
      systemModule.__handleHappnStats($happn, {});
    });
  });
});
