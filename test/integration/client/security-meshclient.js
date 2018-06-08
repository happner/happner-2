describe.skipWindows = (process.platform === 'win32') ? describe.skip : describe;

describe.skipWindows(require('../../__fixtures/utils/test_helper').create().testName(__filename, 3), function () {

  var path = require('path');
  var Happner = require('../../..');
  var Promise = require('bluebird');
  var fs = require('fs');
  var should = require('chai').should();
  var expect = require('expect.js');

  var server;
  var test_id = Date.now() + '_' + require('shortid').generate();
  var dbFileName = './temp/' + test_id + '.nedb';

  this.timeout(60000);

  before('start server', function (done) {

    try {
      fs.unlinkSync(dbFileName);
    } catch (e) {
    }
    Happner.create({
      name: 'Server',
      happn: {
        persist: true,
        secure: true,
        filename: dbFileName
      },
      modules: {
        'ComponentName': {
          instance: {
            allowedMethod: function ($origin, input, callback, $happn) { // "max-nasty" injection
              input.meshName = $happn.info.mesh.name;
              input.originUser = $origin.username;
              callback(null, input);
            },
            deniedMethod: function (input, callback) {
              callback(null, input);
            }
          }
        }
      },
      components: {
        'ComponentName': {}
      }
    })
      .then(function (mesh) {
        var security = mesh.exchange.security;
        server = mesh;
        return Promise.all([
          security.addGroup({
            name: 'group',
            permissions: {
              events: {},
              data: {
                '/allowed/get/*': {actions:['get']},
                '/allowed/on/*': {actions:['on','set']},
                '/allowed/remove/*': {actions:['set','remove','get']},
                '/allowed/all/*': {actions:['*']}
              },
              methods: {
                '/Server/ComponentName/allowedMethod': {authorized: true}
              }
            }
          }),
          security.addUser({
            username: 'username',
            password: 'password'
          })
        ]).spread(function (group, user) {
          return security.linkGroup(group, user);
        });
      })
      .then(function () {
        done();
      })
      .catch(done);
  });

  after('stop server', function (done) {

    try {
      fs.unlinkSync(dbFileName);
    } catch (e) {}

    if (server) server.stop({reconnect: false}).then(function(){

      done();
    });

    else done();

  });

  it('rejects login promise on bad credentials', function (done) {
    var client = new Happner.MeshClient();
    client.login({
      username: 'username',
      password: 'bad password'
    })
      .then(function () {
        client.disconnect();
        done(new Error('should not allow'));
      })
      .catch(function (error) {
        error.toString().should.equal('AccessDenied: Invalid credentials');
        done();
      })
      .catch(done);
  });

  it('emits login/deny on bad credentials', function (done) {
    var client = new Happner.MeshClient();
    client.on('login/deny', function (error) {
      try {
        error.toString().should.equal('AccessDenied: Invalid credentials');
        done();
      } catch (e) {
        done(e);
      }
    });
    client.login({
      username: 'username',
      password: 'bad password'
    })
      .then(function () {
        client.disconnect();
        done(new Error('should not allow'));
      })
  });

  it('emits login/allow on good credentials', function (done) {
    var client = new Happner.MeshClient();
    client.on('login/allow', function () {
      done();
    });
    client.login({
      username: 'username',
      password: 'password'
    })
      .catch(done)
  });

  context('events', function () {
    // might already be implicitly tested in elsewhere
    //
    // publish allowed/denied
    // subscribe allowed/denied
  });

  context.only('data', function () {
    var client;

    before('start client', function (done) {
      client = new Happner.MeshClient();
      client.login({
        username: 'username',
        password: 'password'
      })
        .then(function () {
          done();
        })
        .catch(done);
    });

    after('stop client', function () {
      client.disconnect();
    });

    it('allows access to allowed "on" data points', function (done) {
      client.data.on('/allowed/on/*', function(data){
        expect(data.test).to.be('data');
        done();
      }, function(e){
        if (e) return done(e);
        client.data.set('/allowed/on/1', {test:'data'}, function(e){
          if (e) return done(e);
        });
      })
    });

    it('denies access to denied data points', function (done) {
      client.data.set('/not/allowed/on/1', {test:'data'}, function(e){
        expect(e.toString()).to.be('AccessDenied: unauthorized');
        done();
      });
    });

    it('prevents any attempts to save data permissions that may interfere with _events', function (done) {
      var security = server.exchange.security;

      security.addGroup({
        name: 'badgroup',
        permissions: {
          data: {
            '/_events/*': {actions:['*']}
          }
        }
      }).catch(function(e){
        expect(e.toString()).to.be('Error: data permissions can not start with /_events, /_exchange or /@HTTP');
        done();
      })
    });

    it('prevents any attempts to save data permissions that may interfere with /_exchange', function (done) {
      var security = server.exchange.security;

      security.addGroup({
        name: 'badgroup',
        permissions: {
          data: {
            '/_exchange/*': {actions:['*']}
          }
        }
      }).catch(function(e){
        expect(e.toString()).to.be('Error: data permissions can not start with /_events, /_exchange or /@HTTP');
        done();
      })
    });

    it('prevents any attempts to save data permissions that may interfere with /@HTTP', function (done) {
      var security = server.exchange.security;

      security.addGroup({
        name: 'badgroup',
        permissions: {
          data: {
            '/@HTTP/*': {actions:['*']}
          }
        }
      }).catch(function(e){
        expect(e.toString()).to.be('Error: data permissions can not start with /_events, /_exchange or /@HTTP');
        done();
      })
    });

    it('adds group data permissions, we check we have access to the new path', function (done) {

      client.data.set('/updated/1', {test:'data'}, function(e){

        expect(e.toString()).to.be('AccessDenied: unauthorized');
        var addPermissions = {
          data: {
            '/updated/*':{actions:['on', 'set']}
          }
        };

        var security = server.exchange.security;

        security.addGroupPermissions('group', addPermissions)

          .then(function (updatedGroup) {
            client.data.set('/updated/1', {test:'data'}, done);
          })
          .catch(done);
      });
    });

    it('removes group data permissions, we check we have access to the new path', function (done) {

      client.data.set('/toremove/1', {test:'data'}, function(e){

        expect(e.toString()).to.be('AccessDenied: unauthorized');
        var addPermissions = {
          data: {
            '/toremove/*':{actions:['on', 'set']}
          }
        };

        var security = server.exchange.security;

        security.addGroupPermissions('group', addPermissions)

          .then(function (updatedGroup) {
            return client.data.set('/toremove/1', {test:'data'});
          })
          .then(function(){
            return security.removeGroupPermissions('group', addPermissions);
          })
          .then(function(){
            //ensure we only removed one permission
            return client.data.get('/allowed/get/*');
          })
          .then(function(){
            client.data.set('/toremove/1', {test:'data'}, function(e){
              expect(e.toString()).to.be('AccessDenied: unauthorized');
              done();
            });
          })
          .catch(done);
      });
    });
  });

  context('exchange', function () {
    var client;

    before('start client', function (done) {
      client = new Happner.MeshClient();
      client.login({
        username: 'username',
        password: 'password'
      })
        .then(function () {
          done();
        })
        .catch(done);
    });

    after('stop client', function () {
      client.disconnect();
    });

    it('allows access to allowed methods', function (done) {
      client.exchange.ComponentName.allowedMethod({key: 'value'})
        .then(function (result) {
          ({
            key: 'value',
            meshName: 'Server',
            originUser: 'username'
          }).should.eql(result);
          done();
        })
        .catch(done);
    });

    it('denies access to denied methods', function (done) {
      client.exchange.ComponentName.deniedMethod({key: 'value'})
        .then(function (result) {
          done(new Error('should not allow'));
        })
        .catch(function (error) {
          error.toString().should.equal('AccessDenied: unauthorized');
          done();
        })
        .catch(done);
    });
  });
});
