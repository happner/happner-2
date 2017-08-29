var repl = require('repl');
var replHistory = require('repl.history');
var net = require('net');
var fs = require('fs');

var running = false; // one per process
var server, log;

// First Mesh to call repl.start has instance
module.exports.create = function (instance) {

  if (!instance._mesh.config.repl) {
    if (process.env.UNROOT_ON_REPL) delete global.$happner;
    return;
  }

  if (running) return;

  var originalLevel = global['happn-logger'].config.logWriter.level.levelStr;
  var originalComponents = global['happn-logger'].config.logComponents;

  var config = instance._mesh.config.repl;
  var address = typeof config.socket == 'string' ? config.socket : 'localhost' + config.port;

  if (typeof config.socket !== 'string' && typeof config.port !== 'number') {
    return;
  }

  running = true;
  log = log || instance.log.createLogger('Repl');
  log.$$TRACE('create()');

  // This occurs before components start.
  // They can remain isolated but repl can still have access to all as follows
  // START_AS_ROOTED=1 UNROOT_ON_REPL=1 node my_mesh_nodes.js

  var happner = global.$happner;

  if (process.env.UNROOT_ON_REPL) delete global.$happner;

  server = net.createServer(function (socket) {

    log.info('connection on %s', address);
    var r = repl.start({
      prompt: instance._mesh.config.name + '> ',
      input: socket,
      output: socket,
      terminal: true,
      ignoreUndefined: (typeof config.ignoreUndefined == 'undefined') ? false : config.ignoreUndefined,
      useGlobal: true,
      useColors: (typeof config.useColors == 'undefined') ? true : config.useColors
    });

    if (config.historyFile) {
      replHistory(r, config.historyFile);
    }

    if (happner) r.context.$happner = happner;

    r.context.mesh = instance;

    // callback stub for use with methods
    r.context.$callback = function (err, res) {
      var callback = r.context.$callback;

      callback.history.unshift({
        err: err,
        res: res
      });

      while (callback.history.length > 10) {
        callback.history.pop();
      }

      callback.err = err;
      callback.res = res;
    }

    var history = [];

    if (!r.context.$callback.history) {
      Object.defineProperty(r.context.$callback, 'history', {
        enumerable: true,
        get: function () {
          return history;
        }
      });
    }

    r.context.$callback.err = null;
    r.context.$callback.res = null;

    // easy access to reset logger

    r.context.$logger = {};

    Object.defineProperty(r.context.$logger, 'reset', {
      enumerable: true,
      get: function () {
        global['happn-logger'].config.logWriter.setLevel(originalLevel);
        global['happn-logger'].config.logComponents = originalComponents;
      }
    });

    Object.defineProperty(r.context.$logger, 'level', {
      enumerable: true,
      set: function (level) {
        global['happn-logger'].config.logWriter.setLevel(level);
      }
    });

    Object.defineProperty(r.context.$logger, 'components', {
      enumerable: true,
      set: function (components) {
        if (!Array.isArray(components)) return;
        global['happn-logger'].config.logComponents = components;
      }
    });

    socket.on('close', function () {
      log.info('connection departed %s', address);
    });

    socket.on('error', function (err) {});

  });

  if (typeof config.socket == 'string') {
    server.listen(config.socket, function () {});
  } else if (typeof config.port == 'number') {
    server.listen(config.port, 'localhost', function () {});
  }

  server.on('error', function (err) {
    log.error('server error', err);
  });

  server.on('listening', function () {
    log.info('listening at %s', address);
  });

  var clearFd = function () {
    if (typeof config.socket == 'string') {
      try {
        log.debug('deleting %s', config.socket);
        fs.unlinkSync(config.socket);
      } catch (e) {}
    }
  }

  process.on('exit', clearFd);
  process.on('SIGINT', clearFd);
  process.on('SIGTERM', clearFd);

}
