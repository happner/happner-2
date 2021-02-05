module.exports = Component;

function Component() {}

Component.prototype.exec = function ($happn, eventKey, callback) {
  $happn.emit(eventKey, {DATA: 1}, function(e){
    callback(e);
  });
};

Component.prototype.getVersion = function ($happn, callback) {
  callback(null, $happn.exchange.componentName.__version);
};
