/**
 * Created by Johan on 4/14/2015.
 * Updated by S.Bishop 6/1/2015.
 */

var traverse = require('traverse');

module.exports = function(options) {
  return new Component1(options);
};

function Component1(options) {
  this.storeData = function($happn, path, data, parameters) {
    return $happn.data.set(path, data, parameters);
  };

  this.onCount = 0;

  this.getOnCount = function($happn, callback) {
    callback(null, this.onCount);
  };

  this.incrementGauge = function($happn, path, gauge, increment, callback) {
    $happn.data.increment(path, gauge, increment, callback);
  };

  this.getCount = function($happn, path, callback) {
    $happn.data.count(path, callback);
  };

  this.start = function($happn, arg, callback) {
    var _this = this;

    //path, parameters, handler, done
    $happn.data.on(
      '*/*/*/*',
      function(result) {
        _this.onCount++;
      },
      function(e) {
        if (e) return callback(e);
        callback();
      }
    );
  };

  this.stop = function() {};
}
