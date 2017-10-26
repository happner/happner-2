module.exports = TestComponent2;

function TestComponent2() {
}

TestComponent2.prototype.start = function ($happn, callback) {
  this.interval = setInterval(function () {
    $happn.emit('test/event', {some: 'data'});
  }, 100);
  callback();
};

TestComponent2.prototype.stop = function ($happn, callback) {
  console.log('CALLING STOP:::');
  clearInterval(this.interval);
  callback();
};

TestComponent2.prototype.method1 = function ($happn, callback) {
  callback(null, 'OK:method1');
};
