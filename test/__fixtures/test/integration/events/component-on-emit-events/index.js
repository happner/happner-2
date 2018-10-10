module.exports = Component;

function Component() {

  this.emitOKData = null;
  this.emitErrorData = null;
  this.publishOKData = null;
  this.publishErrorData = null;

  this.emitData = {};
  this.emitConcurrentData = [];
  this.emitListenerData = [];

  this.subscribed = false;

}

Component.create = function(){
  return new Component();
};

Component.prototype.onEmitOK = function(response){

  this.emitOKData = response;
};

Component.prototype.onEmitError = function(e){

  this.emitErrorData = e.toString();
};

Component.prototype.onPublishOK = function(response){

  this.publishOKData = response;
};

Component.prototype.onPublishError = function(e){
  this.publishErrorData = e.toString();
};

Component.prototype.onEmit = function(event, data){

  this.emitData[event] = data;
};

Component.prototype.onEmitConcurrent = function(event, data){
  this.emitConcurrentData.push(data);
};

Component.prototype.onEmitListener = function(event, data){
  this.emitListenerData.push(data);
};


Component.prototype.initialize = function($happn, callback){

  if (this.subscribed) return callback();

  $happn.on('on-emit-error', this.onEmitError.bind(this));

  $happn.on('on-emit-ok', this.onEmitOK.bind(this));

  $happn.on('on-publish-error', this.onPublishError.bind(this));

  $happn.on('on-publish-ok', this.onPublishOK.bind(this));

  $happn.event.component1.on('default-transactional', this.onEmit.bind(this));

  $happn.event.component1.on('test-concurrent-event', this.onEmitConcurrent.bind(this));

  $happn.event.component1.on('test-listener-id', this.onEmitListener.bind(this));

  this.subscribed = true;

  callback();
};

Component.prototype.causeOffConcurrent = function($happn, eventKey, callback){

  $happn.event.component1.offPath(eventKey, function(e){

    callback(e);
  });
};

Component.prototype.causeEmit = function ($happn, eventKey, data, options, callback) {

  $happn.emit(eventKey, data, options, function(e){

    callback(e);
  });
};

Component.prototype.causeEmitConcurrent = function ($happn, eventKey, data, options, callback) {

  $happn.emit(eventKey, data, options, function(e){

    callback(e);
  });
};

Component.prototype.causeEmitListener = function ($happn, eventKey, data, options, callback) {

  $happn.emit(eventKey, data, options, function(e){

    callback(e);
  });
};

Component.prototype.getConcurrentEvents = function ($happn, callback) {

  callback(null, this.emitConcurrentData);
};

Component.prototype.getListenerEvents = function ($happn, callback) {

  callback(null, this.emitListenerData);
};


Component.prototype.causeEmitError = function ($happn, eventKey, data, options, callback) {

  $happn.__oldEmit = $happn.emit;

  $happn.emit = function(eventKey, data, options, callback){

    $happn.__raiseOnPublishError(new Error('TEST ERROR'));

    $happn.__raiseOnEmitError(new Error('TEST ERROR'));

    return callback(new Error('TEST ERROR'));

  }.bind($happn);

  $happn.emit(eventKey, data, options, function(e){

    $happn.emit = $happn.__oldEmit;

    callback();
  });
};

Component.prototype.getEvents = function ($happn, callback) {

  callback(null, {ok:this.emitOKData, error:this.emitErrorData, emit:this.emitData, publishOK:this.publishOKData, publishError: this.publishErrorData});
};
