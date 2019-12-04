/* eslint-disable no-console */
function TestComponent() {}

TestComponent.prototype.start = function(callback) {
  console.log('TestComponent start...');
  callback();
};

TestComponent.prototype.init = function(callback) {
  console.log('TestComponent init...');
  callback();
};

TestComponent.prototype.stop = function(callback) {
  console.log('TestComponent stop...');
  callback();
};

TestComponent.prototype.methodName1 = function(opts, callback) {
  if (opts.errorAs === 'callback') return callback(new Error('THIS IS JUST A TEST'));
  if (opts.errorAs === 'throw') throw new Error('THIS IS JUST A TEST');

  opts.number++;
  callback(null, opts);
};

module.exports = TestComponent;
/* eslint-enable no-console */
