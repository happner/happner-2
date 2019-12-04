const Mesh = require('../..');
const path = require('path');

async function start() {
  return await Mesh.create({
    dataLayer: {
      setOptions: {
        timeout: 1000
      }
    },
    util: {
      //logLevel: 'trace'
    },
    modules: {
      component: {
        path: path.resolve(__dirname, './components/component1')
      }
    },
    components: {
      component: {
        startMethod: 'start',
        stopMethod: 'stop',
        initMethod: 'init'
      }
    }
  });
}

start();
