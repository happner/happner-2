module.exports = Module1;

function Module1() {
}

Module1.prototype.start = function (callback) {
  callback(null);
  // console.log('start', this.stop);
}

Module1.prototype.stop = function (callback) {
  // console.log('stop', this.$happn.config);
  callback();
};

Module1.prototype.getThingFromConfig = function ($happn, $origin, callback) {
  callback(null, $happn.config.configThing);
}
