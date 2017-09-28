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

  emitErrorData = e;
}

function onPublishOK(response){

  publishOKData = response;
}

function onPublishError(e){

  publishErrorData = e;
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

  $happn.emit(eventKey, data, options, function(e){

    callback(e);
  });
};

Component.prototype.getEvents = function ($happn, callback) {

  callback(null, {ok:emitOKData, error:emitErrorData, emit:emitData, publishOK:publishOKData, publishError: publishErrorData});
};
