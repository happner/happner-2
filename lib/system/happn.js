var Happn = require('happn-3')
  , happnServer = Happn.service
  , fs = require('fs-extra')
  , path = require('path')
  , EventEmitter = require('events').EventEmitter
;

module.exports.create = function (mesh, config, callback) {

  var log = mesh.log.createLogger('Happn');

  var access = {};

  access.serverReady = false;
  access.serverError = null;
  access.clientReady = false;
  access.clientError = null;

  access.listen = function (callback) {

    if (!this.__toListenInstance) return callback(new Error('no instance waiting for listen command'));
    this.__toListenInstance.listen(callback);

  }.bind(access);

  var store = {};

  store.server = null;
  store.client = null;
  store.events = new EventEmitter(); // proxy events from pubsub in happn

  Object.keys(store).forEach(
    function (key) {
      Object.defineProperty(access, key, {
        get: function () {
          return store[key];
        },
        enumerable: true
      })
    }
  );

  config.happn = config.happn || {};

  if (config.name) config.happn.name = config.name;

  if (config.secure) config.happn.secure = true;

  if (!config.happn.services) config.happn.services = {};

  if (!config.happn.services.data) config.happn.services.data = {};

  if (!config.happn.services.data.config) config.happn.services.data.config = {};

  var adminUser = {};

  if (config.happn.adminPassword) adminUser.password = config.happn.adminPassword;
  else adminUser.password = require('shortid').generate();

  if (!config.happn.sessionTokenSecret) config.happn.sessionTokenSecret = require('shortid').generate();

  var homeDir = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];

  var defaultDBFilepart = config.name;

  if (!defaultDBFilepart) defaultDBFilepart = require('shortid').generate();
  // creates a new file with every mesh re start
  var defaultDbFile = homeDir + path.sep + '.happn' + path.sep + 'data' + path.sep + defaultDBFilepart /* + '-' + Date.now().toString()*/ + '.nedb';
  var dbfile;

  config.happn.setOptions = (config.happn.setOptions || {});
  config.happn.setOptions.timeout = (config.happn.setOptions.timeout || 10000);

  if (typeof config.happn.setOptions.noStore != 'boolean') config.happn.setOptions.noStore = true;

  var exclusions, cookieName, cookieDomain;

  if (config.happn.secure) {

    if (!config.happn.services.connect) config.happn.services.connect = {};

    if (!config.happn.services.connect.config) config.happn.services.connect.config = {};

    if (!config.happn.services.connect.config.middleware) config.happn.services.connect.config.middleware = {};

    if (!config.happn.services.connect.config.middleware.security) config.happn.services.connect.config.middleware.security = {};

    if (!config.happn.services.connect.config.middleware.security.exclusions) {

      config.happn.services.connect.config.middleware.security.exclusions = ['/api/client', '/primus/*', '/rest/login', '/rest/method/*'];

    } else {

      exclusions = config.happn.services.connect.config.middleware.security.exclusions;

      if (exclusions.indexOf('/api/client') < 0) exclusions.push('/api/client');
      if (exclusions.indexOf('/rest/login') < 0) exclusions.push('/rest/login');
      if (exclusions.indexOf('/primus/*') < 0) exclusions.push('/primus/*');
      if (exclusions.indexOf('/rest/method/*') < 0) exclusions.push('/rest/method/*');
    }
  }

  //embedded mode has the notion of dbfiles
  try {

    dbfile = config.happn.filename = config.happn.filename || defaultDbFile;

    fs.ensureDirSync(path.dirname(dbfile));
    fs.writeFileSync(dbfile + '.test1', 'ping');

    log.info('persisting %s', dbfile);

    if (!config.happn.defaultRoute) config.happn.defaultRoute = config.happn.persist ? 'persist' : 'mem';

    // Datastores have no starting patterns (see commented out below)
    // Instead the 'defaultRoute' is used.
    // BUT: components can register their own routes to override the default

    config.happn.services.data.config.datastores = [
      {
        name: 'persist',
        isDefault: config.happn.defaultRoute === "persist",
        settings: {
          filename: dbfile
        },
        patterns: [
          '/_SYSTEM/*'//system stuff should get persisted
        ]
      },
      {
        name: 'mem',
        isDefault: config.happn.defaultRoute === "mem",
        patterns: [
          // '/_mem/*'
        ]
      }
    ]

  } catch (e) {

    //TODO - is this really a good idea, you may think you are persisting, but actually are not...?
    log.warn('no read/write at %s', dbfile);
    log.warn('continuing without persistance');

    config.happn.persist = false;

    delete config.happn.filename;

  } finally {

    try {

      fs.unlinkSync(dbfile + '.test1');

    } catch (e) {}
  }

  happnServer.create(config.happn,

    function (e, happnInstance) {

      if (e) {

        access.serverError = e;
        return callback(e);
      }

      log.$$DEBUG('server ready');
      access.serverReady = true;
      store.server = happnInstance;

      if (config.happn.deferListen) access.__toListenInstance = happnInstance;

      store.server.services.session.on('disconnect', function (ev) {

        try {

          if (ev.user) log.info('\'%s\' disconnected', ev.user.username);
          else log.info('\'%s\' disconnected, anonymous', ev.id);

        } catch (e) {}
        //log.$$TRACE('detatch', ev.info);
        store.events.emit('detatch', ev);
      });

      store.server.services.session.on('authentic', function (ev) {

        try {

          if (ev.user) log.info('\'%s\' connected', ev.user.username);
          else log.info('\'%s\' connected, anonymous', ev.id);

        } catch (e) {}
        //log.$$TRACE('attach', ev.info);
        store.events.emit('attach', ev);
      });

      if (!adminUser.username) adminUser.username = '_ADMIN';

      config.name = happnInstance.services.system.name;

      adminUser.keyPair = happnInstance.services.security._keyPair;

      var clientConfig = {
        Logger: mesh.log
      };

      if (config.happn.secure){

        clientConfig.secure = true;
        clientConfig.username = '_ADMIN';
        clientConfig.password = adminUser.password;

      }

      happnInstance.services.session.localClient(clientConfig, function(e, clientInstance){

        if (e) {

          access.clientError = e;
          return callback(e);
        }

        log.$$DEBUG('client ready');
        access.clientReady = true;

        store.client = clientInstance;

        store.client.set('/test/write', {'can': 'can'}, function (e, resp) {

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

  return access;
};
