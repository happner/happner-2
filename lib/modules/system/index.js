var os = require('os');
var procStats = require('proc-stats');
var fs = require('fs-extra');
var diskspace = require('diskspace');
var Logger = require('happn-logger');

module.exports = function() {
  return new System();
};

function System() {
  var _this = this;

  _this.__systemUp = Date.now();

  _this.__lastMeasurement = null;

  _this.__handleHappnStats = function(happnStats) {
    _this.__getStats(_this.$happn, function(e, stats) {
      if (e) return _this.$happn.log.error('failure to produce stats', e);

      stats.happn = happnStats;

      _this.__lastMeasurement = stats;

      _this.$happn.emitLocal('stats/system', stats, function(e) {
        if (e) {
          if (e.toString() === 'Error: client is disconnected')
            return _this.$happn.log.trace('failure to emit stats, internal client not connected');
          //the above happens when the server is being stopped but we are still receiving stats events from happn
          //so not really a problem, but viewable if we are tracing
          _this.$happn.log.warn('failure to emit stats', e);
        }
        _this.$happn.log.trace('stats emitted ok');
      });
    });
  };

  _this.initialize = function($happn, callback) {
    _this.__lastTimestamp = Date.now();
    _this.$happn = $happn;
    // stats always on
    // interval inherited from happn-3 emitting stats
    $happn._mesh.happn.server.services.stats.on('system-stats', _this.__handleHappnStats);

    callback(null);
  };

  _this.compactDBFile = function($happn, callback) {
    return $happn._mesh.happn.server.services.data.compact(callback);
  };

  _this.activateStatistics = function($happn) {
    $happn.log.warn(
      'activateStatistics is deprecated. Statictics is always on. ' +
        'It inherits interval from happn-3 stats interval config at ' +
        'config.happn.services.stats.config.interval (ms)'
    );
  };

  _this.deactivateStatistics = function($happn) {
    $happn.log.warn('deactivateStatistics is deprecated.');
  };

  _this.getDBFileInfo = function($happn, callback) {
    // $happn.info.happn... (would be better)
    if (
      $happn._mesh.data.context.services.data.config &&
      $happn._mesh.data.context.services.data.config.dbfile
    )
      return fs.stat($happn._mesh.data.context.services.data.config.dbfile, function(e, filestats) {
        if (e) return callback(e);

        filestats.filename = $happn._mesh.data.context.services.data.config.dbfile;

        diskspace.check('/', function(e, total, free, status) {
          if (e) return callback(e);

          filestats.disk = {};
          filestats.disk.total = total;
          filestats.disk.status = status;
          filestats.disk.free = free;

          callback(null, filestats);
        });
      });

    callback();
  };

  _this.getStats = function($happn, callback) {
    var _this = this;

    if (_this.__lastMeasurement) return callback(null, _this.__lastMeasurement);

    // wait for first ever measurement
    var interval = setInterval(function() {
      if (_this.__lastMeasurement) {
        clearInterval(interval);
        callback(null, _this.__lastMeasurement);
      }
    }, 500);
  };

  _this.__getStats = function($happn, callback) {
    try {
      var _this = this;
      var now = Date.now();
      var seconds = (now - _this.__lastTimestamp) / 1000;
      var upTime = now - _this.__systemUp;
      var statistics = JSON.parse(JSON.stringify($happn.stats));

      _this.__lastTimestamp = now;

      statistics.measurementInterval = seconds;
      statistics.system = _this.systemInfo($happn);
      statistics.system.upTime = upTime;
      statistics.system.meshName = $happn.info.mesh.name;
      statistics.timestamp = now;

      statistics.totalCalls = 0;
      statistics.totalEmits = 0;
      statistics.totalErrors = 0;

      statistics.logs = Logger.cache;

      this.getDBFileInfo($happn, function(e, fileinfo) {
        if (e) return $happn.log.error('Failure to fetch db file stats: ', e);

        if (fileinfo) statistics.dbfile = fileinfo;

        procStats.stats(function(e, result) {
          if (e) return $happn.log.error('Failure to fetch cpu usage stats: ', e);

          for (var componentName in statistics.component) {
            var currentComponent = statistics.component[componentName];

            statistics.totalCalls += currentComponent.calls;
            statistics.totalEmits += currentComponent.emits;
            statistics.totalErrors += currentComponent.errors;

            if (_this.__lastMeasurement) {
              var lastComponent = _this.__lastMeasurement.component[componentName];

              statistics.component[componentName].callsPerSec =
                (currentComponent.calls - lastComponent.calls) / seconds;
              statistics.component[componentName].emitsPerSec =
                (currentComponent.emits - lastComponent.emits) / seconds;
              statistics.component[componentName].errorsPerSec =
                (currentComponent.errors - lastComponent.errors) / seconds;
            } else {
              statistics.component[componentName].callsPerSec = currentComponent.calls / seconds;
              statistics.component[componentName].emitsPerSec = currentComponent.emits / seconds;
              statistics.component[componentName].errorsPerSec = currentComponent.errors / seconds;
            }
          }

          if (_this.__lastMeasurement) {
            statistics.callsPerSec =
              (statistics.totalCalls - _this.__lastMeasurement.totalCalls) / seconds;
            statistics.emitsPerSec =
              (statistics.totalEmits - _this.__lastMeasurement.totalEmits) / seconds;
            statistics.errorsPerSec =
              (statistics.totalErrors - _this.__lastMeasurement.totalErrors) / seconds;
          } else {
            statistics.callsPerSec = statistics.totalCalls / seconds;
            statistics.emitsPerSec = statistics.totalEmits / seconds;
            statistics.errorsPerSec = statistics.totalErrors / seconds;
          }

          statistics.usage = result;

          callback(null, statistics);
        });
      });
    } catch (e) {
      callback(e);
    }
  };

  //_this.systemInfoCached;
  _this.systemInfo = function() {
    return {
      host: os.hostname(),
      type: os.type(),
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      totalmem: os.totalmem(),
      freemem: os.freemem(),
      cpus: os.cpus()
    };
  };
}
