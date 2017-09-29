module.exports = Component;

function Component() {}

var emitOKData = null;
var emitErrorData = null;
var publishOKData = null;
var publishErrorData = null;

var emitData = {};

function onEmitOK(response){

  emitOKData = response;
}

function onEmitError(e){

  emitErrorData = e.toString();
}

function onPublishOK(response){

  publishOKData = response;
}

function onPublishError(e){
  publishErrorData = e.toString();
}

function onEmit(event, data){

  emitData[event] = data;
}

Component.prototype.initialize = function($happn, callback){

  $happn.on('on-emit-error', onEmitError);

  $happn.on('on-emit-ok', onEmitOK);

  $happn.on('on-publish-error', onPublishError);

  $happn.on('on-publish-ok', onPublishOK);

  $happn.event.component1.on('default-transactional', onEmit);

  callback();
};

Component.prototype.causeEmit = function ($happn, eventKey, data, options, callback) {

  $happn.emit(eventKey, data, options, function(e){

    callback(e);
  });
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

  callback(null, {ok:emitOKData, error:emitErrorData, emit:emitData, publishOK:publishOKData, publishError: publishErrorData});
};
