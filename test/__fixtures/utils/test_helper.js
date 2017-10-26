var Promise = require('bluebird')
  , async = require('async')
  , Happner = require('../../..')
  , sillyname = require('happn-sillyname')
  , shortid = require('shortid')
  , path = require('path')
  , fs = require('fs-extra')
  , expect = require('expect.js')
  , Mesh = require('../../..')
  ;

function TestHelper() {

  this.__activeServices = {};

  this.__testFiles = [];

  this.__happnerClients = {};

  this.__happnerInstances = {};
}

TestHelper.create = function(){

  return new TestHelper();
};

TestHelper.prototype.testName = function(testFilename, depth){

  if (!depth) depth = 2;

  var fileParts = testFilename.split(path.sep).reverse();

  var poParts = [];

  for (var i = 0; i < depth; i++)
    poParts.push(fileParts.shift());

  return poParts.reverse().join('/').replace('.js', '');
};

TestHelper.prototype.__addHappnerClient = function (ctx, client) {

  if (!this.__happnerClients[ctx])
    this.__happnerClients[ctx] = [];

  this.__happnerClients[ctx].push(client);
};

TestHelper.prototype.__addHappnerInstance = function (ctx, instance, config) {

  if (!this.__happnerInstances[ctx])
    this.__happnerInstances[ctx] = [];

  this.__happnerInstances[ctx].push({instance: instance, config: config});
};

TestHelper.prototype.startHappnerInstance = function(ctx, config, callback){

  var _this = this;

  if (!ctx) ctx = 'default';

  if (typeof config == 'function') {
    callback = config;
    config = null;
  }

  Mesh.create(config, function (e, instance) {

    if (e) return callback(e);

    _this.__addHappnerInstance(ctx, instance, config);

    var client = new Mesh.MeshClient({port: config.happn.port ? config.happn.port : 55000});

    var loginParams = {

      username: '_ADMIN',
      password: config.happn.adminPassword ? config.happn.adminPassword : 'happn'

    };

    client.login(loginParams).then(function (e) {

      if (e) return callback(e);

      _this.__addHappnerClient(ctx, client);

      callback(null, instance, client);
    });

  });
};

TestHelper.prototype.stopHappnerInstances = function(ctx, callback){

  var _this = this;

  async.eachSeries(_this.__happnerInstances[ctx], function (started, stopCallback) {

    started.instance.stop(function (e) {

      if (e) return stopCallback[e];

      if ((started.config && started.config.happn && started.config.happn.filename) || (started.config && started.config.data && started.config.data.filename)) {

        var dbPath;

        if (started.config.happn) dbPath = started.config.happn.filename;

        if (started.config.data) dbPath = started.config.data.filename;

        fs.unlinkSync(dbPath);
      }

      stopCallback();
    });
  }, function (e) {

    if (e) return callback(e);

    _this.__happnerInstances[ctx] = [];

    callback();
  });
};

TestHelper.prototype.getRecordFromHappn = function(options, callback){

  var service = this.findService(options.instanceName);

  var happn = service.instance._mesh.happn.server;

  happn.services.session.localClient({username:'_ADMIN', password:'happn'}, function(e, localClient){

    if (e) return callback(e);

    localClient.get(options.dataPath, function(e, response){

      if (e) return callback(e);

      callback(null, response);
    });
  })
};

TestHelper.prototype.getRecordFromSmallFile = function(options){

  try{

    var fileContents;

    var foundRecord = null;

    if (options.filename) fileContents = fs.readFileSync(options.filename, 'utf8');

    var records = fileContents.toString().split('\n');

    //backwards to get latest record
    records.reverse().every(function(line){

      var record = null;

      try{
        record = JSON.parse(line);
      }catch(e){
        //do nothing
      }

      if (record){

        if (record.path == options.dataPath){
          foundRecord = record;
          return false;
        }
      }

      return true;
    });

    return foundRecord;

  }catch(e){
    throw new Error('getRecordFromSmallFile failed: ' + e.toString(), e);
  }
};

TestHelper.prototype.newTestFile = function (options) {

  var _this = this;

  if (!options) options = {};

  if (!options.dir) options.dir = 'test' + path.sep + 'tmp';

  if (!options.ext) options.ext = 'nedb';

  if (!options.name) options.name = shortid.generate();

  var folderName = path.resolve(options.dir);

  fs.ensureDirSync(folderName);

  var fileName = folderName + path.sep + options.name + '.' + options.ext;

  var testRow = {
    "_id": "/_TEST_HELPER/TESTWRITE",
    "data": {},
    "path": "/_TEST_HELPER/TESTWRITE",
    "created": Date.now(),
    "modified": Date.now()
  };

  fs.writeFileSync(fileName, JSON.stringify(testRow));

  _this.__testFiles.push(fileName);

  return fileName;
};

TestHelper.prototype.deleteFiles = function () {

  var _this = this;

  var errors = 0;

  var deleted = 0;

  var lastError;

  _this.__testFiles.forEach(function (filename) {
    try {
      fs.unlinkSync(filename);
      deleted++;
    } catch (e) {
      lastError = e;
      errors++;
    }
  });

  var results = {deleted: deleted, errors: errors, lastError: lastError};

  return results;
};

TestHelper.prototype.startUp = Promise.promisify(function (configs, callback) {

  if (typeof configs == 'function') {
    callback = configs;
    configs = null;
  }

  if (configs == null) return callback();

  if (!Array.isArray(configs)) return callback(new Error('configs not an Array, please pass in Array'));

  var _this = this;

  async.eachSeries(configs, function (config, configCB) {
    _this.getService(config, configCB);
  }, callback);
});

TestHelper.prototype.__serviceExists = function (config) {

  var nameExists = false;

  if (config.__isRemote) nameExists = this.__activeServices[config.name] != null;

  else nameExists = this.__activeServices[config.name] != null;

  if (nameExists) return true;

  for (var serviceName in this.__activeServices) {
    var service = this.__activeServices[serviceName];
    if (service.config.happn.port == config.happn.port) return true;
  }

  return false;
};

TestHelper.prototype.findClient = function (options) {

  if (options.name) options.id = options.name;

  if (options.id) {

    var serviceId = options.id.split('@')[1];

    for (var serviceName in this.__activeServices) {

      if (serviceName == serviceId) {

        var service = this.__activeServices[serviceName];

        if (service.clients && service.clients.length > 0) {

          for (var clientIndex in service.clients) {

            var client = service.clients[clientIndex];

            if (client.id == options.id)  return client;
          }
        }
        return null;
      }
    }
  }

  return null;
};

TestHelper.prototype.getClient = Promise.promisify(function (config, callback) {

  if (typeof config != 'object') return callback('cannot get a client without a config');

  if (config.happn){
    config.name = config.name != null?config.name:config.happn.name;
  }

  if (!config.name) return callback('cannot get a client for unknown service name');

  if (!config.__testOptions) config.__testOptions = {};

  config.__testOptions.clientKey = shortid.generate() + '@' + config.name;//[client id]@[server key]

  var _this = this;

  var service = _this.findService(config);

  if (!service) return callback('could not find service using options: ' + JSON.stringify(config));

  var credentials = {};

  var options = {};

  var happnConfig = service.config.happn != null ? service.config.happn : service.config;

  var secure = happnConfig.secure != null ? happnConfig.secure : service.config.secure;

  var port = happnConfig.port != null ? happnConfig.port : service.config.port;

  if (secure) {

    options.secure = true;

    if (happnConfig.encryptPayloads) options.encryptPayloads = true;

    if (happnConfig.keyPair) options.keyPair = happnConfig.keyPair;

    var username = config.username ? config.username : '_ADMIN';

    var password = config.password;

    if (!password) {

      if (happnConfig.adminPassword)
        password = happnConfig.adminPassword

      else if (happnConfig.services && happnConfig.services.security &&
        happnConfig.services.security.config &&
        happnConfig.services.security.config.adminUser)
        password = happnConfig.services.security.config.adminUser.password;

      else
        password = 'happn'
    }

    credentials.username = username;
    credentials.password = password;
  }

  options.port = port;

  var clientInstance = new Happner.MeshClient(options);

  var clientConfig = JSON.parse(JSON.stringify(happnConfig));

  if (secure) {
    clientConfig.username = username;
    clientConfig.password = password;
  }

  clientConfig.__testOptions = config.__testOptions != null?config.__testOptions:{};

  clientConfig.__testOptions.skipComponentTests = clientConfig.__testOptions.skipComponentTests != null?clientConfig.__testOptions.skipComponentTests:true;

  clientInstance.login(credentials)

    .then(function () {

      if (_this.__activeServices[config.name].clients == null) _this.__activeServices[config.name].clients = [];

      var client = {instance: clientInstance, id: config.__testOptions.clientKey, config:clientConfig};

      _this.__activeServices[config.name].clients.push(client);

      callback(null, client);
    })

    .catch(function (e) {
      callback(e);
    });
});

TestHelper.prototype.findService = function (options) {

  if (typeof options == 'string') return this.__activeServices[options];

  if (options.name) {
    if (this.__activeServices[options.name]) return this.__activeServices[options.name];
  }

  if (options.id) {
    if (this.__activeServices[options.id]) return this.__activeServices[options.id];
  }

  if (options.port) {
    for (var serviceName in this.__activeServices) {
      var service = this.__activeServices[serviceName];
      if (service.config &&
        (service.config.port == options.port ||
        (service.config.happn && service.config.happn.port == options.port)))
        return service;
    }
  }

  return null;
};

TestHelper.prototype.restartService = function (options, callback) {

  var _this = this;

  var service = _this.findService(options);

  if (service != null) {

    var config = service.config;

    return _this.stopService(options, function (e) {

      if (e) return callback(e);

      _this.getService(config, callback);
    });
  }

  callback(new Error('could not find service'));
};

TestHelper.prototype.__appendTestComponentConfig = function(config){

  if (!config.modules) config.modules = {};

  if (!config.components) config.components = {};

  config.modules.testHelperComponent = {

    instance: {

      testHelperFunction : function($happn, val, callback){
        $happn.emit('test-function-called', {message:'test-message', value:val})
        callback();
      }
    }
  };

  config.components.testHelperComponent = {};
};

TestHelper.prototype.getService = Promise.promisify(function (config, callback) {

  var _this = this;

  if (typeof config == 'function') {
    callback = config;
    config = {};
  }

  if (!config.happn) config.happn = {};

  if (config.happn.name) config.name = config.happn.name;

  if (!config.name) config.name = sillyname();

  if (config.happn.port != null) config.port = config.happn.port;

  if (!config.port) config.port = 55000;

  config.happn.port = config.port;//for __serviceExists test

  if (config.__testOptions == null) config.__testOptions = {};

  if (config.__testOptions.skipComponentTests === false)
    _this.__appendTestComponentConfig(config);

  if (_this.__serviceExists(config)) return callback(new Error('service by the name ' + config.name + ' or port ' + config.port + ' already exists'));

  if (config.__testOptions.isRemote) return _this.startRemoteService(config, function (e, process) {

    if (e) return callback(e);

    var service = {instance: process, config: config, id: config.name};

    _this.__activeServices[config.name] = service;

    if (config.__testOptions.getClient) return _this.getClient(config, function (e, client) {

      if (e) return callback(new Error('started service ok but failed to get client: ' + e.toString()));

      service.client = client;

      callback(null, service);
    });

    callback(null, service);
  });

  Happner.create(config, function (e, instance) {

    if (e) return callback(e);

    var service = {instance: instance, config: config, id: config.name};

    _this.__activeServices[config.name] = service;

    if (config.__testOptions.getClient) return _this.getClient(config, function (e, client) {

      if (e) {
        service.stop(function(){

          delete _this.__activeServices[config.name];
          return callback(new Error('started service ok but failed to get client: ' + e.toString()));
        });
      }

      service.client = client;

      callback(null, service);
    });

    callback(null, service);
  });
});

TestHelper.prototype.disconnectClient = Promise.promisify(function (id, callback) {

  var _this = this;

  var removed = false;

  var client = _this.findClient({id: id});

  if (!client) return callback(new Error('client with id: ' + id + ' not found'));

  client.instance.disconnect({ttl:5000}, function (e) {

    if (e) return callback(e);

    var serviceId = id.split('@')[1];

    var service = _this.findService({id: serviceId});

    //remove the client from the services clients collection
    service.clients.every(function (serviceClient, serviceClientIndex) {

      if (serviceClient.id == id) {
        service.clients.splice(serviceClientIndex, 1);
        removed = true;
        return false;
      }
      return true;
    });

    return callback(null, removed);
  });
});

TestHelper.prototype.stopService = Promise.promisify(function (id, callback) {

  var _this = this;

  var activeService = _this.findService(id);

  if (!activeService) return callback(new Error('could not find service to stop using options: ' + JSON.stringify(id)));

  var completeStopService = function () {

    delete _this.__activeServices[activeService.id];

    if (activeService.config.__testOptions.isRemote) {

      activeService.instance.kill();

      return callback();
    }

    return activeService.instance.stop(callback);
  };

  if (activeService.clients && activeService.clients.length > 0) {

    return async.eachSeries(activeService.clients, function (activeServiceClient, activeServiceClientCB) {
      _this.disconnectClient(activeServiceClient.id, activeServiceClientCB);
    }, function (e) {

      if (e) {
        console.warn('unable to disconnect clients for service: ' + activeService.config.name);
      }
      completeStopService();
    });
  }

  return completeStopService();
});

TestHelper.prototype.testClientComponent = function(clientInstance, options, callback){

  if (typeof options == 'function'){
    callback = options;
    options = {};
  }

  if (options.skipComponentTests) {
    return callback();
  }

  if (!options.eventName) options.eventName = 'test-function-called';

  if (!options.componentName) options.componentName = 'testHelperComponent';

  if (!options.functionName) options.functionName = 'testHelperFunction';

  if (!options.methodArguments) options.methodArguments = [1];

  if (!options.expectedData) options.expectedData = {message:'test-message', value:1};

  if (clientInstance.exchange[options.componentName]) {

    clientInstance.event[options.componentName].on(options.eventName, function(data){

      try{
        expect(data).to.eql(options.expectedData);
        callback();
      }catch(e){
        callback(e);
      }
    });

    clientInstance.exchange[options.componentName][options.functionName].apply(clientInstance.exchange[options.componentName], options.methodArguments);

  } else callback(new Error('expected exchange and event methods not found'));
};

TestHelper.prototype.testClientData = function (clientInstance, callback) {

  var calledBack = false;

  var timeout = setTimeout(function () {
    raiseError('operations timed out');
  }, 2000);

  var raiseError = function (message) {
    if (!calledBack) {
      calledBack = true;
      return callback(new Error(message));
    }
  };

  var operations = '';

  clientInstance.data.on('/test/operations',

    function (data, meta) {

      operations += meta.action.toUpperCase().split('@')[0].replace(/\//g, '');

      if (operations === 'SETREMOVE') {

        clearTimeout(timeout);

        callback();
      }

    }, function (e) {

      if (e) return raiseError(e.toString());

      clientInstance.data.set('/test/operations', {test: 'data'}, function (e) {

        if (e) return raiseError(e.toString());

        clientInstance.data.remove('/test/operations', function (e) {

          if (e) return raiseError(e.toString());
        });
      });
    });
};

TestHelper.prototype.testService = Promise.promisify(function (id, callback) {

  var _this = this;

  if (!callback) throw new Error('callback cannot be null');

  if (id == null || typeof id == 'function') {
    return callback(new Error('id is necessary to test a service.'));
  }

  var service = _this.findService(id);

  if (!service) return callback(new Error('unable to find service with id: ' + id));

  var clientConfig = JSON.parse(JSON.stringify(service.config));

  _this.getClient(clientConfig, function (e, client) {

    if (e) return callback(e);

    _this.testClientData(client.instance, function (e) {

      if (e) return callback(e);

      _this.testClientComponent(client.instance, client.config.__testOptions, callback);
    });
  });
});

TestHelper.prototype.tearDown = Promise.promisify(function (options, callback) {

  if (typeof options == 'function') {
    callback = options;
    options = {};
  }

  var timeout = Object.keys(this.__activeServices).length * 10000;

  var timedOut = false;

  if (options.ttl) {
    if (typeof options.ttl != 'number')
      timeout = options.ttl;
  }

  var timeoutHandle = setTimeout(function () {
    timedOut = true;
    return callback(new Error('tearDown timed out'));
  }, timeout);

  var _this = this;

  async.eachSeries(Object.keys(_this.__activeServices), function (activeServiceId, activeServiceCB) {

    if (timedOut) return activeServiceCB(new Error('timed out'));

    _this.stopService(activeServiceId, activeServiceCB);

  }, function (e) {

    _this.deleteFiles();

    if (!timedOut) clearTimeout(timeoutHandle);

    callback(e);
  });
});

module.exports = TestHelper;
