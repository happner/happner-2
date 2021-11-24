class Component {
  constructor() {}
  static create() {
    return new Component();
  }

  initialize = function($happn, callback) {
    callback();
  };
   causeEmit($happn, eventKey, data, callback) {
   $happn.emit(eventKey, data, null, callback);   
  }
}
module.exports = Component;
