module.exports = Component;

function Component() {}

Component.prototype.causeEmit = function ($happn, eventKey, callback) {
  $happn.emit(eventKey, {DATA: 1}, callback);
};


