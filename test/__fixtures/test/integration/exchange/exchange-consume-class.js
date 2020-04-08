module.exports = class Test {
    constructor () {
        
    }

    start(options) {
        this.callbackTimeout = options.callbackTimeout;
    };

    exchangeFunction (object, callback) {
        return callback(null, object);
    };

    methodOk(object, callback) {
        callback(null, object);
    };

    methodError(callback) {
        callback(new Error('Some problem'));
    };

    methodInjectHappn1($happn, object, callback) {
        callback(null, {meshName: $happn.info.mesh.name});
    };

    methodInjectHappn2(object, $happn, callback) {
        callback(null, {meshName: $happn.info.mesh.name});
    };

    methodInjectOrigin($origin, object, $happn, callback) {
        object.meshName = $happn.info.mesh.name;
        object.originUser = $origin.username;
        callback(null, object);
    };

    methodInjectHappnLast(object, $origin, callback, $happn) {
        object.meshName = $happn.info.mesh.name;
        object.originUser = $origin.username;
        callback(null, object);
    };

    synchronousMethod($origin, object, $happn) {
        console.log(arguments);
    };
}

  