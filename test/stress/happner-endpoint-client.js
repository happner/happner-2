/*
Simon: run up a happner-endpoint for testing, copied from FieldServer's happner-endpoint
this will eventually fall behind from the original module, but creates a dynamic endpoint to the server for stress testing
*/

const Happner = require('../../lib/mesh');
const path = require('path');

function instanceConfig() {
  var config = {};
  config.authorityDelegationOn = true;
  config.secure = true;
  config.port = 55001;
  config.modules = {
    endpoint: {
      path: path.resolve(__dirname, './happner-endpoint/index.js')
    }
  };
  config.components = {
    endpoint: {
      initMethod: 'init',
      shutdownMethod: 'shutdown',
      methods: {
        init: {
          type: 'async'
        },
        shutdown: {
          type: 'async'
        }
      }
    }
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
    console.log('start server broke:::', e);
    process.exit(1);
  }
  serverInstance.exchange.endpoint.connect(
    {
      host: '127.0.0.1',
      port: 55000,
      username: '_ADMIN',
      password: 'happn'
    },
    e => {
      if (e) {
        console.log('start connect broke:::', e);
        //process.exit(1);
      }
      console.log('STARTED AND CONNECTED:::');
    }
  );
});
