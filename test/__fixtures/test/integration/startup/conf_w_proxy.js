console.log('Process:', process.execArgv);
var path = require('path');

module.exports = {
  "port": 55009,
  "happner-loader": {
    "proxy": "http://127.0.0.1:55019"
  },
  modules: {
    slowStartup: {
      path: path.join(__dirname, 'conf_w_proxy')
    },
    components: {
      slowStartup: {}
    }
  }
};
