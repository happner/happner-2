var async = require('async');

var Mesh = require('happner');
var Mesh2 = require('../../..');

var fs = require('fs');

module.exports = {
  __happnerClients: {},
  __addHappnerClient: function (ctx, client) {
    if (!this.__happnerClients[ctx])
      this.__happnerClients[ctx] = [];

    this.__happnerClients[ctx].push(client);
  },
  __happnerInstances: {},
  __addHappnerInstance: function (ctx, instance, config) {
    if (!this.__happnerInstances[ctx])
      this.__happnerInstances[ctx] = [];

    this.__happnerInstances[ctx].push({instance: instance, config: config});
  },
  startHappnerInstance: function (ctx, config, callback) {

    var _this = this;

    if (!ctx)
      ctx = 'default';

    if (typeof config == 'function') {
      callback = config;
      config = null;
    }

    Mesh2.create(config, function (e, instance) {

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
  },
  stopHappnerInstances: function (ctx, callback) {
    var _this = this;
    var index = 0;

    async.eachSeries(_this.__happnerInstances[ctx], function (started, stopCallback) {

      started.instance.stop(function (e) {

        if (e) return stopCallback[e];

        if ((started.config && started.config.happn && started.config.happn.filename) || (started.config && started.config.data && started.config.data.filename)) {

          var dbPath;
          if (started.config.happn)
            dbPath = started.config.happn.filename;

          if (started.config.data)
            dbPath = started.config.data.filename;

          fs.unlinkSync(dbPath);
        }

        stopCallback();
      });
    }, function (e) {
      if (e) return callback(e);
      _this.__happnerInstances[ctx] = [];
      callback();
    });
  },
  exec: function (ctx, command, callback) {

  },
  kill: function (ctx, callback) {

  }
}
