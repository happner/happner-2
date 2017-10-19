module.exports = {
  name: 'remoteMesh',
  happn: {
    secure: true,
    port: 51231,
    authTokenSecret: 'a256a2fd43bf441483c5177fc85fd9d3',
    adminPassword: 'testb2'
  },
  endpoints: {},
  modules: {
    "remoteComponent": {
      path: __dirname + "/secure-mesh-to-mesh-single-process-component",
      constructor: {
        type: "sync",
        parameters: []
      }
    }
  },
  components: {
    "remoteComponent": {
      moduleName: "remoteComponent",
      schema: {
        "exclusive": false,
        "methods": {
          "remoteFunction": {
            parameters: [
              {name: 'one', required: true},
              {name: 'two', required: true},
              {name: 'three', required: true},
              {name: 'callback', type: 'callback', required: true}
            ]
          }
          ,
          "causeError": {
            parameters: [
              {name: 'callback', type: 'callback', required: true}
            ]
          }
        }
      }
    }
  }
};
