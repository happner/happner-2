/**
 * Created by Johan on 4/14/2015.
 * Updated by S.Bishop 6/1/2015.
 */


module.exports = function (options) {
  return new Component1(options);
};

function Component1(options) {

  if (!options) options = {};

  this.methodBigPayload = function (payload, callback) {
      callback(null, JSON.stringify(payload).length);
  };
}
