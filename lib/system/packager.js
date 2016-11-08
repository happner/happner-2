// TODO: This is expensive... minifies and gzips a set of scripts !! at every startup...
//       to provide single /client/api script to browser.
//       Better if this was cached to disk (when in production mode)

// BUG: more than one meshnode in same process and packager does not apply
// post-start changes to script package into all mesh nodes.

// A preliminary work toward asset packaging (minify, gzip, etag, etc.)
// The ideal would be a per component widget assembly line.
// Allows for serving individual scripts development.
// This one packages only the core /client/api script from ./api.js and it's dependancies
// Make it not do all this on every startup.

module.exports = Packager;

var fs = require('fs')
  , zlib = require('zlib')
  , md5 = require('md5')
  , Promise = require('bluebird')
  , minifyJS = require('uglify-js').minify
  , normalize = require('path').normalize
  , dirname = require('path').dirname
  , sep = require('path').sep
  , happnProtocol
  ;

var watchedFiles = {}; // Properly support only one packager per process!

function Packager(mesh) {

  this.log = mesh.log.createLogger('Packager');
  mesh.tools.packages = this.packages = {};

  var script1 = dirname(dirname(require.resolve('bluebird'))) +  sep + 'browser' + sep + 'bluebird.js';
  var script2 = normalize(mesh._mesh.datalayer.server.services.pubsub.script);
  var script3 = dirname(require.resolve('happn')) + sep + 'client' + sep + 'base.js';

  happnProtocol = require(require.resolve('happn').replace(sep + 'lib' + sep + 'index.js', '') + sep + 'package.json').protocol;

  var script4 = normalize(__dirname + sep + 'shared' + sep + 'logger.js');
  var script5 = normalize(__dirname + sep + 'shared' + sep + 'promisify.js');
  var script6 = normalize(__dirname + sep + 'shared' + sep + 'mesh-error.js');
  var script7 = normalize(__dirname + sep + 'shared' + sep + 'messenger.js');
  var script8 = normalize(__dirname + sep + 'shared' + sep + 'internals.js');
  var script9 = normalize(__dirname + sep + 'shared' + sep + 'mesh-client.js');

  this.scripts = [
    {watch: false, min: false, file: script1},
    {watch: false, min: false, file: script2},
    {watch: true, min: false, file: script3},
    {watch: true, min: false, file: script4},
    {watch: true, min: false, file: script5},
    {watch: true, min: false, file: script6},
    {watch: true, min: false, file: script7},
    {watch: true, min: false, file: script8},
    {watch: true, min: false, file: script9}
    //
    // When not running NODE_ENV=production the package is re-assembled
    // when this file changes.
  ]

  this.merged = {}; // final product, merges scripts
}

Packager.prototype.initialize = function (callback) {

  this.log.$$DEBUG('Building /api/client package');

  var readFilePromise = Promise.promisify(fs.readFile);
  var lstatPromise = Promise.promisify(fs.lstat);
  var _this = this;

  return Promise.all(
    _this.scripts.map(function (script) {

      return new Promise(function (resolve, reject) {

        // handle each script object

        if (process.env.NODE_ENV == 'production' && !script.min) {

          var gotMinFile = script.file.replace(/\.js$/, '.min.js');

          // Production
          return lstatPromise(gotMinFile)
            .then(function () {
              script.file = gotMinFile;
              script.min = true;
              resolve(script);
            })
            .catch(function () {
              script.min = false;
              resolve(script);
            });
        }

        // Not production
        return resolve(script);
      });
    })
    )
    // Read the files
    .then(function (scripts) {
      return Promise.all(
        scripts.map(function (script) {
          _this.log.$$DEBUG('reading script %s', script.file);
          return readFilePromise(script.file);
        })
      );
    })

    // Load the buffer data onto the scripts array
    .then(function (buffers) {
      buffers.forEach(function (buf, i) {
        _this.scripts[i].buf = buf;
      });
    })

    // TODO: Watch where necessary...
    //   In non production mode, it would
    //   be ideal if changes to the component scripts
    //   were detected, averting the need to restart the
    //   server to get the updated script to the browser.

    // Minifi if production
    .then(function () {
      _this.scripts.forEach(function (script) {

        if (process.env.NODE_ENV == 'production' && !script.min) {
          _this.log.$$DEBUG('minify script %s', script.file);
          script.buf = minifyJS(script.buf.toString(), {fromString: true}).code;
        }
      });
    })

    // Set watchers
    .then(function () {
      _this.scripts.forEach(function (script) {
        if (!script.watch) return;
        if (process.env.NODE_ENV == 'production') return;
        _this.log.$$DEBUG('(non-production) watching %s', script.file);


        if (watchedFiles[script.file]) {
          return
        }
        ;
        watchedFiles[script.file] = 1;  // prevent too many listeners on file
        // for systems that run many mesh nodes
        // in one process


        fs.watchFile(script.file, {interval: 100}, function (curr, prev) {
          if (!(prev.mtime < curr.mtime)) {
            return;
          }

          _this.log.warn('changed %s', script.file);

          readFilePromise(script.file)
            .then(function (buf) {
              script.buf = buf;
              return _this.assemble()
            })
            .then(function () {
              _this.log.warn('reload done');
            })
            .catch(function (e) {
              _this.log.error('reload failed', e);
            });
        });
      });
    })

    // Assemble the package.
    .then(function () {
      return _this.assemble();
    })

    .then(function () {
      callback(null);
    })

    .catch(callback)
};

Packager.prototype.assemble = function () {

  var _this = this;
  var gzip = Promise.promisify(zlib.gzip);

  return new Promise(function (resolve, reject) {

    _this.merged.script = '';

    _this.scripts.forEach(function (script) {

      var scriptStr = script.buf.toString();

      if (script.file.indexOf('client' + sep + 'base.js') > -1) scriptStr = scriptStr.replace('{{protocol}}', happnProtocol);
      _this.merged.script += scriptStr + '\n';
    });

    _this.merged.md5 = md5(_this.merged.script);

    _this.log.$$DEBUG('gzip package');

    gzip(_this.merged.script)

      .then(function (zipped) {
        _this.merged.data = zipped;
        _this.merged.gzip = true;
        resolve();
      })

      .catch(function () {
        _this.merged.data = _this.merged.script
        _this.merged.gzip = false;
        resolve();
      })
  })

    .then(function () {

      return new Promise(function (resolve, reject) {
        Object.defineProperty(_this.packages, 'api', {
          get: function () {
            return _this.merged;
          },
          enumerable: true,
          configurable: true,
        });
        _this.log.$$DEBUG('done');
        resolve();
      });
    });
}
