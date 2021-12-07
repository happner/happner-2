var shortId = require('shortid'),
  util = require('util'),
  fs = require('fs'),
  path = require('path'),
  Logger = require('happn-logger');

// var depwarned0 = false;
var depwarned1 = false;
var depwarned2 = false;
var depwarned3 = false;

Object.defineProperty(module.exports, 'createContext', {
  get: function() {
    if (depwarned1) return Logger.createContext;
    //eslint-disable-next-line
    console.warn('use of global utilities.createContext is deprecated');
    depwarned1 = true;
    return Logger.createContext;
  }
});

Object.defineProperty(module.exports, 'createLogger', {
  get: function() {
    if (depwarned2) return Logger.createLogger;
    //eslint-disable-next-line
    console.warn('use of global utilities.createLogger is deprecated');
    depwarned2 = true;
    return Logger.createLogger;
  }
});

var log = Logger.createLogger();

Object.defineProperty(module.exports, 'log', {
  get: function() {
    if (depwarned3) return log;
    //eslint-disable-next-line
    console.warn('use of global utilities.log is deprecated');
    depwarned3 = true;
    return log;
  }
});

module.exports.getFunctionParameters = function(fn) {
  // eslint-disable-next-line no-useless-escape
  const FN_ARGS = /^(?:async +)?(?:function)?\s*[^\(=>]*\(\s*([^\)]*)\)|(?:async\s+)?\(?\s*([^\)]*).*=>.*/m;
  const FN_ARG_SPLIT = /,/;
  const FN_ARG = /^\s*(_?)(.+?)\1\s*$/;
  const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/gm;

  if (typeof fn === 'function') {
    const fnText = fn.toString().replace(STRIP_COMMENTS, '');
    const argDecl = fnText.match(FN_ARGS);
    const argMatch = argDecl[1] || argDecl[2];
    if (!argMatch) return [''];
    return argMatch
      .split(FN_ARG_SPLIT)
      .map(arg => arg.replace(FN_ARG, (all, underscore, name) => name));
  } else return null;
};

module.exports.node = util;

module.exports.generateID = function() {
  return shortId.generate();
};

module.exports.findInModules = function(filename, modulePaths, callback) {
  if (typeof modulePaths === 'function') {
    callback = modulePaths;
    modulePaths = module.paths;
  }

  var results = [];

  var readdir = util.promisify(fs.readdir);
  var lstat = util.promisify(fs.lstat);
  var readFile = util.promisify(fs.readFile);

  var recurse = function(paths, callback) {
    Promise.all(
      paths.map(function(modulePath) {
        return new Promise(function(resolve) {
          readdir(modulePath)
            .then(function(modulesDirs) {
              return Promise.all(
                modulesDirs.map(function(moduleName) {
                  if (moduleName === '.bin') return;

                  var targetFile = modulePath + path.sep + moduleName + path.sep + filename;
                  var packageFile = modulePath + path.sep + moduleName + path.sep + 'package.json';

                  return new Promise(function(resolve) {
                    var result = {};

                    lstat(targetFile)
                      .then(function() {
                        result.moduleName = moduleName;
                        result.filename = path.resolve(targetFile);
                        result.base = modulePaths.indexOf(modulePath) >= 0;
                        result.modulePath = modulePath;

                        results.push(result);

                        return readFile(packageFile);
                      })
                      .then(function(packageJson) {
                        var version = JSON.parse(packageJson).version;
                        result.version = version;
                        // Recurse into target's node_modules for more
                        recurse(
                          [modulePath + path.sep + moduleName + path.sep + 'node_modules'],
                          resolve
                        );
                      })
                      .catch(resolve); // ignore not got target
                  });
                })
              );
            })
            .then(resolve)
            .catch(resolve); // ignore readdir error - can't readdir,
          // so can't load modules from there...
        });
      })
    )

      .then(function() {
        callback();
      })

      .catch(callback);
  };

  recurse(modulePaths, function() {
    // Sort from longest to shortest
    // Shallowest will win in iteration overwrites

    results = results.sort(function(a, b) {
      if (a.filename.length < b.filename.length) return 1;
      if (a.filename.length > b.filename.length) return -1;
      return 0;
    });

    callback(null, results);
  });
};

module.exports.stringifyError = function(err) {
  var plainError = {};
  Object.getOwnPropertyNames(err).forEach(function(key) {
    plainError[key] = err[key];
  });
  return JSON.stringify(plainError);
};

module.exports.clone = function(obj) {
  return JSON.parse(JSON.stringify(obj));
};

module.exports.getRelativePath = function(url) {
  let check = new RegExp('^(?:[a-z]+:)?//', 'i');
  if (check.test(url)) {
    return new URL(url).pathname;
  }
  return url.split('?')[0];
};

module.exports.removeLeading = function(leading, str) {
  if (str == null) return str;
  if (leading == null) return str;
  if (leading === '') return str;

  var cloned = str.toString();
  if (cloned.indexOf(leading) === 0) cloned = cloned.substring(1, cloned.length);

  return cloned;
};

module.exports.removeLast = function(last, str) {
  if (str == null) return str;
  if (last == null) return str;
  if (last === '') return str;

  var cloned = str.toString();
  if (cloned[cloned.length - 1] === last) cloned = cloned.substring(0, cloned.length - 1);

  return cloned;
};

module.exports.isPromise = function(promise) {
  return promise && typeof promise.then === 'function' && typeof promise.catch === 'function';
};

module.exports.getPackageJson = function(fileName, defaultVersion) {
  var maxLevels = 5;
  var findPackageJson = function(fileName) {
    if (maxLevels-- === 0) {
      return {
        version: defaultVersion || '1.0.0'
      };
    }

    try {
      var packageJson = require(fileName + path.sep + 'package.json');
      return packageJson;
    } catch (e) {
      return findPackageJson(path.dirname(fileName));
    }
  };

  return findPackageJson(fileName);
};

module.exports.getNestedVal = function(obj, properties) {
  var foundValue;
  var currentObj = obj;

  properties.split('.').every(function(propertyName, propertyIndex, propertiesArray) {
    var value = currentObj[propertyName];

    if (propertyIndex === propertiesArray.length - 1) foundValue = value;
    else if (value == null) return false;
    else currentObj = value;

    return true;
  });

  return foundValue;
};

module.exports.functionIsNative = function(fn) {
  const fnString = fn.toString();
  //native function strings won't include newline
  if (fnString.indexOf('\n') > -1) return false;
  return fnString.indexOf('{ [native code] }') > -1;
};

const { Writable, Readable, Duplex, Transform } = require('stream');
const { EventEmitter } = require('events');
module.exports.inheritedNativeMethods = [
  ...new Set(
    [Object, EventEmitter, Writable, Readable, Duplex, Transform].reduce(
      (result, Class) => result.concat(getAllMethodNames(new Class())),
      []
    )
  )
];

function getAllMethodNames(toCheck, options) {
  if (toCheck == null) return [];
  var props = [];
  var obj = toCheck;
  do {
    props = props.concat(Object.getOwnPropertyNames(obj));
  } while ((obj = Object.getPrototypeOf(obj)));
  options = options || {};
  const methods = props
    .sort()
    .filter(function(e, i, arr) {
      try {
        return e !== arr[i + 1] && typeof toCheck[e] === 'function';
      } catch (e) {
        return false;
      }
    })
    .filter(fn => {
      if (!options.ignoreInheritedNativeMethods) return true;
      if (this.inheritedNativeMethods.indexOf(fn) === -1) return true;
      //remove system method names if they are not explicitly overriden by the instance or first level prototype
      //we also ignore constructors
      return (
        (Object.getPrototypeOf(toCheck).hasOwnProperty(fn) || toCheck.hasOwnProperty(fn)) &&
        fn !== 'constructor'
      );
    })
    .filter(fn => {
      if (!options.ignoreRegex) return true;
      return fn.match(options.ignoreRegex) == null;
    })
    .filter(fn => {
      if (!options.ignoreNative) return true;
      return !this.functionIsNative(toCheck[fn]);
    });
  return methods;
}

module.exports.getAllMethodNames = getAllMethodNames;
