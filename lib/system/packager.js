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
  , Happn = require('happn-3')
  , homedir = require('homedir')
  , fsExtra = require('fs-extra')
  , version = require('../../package.json').version
  , cachedDirname = homedir() + sep + '.happner'
  , cachedFilename = cachedDirname + sep + 'api-client-' + version + '.min.js.gz'
  ;

var watchedFiles = {}; // Properly support only one packager per process!

function Packager(mesh) {

  try{

    this.log = mesh.log.createLogger('Packager');
    mesh.tools.packages = this.packages = {};

    if (process.env.NODE_ENV == 'production') {
      this.ensureCacheDirectory();
      if (this.loadCachedScript()) {
        return;
      }
    }

    var script1 = dirname(dirname(require.resolve('bluebird'))) +  sep + 'browser' + sep + 'bluebird.js';
    var script2 = normalize(mesh._mesh.happn.server.services.session.script);
    var script3 = Happn.packager.browserClient();

    var script4 = normalize(__dirname + sep + 'shared' + sep + 'logger.js');
    var script5 = normalize(__dirname + sep + 'shared' + sep + 'promisify.js');
    var script6 = normalize(__dirname + sep + 'shared' + sep + 'mesh-error.js');
    var script7 = normalize(__dirname + sep + 'shared' + sep + 'messenger.js');
    var script8 = normalize(__dirname + sep + 'shared' + sep + 'internals.js');
    var script9 = normalize(__dirname + sep + 'shared' + sep + 'mesh-client.js');

    var script10 = dirname(require.resolve('happner-client')) + sep + 'lib' + sep + 'semver.js';
    var script11 = dirname(require.resolve('happner-client')) + sep + 'lib' + sep + 'builders' + sep + 'request-builder.js';
    var script12 = dirname(require.resolve('happner-client')) + sep + 'lib' + sep + 'providers' + sep + 'connection-provider.js';
    var script13 = dirname(require.resolve('happner-client')) + sep + 'lib' + sep + 'providers' + sep + 'implementors-provider.js';
    var script14 = dirname(require.resolve('happner-client')) + sep + 'lib' + sep + 'providers' + sep + 'operations-provider.js';
    var script15 = dirname(require.resolve('happner-client')) + sep + 'lib' + sep + 'happner-client.js';

    this.scripts = [
      {watch: false, min: false, file: script1},
      {watch: false, min: false, file: script2},
      {watch: true, min: false, file: script3},
      {watch: true, min: false, file: script4},
      {watch: true, min: false, file: script5},
      {watch: true, min: false, file: script6},
      {watch: true, min: false, file: script7},
      {watch: true, min: false, file: script8},
      {watch: true, min: false, file: script9},
      {watch: true, min: false, file: script10},
      {watch: true, min: false, file: script11},
      {watch: true, min: false, file: script12},
      {watch: true, min: false, file: script13},
      {watch: true, min: false, file: script14},
      {watch: true, min: false, file: script15}
      // With watch = true When not running NODE_ENV=production the package is re-assembled
      // when the file changes.
    ];

    this.merged = {}; // final product, merges scripts

  } catch (e) {
    throw e; // caught in mesh.js
  }
}

Packager.prototype.ensureCacheDirectory = function () {
  fsExtra.ensureDirSync(cachedDirname);
};

Packager.prototype.loadCachedScript = function () {
  try {
    fs.lstatSync(cachedFilename);
  } catch (e) {
    return false;
  }

  this.merged = {
    gzip: true
  };

  try {
    this.merged.data = fs.readFileSync(cachedFilename);
  } catch (e) {
    return false;
  }

  this.merged.md5 = md5(this.merged.data);

  var _this = this;
  Object.defineProperty(this.packages, 'api', {
    get: function () {
      return _this.merged;
    },
    enumerable: true,
    configurable: true
  });

  return true;
};

Packager.prototype.saveCachedScript = function (merged) {
  fs.writeFileSync(cachedFilename, merged.data);
};

Packager.prototype.initialize = function (callback) {

  if (!this.scripts) {
    return callback();
  }

  this.log.$$DEBUG('Building /api/client package');

  var readFilePromise = Promise.promisify(fs.readFile);
  var lstatPromise = Promise.promisify(fs.lstat);
  var _this = this;

  return Promise.delay(1000)
  // happn write script Happn.packager.browserClient()
  // not ready on slow filesystems (eg. travis)

    .then(function () {
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
    })

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


        fs.watchFile(script.file, {interval: 1000}, function (curr, prev) {
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

      .then(function () {
        if (process.env.NODE_ENV == 'production') {
          _this.saveCachedScript(_this.merged);
        }
      })

      .catch(function () {
        _this.merged.data = _this.merged.script;
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
