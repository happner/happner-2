module.exports = Data;

// For shared data.

function Data() {}

Data.prototype.set = function ($happn, path, data, opts, callback) {

  if (typeof opts == 'function') {
    callback = opts;
    opts = {};
  }

  return $happn.asAdmin.data.set(path, data, opts, function (err, result) {
    callback(err, result);
    if (err == null && !(opts && opts.noPublish)) $happn.emit(path, data);
  });
};

Data.prototype.on = function ($happn, path, opts, handler, callback) {

  if (typeof opts == 'function') {
    callback = handler;
    handler = opts;
    opts = {};
  }

  return $happn.asAdmin.data.on(path, opts, handler, callback);
};

Data.prototype.off = function ($happn, path, callback) {
  return $happn.asAdmin.data.off(path, callback);
};

Data.prototype.offAll = function ($happn, callback) {
  return $happn.asAdmin.data.offAll(callback);
};

Data.prototype.offPath = function ($happn, path, callback) {
  return $happn.asAdmin.data.offPath(path, callback);
};

Data.prototype.get = function ($happn, path, opts, callback) {

  if (typeof opts == 'function') {
    callback = opts;
    opts = {};
  }

  return $happn.asAdmin.data.get(path, opts, callback);
};

Data.prototype.getPaths = function ($happn, path, callback) {
  return $happn.asAdmin.data.getPaths(path, callback);
};

Data.prototype.count = function ($happn, path, opts, callback) {

  if (typeof opts == 'function') {
    callback = opts;
    opts = {};
  }

  return $happn.asAdmin.data.count(path, opts, callback);
};

Data.prototype.remove = function ($happn, path, opts, callback) {

  if (typeof opts == 'function') {
    callback = opts;
    opts = {};
  }

  return $happn.asAdmin.data.remove(path, opts, callback);
};

Data.prototype.increment = function ($happn, path, gauge, increment, callback) {

  return $happn.asAdmin.data.increment(path, gauge, increment, callback);
};
