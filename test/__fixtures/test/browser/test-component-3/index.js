module.exports = TestComponent3;

function TestComponent3() {
}

TestComponent3.prototype.start = function ($happn, callback) {
  this.interval = setInterval(function () {
    $happn.emit('test/event', {some: 'data'});
  }, 100);
  callback();
};

TestComponent3.prototype.stop = function ($happn, callback) {
  clearInterval(this.interval);
  callback();
};

TestComponent3.prototype.method1 = function ($happn, callback) {
  callback(null, 'OK:method1');
};

TestComponent3.prototype.emitEvent = function ($happn, key, data, callback) {
  $happn.emit(key, data, callback);
};
