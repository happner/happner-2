module.exports = Component;

function Component() {}

Component.prototype.causeEmit = function ($happn, eventKey, callback) {
  $happn.emit(eventKey, {DATA: 1}, callback);
};

Component.prototype.getVersion = function ($happn, callback) {
  callback(null, $happn.exchange.componentName.__version);
};
