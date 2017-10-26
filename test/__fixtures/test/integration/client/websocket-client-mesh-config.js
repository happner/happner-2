module.exports = {
  name: 'websocket_client',
  version: '1.0.0',
  happn: {
    port: 3111,
    secure: true,
    adminPassword: 'password'
  },
  endpoints: {},
  modules: {
    component: {
      path: __dirname + '/websocket-client-testMeshComponent',
      create: {
        type: "sync",
        parameters: []
      }
    }
  },
  components: {
    data: {},
    'component': {
      moduleName: "component",
      schema: {
        "exclusive": false
      }
    }
  }
};
