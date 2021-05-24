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

var fs = require('fs'),
  zlib = require('zlib'),
  md5 = require('md5'),
  minify = require('uglify-es').minify,
  normalize = require('path').normalize,
  dirname = require('path').dirname,
  sep = require('path').sep,
  Happn = require('happn-3'),
  homedir = require('homedir'),
  fsExtra = require('fs-extra'),
  version = require('../../package.json').version,
  cachedDirname = homedir() + sep + '.happner',
  cachedFilename = cachedDirname + sep + 'api-client-' + version + '.min.js.gz',
  util = require('util'),
  semver = require('happner-semver');

function Packager(mesh) {
  try {
    this.log = mesh.log.createLogger('Packager');
    const happnerClientPath = dirname(require.resolve('happner-client'));
    mesh.tools.packages = this.packages = {};

    if (process.env.NODE_ENV === 'production') {
      this.ensureCacheDirectory();
      if (this.loadCachedScript()) {
        return;
      }
    }
    var script1 = normalize(mesh._mesh.happn.server.services.session.script);
    var script2 = Happn.packager.browserClient();

    var script3 = normalize([__dirname, 'shared', 'logger.js'].join(sep));
    var script4 = normalize([__dirname, 'shared', 'promisify.js'].join(sep));
    var script5 = normalize([__dirname, 'shared', 'mesh-error.js'].join(sep));
    var script6 = normalize([__dirname, 'shared', 'messenger.js'].join(sep));
    var script7 = normalize([__dirname, 'shared', 'internals.js'].join(sep));
    var script8 = normalize([__dirname, 'shared', 'mesh-client.js'].join(sep));

    var script9 = require.resolve('happner-semver');

    var script10 = [happnerClientPath, 'lib', 'builders', 'request-builder.js'].join(sep);
    var script11 = [happnerClientPath, 'lib', 'providers', 'connection-provider.js'].join(sep);
    var script12 = [happnerClientPath, 'lib', 'providers', 'implementors-provider.js'].join(sep);
    var script13 = [happnerClientPath, 'lib', 'providers', 'operations-provider.js'].join(sep);
    var script14 = [happnerClientPath, 'lib', 'happner-client.js'].join(sep);

    this.scripts = [
      { watch: false, min: false, file: script1 },
      { watch: false, min: false, file: script2 },
      { watch: false, min: false, file: script3 },
      { watch: true, min: false, file: script4 },
      { watch: true, min: false, file: script5 },
      { watch: true, min: false, file: script6 },
      { watch: true, min: false, file: script7 },
      { watch: true, min: false, file: script8 },
      { watch: true, min: false, file: script9 },
      { watch: true, min: false, file: script10 },
      { watch: true, min: false, file: script11 },
      { watch: true, min: false, file: script12 },
      { watch: true, min: false, file: script13 },
      { watch: true, min: false, file: script14 }
      // With watch = true When not running NODE_ENV=production the package is re-assembled
      // when the file changes.
    ];

    //backwards compatible with older versions of happner-client
    let happnerClientVersion = require(happnerClientPath + sep + 'package.json').version;
    if (semver.coercedSatisfies(happnerClientVersion, '>=11.3.0')) {
      this.scripts.push({
        watch: true,
        min: false,
        file: [happnerClientPath, 'lib', 'providers', 'light-implementors-provider.js'].join(sep)
      });
      this.scripts.push({
        watch: true,
        min: false,
        file: [happnerClientPath, 'lib', 'light-client.js'].join(sep)
      });
    } else
      this.log.warn(
        `light client functionality not available with installed client version ${happnerClientVersion}, must be >= 11.3.0`
      );

    this.merged = {}; // final product, merges scripts
    this.__fileWatchers = [];
    this.__watchedFiles = {};
  } catch (e) {
    throw e; // caught in mesh.js
  }
}

Packager.prototype.ensureCacheDirectory = function() {
  fsExtra.ensureDirSync(cachedDirname);
};

Packager.prototype.loadCachedScript = function() {
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
    get: function() {
      return _this.merged;
    },
    enumerable: true,
    configurable: true
  });

  return true;
};

Packager.prototype.saveCachedScript = function(merged) {
  fs.writeFileSync(cachedFilename, merged.data);
};

Packager.prototype.initialize = function(callback) {
  if (!this.scripts) {
    return callback();
  }

  this.log.$$DEBUG('Building /api/client package');

  var readFilePromise = util.promisify(fs.readFile);
  var lstatPromise = util.promisify(fs.lstat);
  var _this = this;

  return (
    Promise.all(
      _this.scripts.map(function(script) {
        return new Promise(function(resolve) {
          // handle each script object

          if (process.env.NODE_ENV === 'production' && !script.min) {
            var gotMinFile = script.file.replace(/\.js$/, '.min.js');

            // Production
            return lstatPromise(gotMinFile)
              .then(function() {
                script.file = gotMinFile;
                script.min = true;
                resolve(script);
              })
              .catch(function() {
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
      .then(function(scripts) {
        return Promise.all(
          scripts.map(function(script) {
            _this.log.$$DEBUG('reading script %s', script.file);
            return readFilePromise(script.file);
          })
        );
      })

      // Load the buffer data onto the scripts array
      .then(function(buffers) {
        buffers.forEach(function(buf, i) {
          _this.scripts[i].buf = buf;
        });
      })

      // TODO: Watch where necessary...
      //   In non production mode, it would
      //   be ideal if changes to the component scripts
      //   were detected, averting the need to restart the
      //   server to get the updated script to the browser.

      // Minifi if production
      .then(function() {
        _this.scripts.forEach(function(script) {
          if (process.env.NODE_ENV === 'production' && !script.min) {
            _this.log.$$DEBUG('minify script %s', script.file);
            script.buf = minify(script.buf.toString()).code;
          }
        });
      })

      // Set watchers
      .then(function() {
        _this.scripts.forEach(function(script) {
          if (!script.watch) return;
          if (process.env.NODE_ENV === 'production') return;
          _this.log.$$DEBUG('(non-production) watching %s', script.file);

          if (_this.__watchedFiles[script.file]) {
            return;
          }

          _this.__watchedFiles[script.file] = 1; // prevent too many listeners on file
          // for systems that run many mesh nodes
          // in one process
          _this.__fileWatchers.push(
            fs.watch(script.file, { interval: 1000 }, function(curr, prev) {
              if (prev.mtime > curr.mtime) return;
              _this.log.warn('changed %s', script.file);

              readFilePromise(script.file)
                .then(function(buf) {
                  script.buf = buf;
                  return _this.assemble();
                })
                .then(function() {
                  _this.log.warn('reload done');
                })
                .catch(function(e) {
                  _this.log.error('reload failed', e);
                });
            })
          );
        });
      })

      // Assemble the package.
      .then(function() {
        return _this.assemble();
      })

      .then(function() {
        callback(null);
      })

      .catch(callback)
  );
};

Packager.prototype.stop = function() {
  if (!this.__fileWatchers) return;

  this.__fileWatchers.forEach(function(watcher) {
    watcher.close();
  });

  this.__fileWatchers = [];
  this.__watchedFiles = {};
};

Packager.prototype.assemble = function() {
  var _this = this;
  var gzip = util.promisify(zlib.gzip);

  return new Promise(function(resolve) {
    _this.merged.script = '';

    _this.scripts.forEach(function(script) {
      _this.merged.script += script.buf.toString() + '\n';
    });

    _this.merged.md5 = md5(_this.merged.script);

    _this.log.$$DEBUG('gzip package');

    gzip(_this.merged.script)
      .then(function(zipped) {
        _this.merged.data = zipped;
        _this.merged.gzip = true;
        resolve();
      })

      .then(function() {
        if (process.env.NODE_ENV === 'production') {
          _this.saveCachedScript(_this.merged);
        }
      })

      .catch(function() {
        _this.merged.data = _this.merged.script;
        _this.merged.gzip = false;
        resolve();
      });
  }).then(function() {
    return new Promise(function(resolve) {
      Object.defineProperty(_this.packages, 'api', {
        get: function() {
          return _this.merged;
        },
        enumerable: true,
        configurable: true
      });
      _this.log.$$DEBUG('done');
      resolve();
    });
  });
};
