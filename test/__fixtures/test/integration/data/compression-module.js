module.exports = function (options) {
  return new Component1(options);
};

function Component1(options) {

  if (!options) options = {};

  this.methodBigPayload = function (payload, callback) {
      callback(null, JSON.stringify(payload).length);
  };
}
