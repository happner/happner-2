describe(require('../../__fixtures/utils/test_helper').create().testName(__filename, 3), function () {

  this.timeout(120000);

  var expect = require('expect.js')

  var config = {
    name: "testMesh",
    modules: {
      "happnClient": {
        path: "happn-3.client",
        create: {
          type: "async",
          name: "create",//if blank or null we just do new require
          parameters: [
            {"name": "config", "required": true, "value": {config: {"host": "localhost", "secret": "mesh"}}},
            {"name": "callback", "parameterType": "callback"},
          ],
          callback: {
            parameters: [
              {"name": "error", "parameterType": "error"},
              {"name": "client", "parameterType": "instance"}
            ]
          }
        }
      }
    },
    components: {
      "happnClient": {
        moduleName: "happnClient",
        // scope:"module", //"either component or module, module by default"
        schema: {
          "exclusive": true,//means we dont dynamically share anything else
          "methods": {
            "get": {
              "alias": "GET",
              "parameters": [
                {"name": "path", "required": true},
                {"name": "options"},
                {"name": "callback", "type": "callback", "required": true}
              ],
              "callback": {
                "parameters": [
                  {"name": "error", "type": "error"},
                  {"name": "response"}
                ]
              }
            },
            "set": {
              "alias": "PUT",
              "parameters": [
                {"name": "path", "required": true},
                {"name": "data", "required": true},
                {"name": "options"},
                {"name": "callback", "type": "callback", "required": true}

              ],
              "callback": {
                "parameters": [
                  {"name": "error", "type": "error"},
                  {"name": "response"}
                ]
              }
            },
            "remove": {
              "alias": "DELETE",
              "parameters": [
                {"name": "path", "required": true},
                {"name": "options"},
                {"name": "callback", "type": "callback", "required": true}
              ],
              "callback": {
                "parameters": [
                  {"name": "error", "type": "error"},
                  {"name": "response"}
                ]
              }
            }
          }
        }
      }
    },
  };

  var mockMesh = function(){

    var mockMesh = {
      config:{
        name:'mock-mesh'
      },
      name:'mock-mesh',
      actions:[],
      action:function(key, args){
        this.actions.push({key:key, args:args});
      },
      log:{
        parent:this,
        error:function(){
          mockMesh.action('log-error', arguments);
        },
        info:function(){
          mockMesh.action('log-info', arguments);
        },
        warn:function(){
          mockMesh.action('log-warn', arguments);
        },
        $$DEBUG:function(){
          mockMesh.action('log-debug', arguments);
        },
        $$TRACE:function(){
          mockMesh.action('log-trace', arguments);
        }
      },
      emit:function(){
        this.action('emit', arguments);
      },
      _mesh:{
        config:{
          name:'mock-mesh'
        },
        endpoints:{},
        happn:{
          server:{
            services:{
              security:{
                _keyPair:{}
              }
            }
          }
        }
      }
    }

    return mockMesh;
  };

  var mockInternals = function(error){
    return {
      actions:[],
      action:function(key, args){
        this.actions.push({key:key, args:args});
      },
      _updateEndpoint:function(mesh, endpointName, exchangeAPI, eventAPI, callback){

        if (error) return callback(new Error(error));

        this.action('_updateEndpoint', arguments);
        callback();
      }
    }
  };

  var mockExchangeAPI = function(){
    return {};
  };

  var mockEventAPI = function(){
    return {};
  };

  var mockHappn = function(createError, descriptionError, descriptionErrorName, descriptionInitializing, onDescriptionError, disconnectError){

    var haveDescription1 = false;

    var happn = {
      client:{
        create:function(config, callback){

          var client = {
            onEvent:function(){

            },
            get:function(url, opts, callback){

              if (typeof opts === 'function'){
                callback = opts;
                opts = {};
              }

              if (url == '/mesh/schema/description'){

                if (descriptionError) return callback(new Error('getting description broke'));

                if (descriptionErrorName) return callback(null, {name:'crapBag'});

                if (descriptionInitializing == null) descriptionInitializing = false;

                return callback(null, {
                  name:config.name,
                  initializing:descriptionInitializing
                });
              }
              callback(null, null);
            },
            on:function(path, handler, callback){

              if (onDescriptionError) return callback(new Error(onDescriptionError));

              callback();

            },
            disconnect:function(callback){
              if (disconnectError){
                console.log('disconnection error happened:::' + disconnectError);
                return callback(new Error(disconnectError));
              }
              callback();
            }
          };
          callback(null, client);
        }
      }
    };

    if (createError){
      happn.client.create = function(config, callback){
        callback(new Error(createError));
      }
    }

    return happn;
  };

  it('requires and initializes the endpoint service, config with no endpoints', function (done) {

    var EndpointService = require('../../../lib/services/endpoint');

    //mesh, internals, exchangeAPI, eventAPI, happn

    var endpointService = new EndpointService(mockMesh(), mockInternals(), mockExchangeAPI(), mockEventAPI(), mockHappn());

    endpointService.initialize({}, function(e){

      if (e) return done(e);

      done();

    });

  });

  it('requires, initializes and stops the endpoint service with 2 endpoints', function (done) {

    var EndpointService = require('../../../lib/services/endpoint');

    var endpointService = new EndpointService(mockMesh(), mockInternals(), mockExchangeAPI(), mockEventAPI(), mockHappn());

    endpointService.initialize({

      endpoints: {

        'remoteMesh1': {  // remote mesh node
          config: {
            host:'localhost',
            port: 3001,
            username: '_ADMIN',
            password: 'guessme'
          }
        },

        'remoteMesh2': {  // remote mesh node
          config: {
            host:'localhost',
            port: 3002,
            username: '_ADMIN',
            password: 'guessme'
          }
        }
      }
    }, function(e){

      if (e) return done(e);

      endpointService.stop(done);
    });
  });

  it('requires, initializes the endpoint service with 2 endpoints, fails creating client', function (done) {

    var EndpointService = require('../../../lib/services/endpoint');

    //createError, descriptionError, descriptionErrorName, descriptionInitializing, onDescriptionError, disconnectError
    var endpointService = new EndpointService(mockMesh(), mockInternals(), mockExchangeAPI(), mockEventAPI(), mockHappn('failed creating happn'));

    endpointService.initialize({

      endpoints: {

        'remoteMesh1': {  // remote mesh node
          config: {
            host:'localhost',
            port: 3001,
            username: '_ADMIN',
            password: 'guessme'
          }
        },

        'remoteMesh2': {  // remote mesh node
          config: {
            host:'localhost',
            port: 3002,
            username: '_ADMIN',
            password: 'guessme'
          }
        }
      }
    }, function(e){
      expect(e.toString()).to.be('Error: failed creating happn');
      done();
    });
  });

  it('requires, initializes the endpoint service with 2 endpoints, fails getting description', function (done) {

    var EndpointService = require('../../../lib/services/endpoint');

    //createError, descriptionError, descriptionErrorName, descriptionInitializing, onDescriptionError, disconnectError
    var endpointService = new EndpointService(mockMesh(), mockInternals(), mockExchangeAPI(), mockEventAPI(), mockHappn(null, 'description get error'));

    endpointService.initialize({

      endpoints: {

        'remoteMesh1': {  // remote mesh node
          config: {
            host:'localhost',
            port: 3001,
            username: '_ADMIN',
            password: 'guessme'
          },
          connectionAttemptsInterval:100,
          connectionErrorAttemptsLimit:10
        },

        'remoteMesh2': {  // remote mesh node
          config: {
            host:'localhost',
            port: 3002,
            username: '_ADMIN',
            password: 'guessme'
          },
          connectionAttemptsInterval:100,
          connectionErrorAttemptsLimit:10
        }
      }
    }, function(e){
      expect(e.toString()).to.be('Error: connection error attempt limit of 10 reached');
      done();
    });
  });

  it('requires, initializes the endpoint service with 2 endpoints, description initializing', function (done) {

    var EndpointService = require('../../../lib/services/endpoint');

    //createError, descriptionError, descriptionErrorName, descriptionInitializing, onDescriptionError, disconnectError
    var endpointService = new EndpointService(mockMesh(), mockInternals(), mockExchangeAPI(), mockEventAPI(), mockHappn(null, null, null, true));

    endpointService.initialize({

      endpoints: {

        'remoteMesh1': {  // remote mesh node
          config: {
            host:'localhost',
            port: 3001,
            username: '_ADMIN',
            password: 'guessme'
          },
          connectionAttemptsInterval:500,
          connectionAttemptsLimit:1
        },

        'remoteMesh2': {  // remote mesh node
          config: {
            host:'localhost',
            port: 3002,
            username: '_ADMIN',
            password: 'guessme'
          },
          connectionAttemptsInterval:500,
          connectionAttemptsLimit:1
        }
      }
    }, function(e){

      expect(e.toString()).to.be('Error: connection attempt limit of 1 reached');
      done();
    });
  });

  it('requires, initializes the endpoint service with 2 endpoints, mismatching description/endpoint names', function (done) {

    var EndpointService = require('../../../lib/services/endpoint');

    //createError, descriptionError, descriptionErrorName, descriptionInitializing, onDescriptionError, disconnectError
    var endpointService = new EndpointService(mockMesh(), mockInternals(), mockExchangeAPI(), mockEventAPI(), mockHappn(null, null, true));

    endpointService.initialize({

      endpoints: {

        'remoteMesh1': {  // remote mesh node
          config: {
            host:'localhost',
            port: 3001,
            username: '_ADMIN',
            password: 'guessme'
          },
          connectionAttemptsInterval:500
        },

        'remoteMesh2': {  // remote mesh node
          config: {
            host:'localhost',
            port: 3002,
            username: '_ADMIN',
            password: 'guessme'
          },
          connectionAttemptsInterval:500
        }
      }
    }, function(e){
      expect(e.toString()).to.be('Error: endpoint remoteMesh1 returned description for crapBag');
      done();
    });
  });

  it('requires, initializes and stops the endpoint service with a disconnection error', function (done) {

    var EndpointService = require('../../../lib/services/endpoint');

    //createError, descriptionError, descriptionErrorName, descriptionInitializing, onDescriptionError, disconnectError
    var endpointService = new EndpointService(mockMesh(), mockInternals(), mockExchangeAPI(), mockEventAPI(), mockHappn(null,null,null,null,null,'test error'));

    endpointService.initialize({

      endpoints: {

        'remoteMesh1': {  // remote mesh node
          config: {
            host:'localhost',
            port: 3001,
            username: '_ADMIN',
            password: 'guessme'
          }
        },

        'remoteMesh2': {  // remote mesh node
          config: {
            host:'localhost',
            port: 3002,
            username: '_ADMIN',
            password: 'guessme'
          }
        }
      }
    }, function(e){

      if (e) return done(e);

      endpointService.stop(done);
    });
  });
});
