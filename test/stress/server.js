const Happner = require('../../lib/mesh');
function instanceConfig() {
  var config = {};
  config.authorityDelegationOn = true;
  config.secure = true;
  config.modules = {
    localComponent: {
      instance: {
        testMethod: function(param, callback) {
          callback(`echo: ${param}`);
        },
        testFireEvent: function(param, $happn, callback) {
          $happn.emit(`emit: ${param}`);
          callback(`emitted: ${param}`);
        }
      }
    }
  };
  config.components = {
    localComponent: {}
  };

  config.happn = {
    services: {
      session: {
        config: {
          unconfiguredSessionCleanup: {
            interval: 5000, //check every N milliseconds
            threshold: 10e3, //sessions are cleaned up if they remain unconfigured for 10 seconds
            verbose: true //cleanups are logged
          }
        }
      }
    }
  };

  return config;
}

Happner.create(instanceConfig(), (e, serverInstance) => {
  if (e) {
    consoile.log('start server broke:::', e);
    process.exit(1);
  }
});
