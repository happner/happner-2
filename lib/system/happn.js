var fs = require('fs-extra'),
  path = require('path'),
  EventEmitter = require('events').EventEmitter,
  _ = require('lodash'),
  utils = require('./utilities');

module.exports = HappnLayer;

HappnLayer.prototype.initialize = initialize;
HappnLayer.prototype.__initializeAccess = __initializeAccess;
HappnLayer.prototype.__initializeStore = __initializeStore;
HappnLayer.prototype.__initializeBaseConfig = __initializeBaseConfig;
HappnLayer.prototype.__initializeDbConfig = __initializeDbConfig;
HappnLayer.prototype.__initializeLayersConfig = __initializeLayersConfig;
HappnLayer.prototype.__inboundLayer = __inboundLayer;
HappnLayer.prototype.__outboundLayer = __outboundLayer;
HappnLayer.prototype.connect = connect;

module.exports.create = function(mesh, happnServer, config, callback) {
  const log = mesh.log.createLogger('Happn');
  const happnLayerInstance = new HappnLayer();
  happnLayerInstance.initialize(config, log);
  happnLayerInstance.connect(mesh, happnServer, function(e, clientInstance) {
    if (e) return callback(e);
    callback(null, happnLayerInstance.access, clientInstance);
  });
};

function HappnLayer() {}

function initialize(config, logger) {
  this.log = logger;
  this.access = this.__initializeAccess();
  this.store = this.__initializeStore();

  this.__initializeBaseConfig(config);
  this.__initializeDbConfig(config);
  this.__initializeLayersConfig(config);

  this.config = config;
}

function __initializeAccess() {
  var access = {};

  access.serverReady = false;
  access.serverError = null;
  access.clientReady = false;
  access.clientError = null;

  access.listen = function(callback) {
    if (!this.__toListenInstance)
      return callback(new Error('no instance waiting for listen command'));
    this.__toListenInstance.listen(callback);
  }.bind(access);

  return access;
}

function __initializeStore() {
  var store = {};

  store.server = null;
  store.client = null;
  store.events = new EventEmitter(); // proxy events from pubsub in happn

  Object.keys(store).forEach(key => {
    Object.defineProperty(this.access, key, {
      get: function() {
        return store[key];
      },
      enumerable: true
    });
  });

  return store;
}

function __initializeBaseConfig(config) {
  config.happn = config.happn || {};

  if (config.name) config.happn.name = config.name;

  if (config.port) config.happn.port = config.port;

  if (config.secure) config.happn.secure = true;

  if (config.persist) config.happn.persist = true;

  if (!config.happn.services) config.happn.services = {};

  if (!config.happn.services.data) config.happn.services.data = {};

  if (!config.happn.services.data.config) config.happn.services.data.config = {};

  config.happn.setOptions = config.happn.setOptions || {};
  config.happn.setOptions.timeout = config.happn.setOptions.timeout || 10000;

  if (typeof config.happn.setOptions.noStore !== 'boolean') config.happn.setOptions.noStore = true;

  var exclusions;

  if (config.happn.secure) {
    if (!config.happn.services.security) config.happn.services.security = {};

    if (!config.happn.services.security.config) config.happn.services.security.config = {};

    if (!config.happn.services.security.config.adminUser)
      config.happn.services.security.config.adminUser = {};

    if (!config.happn.services.security.config.adminUser.password) {
      if (config.happn.adminPassword)
        config.happn.services.security.config.adminUser.password = config.happn.adminPassword;
      else {
        // we dont want to make this happn in a production environment
        if (process.env.NODE_ENV === 'production')
          throw new Error(
            'admin password has not been configured on a secure production environment'
          );

        //eslint-disable-next-line
        console.warn(
          'secure configuration, without a configured password - hope you are testing...'
        );

        config.happn.services.security.config.adminUser.password = 'happn';
      }
    }

    if (!config.happn.sessionTokenSecret)
      config.happn.sessionTokenSecret = require('shortid').generate();

    if (!config.happn.services.connect) config.happn.services.connect = {};

    if (!config.happn.services.connect.config) config.happn.services.connect.config = {};

    if (!config.happn.services.connect.config.middleware)
      config.happn.services.connect.config.middleware = {};

    if (!config.happn.services.connect.config.middleware.security)
      config.happn.services.connect.config.middleware.security = {};

    if (!config.happn.services.connect.config.middleware.security.exclusions) {
      config.happn.services.connect.config.middleware.security.exclusions = [
        '/api/client',
        '/primus/*',
        '/rest/login',
        '/rest/method/*'
      ];
    } else {
      exclusions = config.happn.services.connect.config.middleware.security.exclusions;

      if (exclusions.indexOf('/api/client') < 0) exclusions.push('/api/client');
      if (exclusions.indexOf('/rest/login') < 0) exclusions.push('/rest/login');
      if (exclusions.indexOf('/primus/*') < 0) exclusions.push('/primus/*');
      if (exclusions.indexOf('/rest/method/*') < 0) exclusions.push('/rest/method/*');
    }

    //convenience exclusions
    if (
      config.happn.middleware &&
      config.happn.middleware.security &&
      config.happn.middleware.security.exclusions
    ) {
      config.happn.middleware.security.exclusions.forEach(function(exclusion) {
        config.happn.services.connect.config.middleware.security.exclusions.push(exclusion);
      });
    }

    //convenience session management
    if (config.happn.activateSessionManagement)
      config.happn.services.security.config.activateSessionManagement = true;
    if (config.happn.logSessionActivity)
      config.happn.services.security.config.logSessionActivity = true;

    //convenience security profiles, TODO: do we enable profiles on unsecured meshes?
    if (config.happn.profiles) {
      //warn about overwrite
      if (config.happn.services.security.config.profiles)
        //eslint-disable-next-line
        console.warn('overwriting existing security profiles with convenience profiles');

      config.happn.services.security.config.profiles = config.happn.profiles;
    }
  }

  if (config.happn.dbfile)
    throw new Error('dbfile is no longer a valid config setting, please use filename');

  if (utils.getNestedVal(config, 'happn.services.data.config.filename') != null)
    config.happn.filename = utils.getNestedVal(config, 'happn.services.data.config.filename');

  if (config.happn.filename) config.happn.persist = true; //we specified a file, so set persist true

  if (config.happn.protocol === 'https') config.happn.transport = { transport: { mode: 'https' } };

  if (config.happn.transport) {
    if (!config.happn.services.transport) config.happn.services.transport = { config: {} };

    _.merge(config.happn.services.transport.config, config.happn.transport);
  }
}

function __initializeDbConfig(config) {
  if (config.happn.persist) {
    if (!config.happn.filename) {
      if (!config.name)
        throw new Error('persist option is true, but no filename or mesh name specified');

      var homeDir = process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'];

      var defaultDBFilepart = config.name;

      // creates a new file with every mesh re start
      config.happn.filename =
        homeDir + path.sep + '.happn' + path.sep + 'data' + path.sep + defaultDBFilepart + '.nedb';
    }

    fs.ensureDirSync(path.dirname(config.happn.filename));

    fs.writeFileSync(config.happn.filename + '.test1', 'ping');

    fs.unlinkSync(config.happn.filename + '.test1');

    this.log.info('persisting %s', config.happn.filename);

    if (!config.happn.defaultRoute)
      config.happn.defaultRoute = config.happn.persist ? 'persist' : 'mem';

    // Datastores have no starting patterns (see commented out below)
    // Instead the 'defaultRoute' is used.
    // BUT: components can register their own routes to override the default

    if (!config.happn.services.data.config.datastores)
      config.happn.services.data.config.datastores = [
        {
          name: 'persist',
          isDefault: config.happn.defaultRoute === 'persist',
          settings: {
            filename: config.happn.filename
          },
          patterns: [
            '/_SYSTEM/*' //system stuff should get persisted
          ]
        },
        {
          name: 'mem',
          isDefault: config.happn.defaultRoute === 'mem',
          patterns: []
        }
      ];

    //compact interval shortcut
    if (config.happn.compactInterval)
      config.happn.services.data.config.compactInterval = config.happn.compactInterval;
  }
}

function __inboundLayer(message, callback) {
  try {
    if (
      message.raw.action === 'on' &&
      message.raw.path.indexOf('/SET@/_exchange/responses') === 0
    ) {
      //we are not allowed to listen in any response paths that dont contain our sessions
      if (message.raw.path.indexOf(message.session.id) === -1) {
        //we need to write an ok and emulate a successful subscription
        message.request = message.raw;
        message.response = {
          data: {
            id: Date.now()
          },
          _meta: {
            status: 'ok'
          }
        };

        var protocol = this.store.server.services.protocol.__getProtocol(message);
        var successMessage = protocol.success(message);
        successMessage.response.__outbound = true;
        var client = this.store.server.services.session.getClient(message.session.id);
        client.write(successMessage.response);
        return;
      }

      //old clients, that are listening in on non-variable depth wildcards
      if (message.raw.path.split('/').length === 6) {
        if (!message.raw.options) message.raw.options = {};
        message.raw.options.originalPath = message.raw.path;
        message.raw.path += '/*/*/*';
      }
    }
  } catch (e) {
    this.log.error('__inboundLayer failure: ' + e.message + ' at: ' + e.stack);
    return callback(new Error('subscription filter failed: ' + e.toString(), e));
  }
  callback(null, message);
}

function __outboundLayer(message, callback) {
  try {
    //re-write channel for happner 1 backward compatibility
    if (
      message.request &&
      message.request.action === 'emit' &&
      message.request.options &&
      message.request.options.originalPath
    ) {
      message.request.publication._meta.channel = message.request.options.originalPath;
    }
  } catch (e) {
    //we log the error in case we get 'callback was already called'
    this.log.error('outboundLayer failure: ' + e.message + ' at: ' + e.stack);
    return callback(new Error('subscription filter failed: ' + e.toString(), e));
  }
  callback(null, message);
}

function __initializeLayersConfig(config) {
  if (!config.happn.inboundLayers) config.happn.inboundLayers = [];
  if (!config.happn.outboundLayers) config.happn.outboundLayers = [];

  config.happn.inboundLayers.push(this.__inboundLayer.bind(this));
  config.happn.outboundLayers.push(this.__outboundLayer.bind(this));

  //happn layer convenience
  if (config.happn.inboundLayers || config.happn.outboundLayers) {
    if (!config.happn.services.protocol) config.happn.services.protocol = {};

    if (!config.happn.services.protocol.config) config.happn.services.protocol.config = {};

    if (!config.happn.services.protocol.config.inboundLayers)
      config.happn.services.protocol.config.inboundLayers = [];

    if (!config.happn.services.protocol.config.outboundLayers)
      config.happn.services.protocol.config.outboundLayers = [];

    if (config.happn.inboundLayers)
      config.happn.inboundLayers.forEach(function(layer) {
        config.happn.services.protocol.config.inboundLayers.push(layer);
      });

    if (config.happn.outboundLayers)
      config.happn.outboundLayers.forEach(function(layer) {
        config.happn.services.protocol.config.outboundLayers.push(layer);
      });
  }
}

function connect(mesh, happnServer, callback) {
  happnServer.create(
    this.config.happn,

    (e, happnInstance) => {
      if (e) {
        this.access.serverError = e;
        return callback(e);
      }

      this.log.$$DEBUG('server ready');

      this.access.serverReady = true;

      this.store.server = happnInstance;

      if (this.config.happn.deferListen) this.access.__toListenInstance = happnInstance;

      this.store.server.services.session.on('disconnect', ev => {
        var name;

        try {
          if (ev.info.mesh) name = ev.info.mesh.name;
          else if (ev.info.happn) name = ev.info.happn.name;
          else if (ev.user) name = ev.user.username;
          else name = 'anonymous';

          this.log.info("'%s' disconnected", name);
        } catch (e) {
          //do nothing
        }
        this.log.$$TRACE('detatch', ev.info);
        this.store.events.emit('detatch', ev);
      });

      this.store.server.services.session.on('authentic', ev => {
        var name;
        try {
          if (!ev.info.browser) {
            if (ev.info.mesh) name = ev.info.mesh.name;
            else if (ev.info.happn) name = ev.info.happn.name;
            else if (ev.user) name = ev.user.username;
            else name = 'anonymous';

            this.log.info("'%s' connected", name);
          }
        } catch (e) {
          //do nothing
        }
        this.log.$$TRACE('attach', ev.info);
        this.store.events.emit('attach', ev);
      });

      this.config.name = happnInstance.services.system.name;

      happnInstance.services.session.localAdminClient((e, clientInstance) => {
        if (e) {
          return happnInstance.stop(() => {
            this.access.clientError = e;
            return callback(e);
          });
        }

        this.log.$$DEBUG('client ready');
        this.access.clientReady = true;
        this.store.client = clientInstance;

        this.store.client.set('/test/write', { can: 'can' }, e => {
          if (e) {
            if (e instanceof Error) {
              e.message = 'Happn test failed: ' + e.message;
              return callback(e, null);
            }
            // could still be throwing strings
            return callback(e, null);
          }

          // MeshNode uses the client.
          // Has access to server in _mesh.happn.server
          //
          // only available after server mesh.initialize()

          callback(null, clientInstance);
        });
      });
    }
  );
}
