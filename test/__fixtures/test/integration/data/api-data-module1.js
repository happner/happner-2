/**
 * Created by Johan on 4/14/2015.
 * Updated by S.Bishop 6/1/2015.
 */

var traverse = require('traverse');

module.exports = function (options) {
  return new Component1(options);
};

function Component1(options) {

  this.storeData = function ($happn, path, data, parameters, callback) {
    $happn.data.set(path, data, parameters, callback);
  };

  this.onCount = 0;

  this.getOnCount = function ($happn, callback) {
    callback(null, this.onCount);
  };

  this.incrementGauge = function ($happn, path, gauge, increment, callback) {
    $happn.data.increment(path, gauge, increment, callback);
  };

  this.start = function ($happn, arg, callback) {

    var _this = this;

    //path, parameters, handler, done
    $happn.data.on('*/*/*/*', function (result) {
        _this.onCount++;
      },
      function (e) {
        if (e) return callback(e);
        console.log('on ok:::');
        callback();
      });

  };

  this.stop = function () {

  };
}
