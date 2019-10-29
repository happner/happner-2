// var utilities = require('./utilities');
let deepCopy = require('deep-copy');

module.exports = Config;

function Config() {}

// we deep copy the configuration, then process various shortform leaves
// the deep copy ensures that configs passed in do not come out with new properties

Config.prototype.process = function(mesh, config, callback) {
  var serializer;

  this.log = mesh.log.createLogger('Config');
  this.log.$$TRACE('process()');

  var clonedConfig = deepCopy(config);

  // process shortform endpoints
  Object.keys(clonedConfig.endpoints || {}).forEach(function(name) {
    var econf = clonedConfig.endpoints[name];
    if (!isNaN(parseInt(econf))) {
      clonedConfig.endpoints[name] = {
        clonedConfig: {
          port: parseInt(econf)
        }
      };
    } else if (typeof econf === 'string') {
      var pp = econf.split(':');
      clonedConfig.endpoints[name] = {
        clonedConfig: {
          host: pp[0].trim(),
          port: parseInt(pp[1].trim())
        }
      };
    }
  });

  clonedConfig.endpoints = clonedConfig.endpoints || {};

  if (clonedConfig.exchange && (serializer = clonedConfig.exchange.serializer)) {
    if (typeof serializer === 'string') {
      try {
        mesh._mesh.serializer = this.validateSerializer(require(serializer));
      } catch (e) {
        this.log.warn('serializer load failed', e);
      }
    } else {
      mesh._mesh.serializer = this.validateSerializer(serializer);
    }
  }

  callback(null, clonedConfig);
};

Config.prototype.validateSerializer = function(it) {
  if (typeof it.__encode !== 'function' || typeof it.__decode !== 'function') {
    this.log.warn('invalid serializer ignored');
    return;
  }
  return it;
};
