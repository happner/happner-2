// connect old happner client to new happner server
// (use config.domain to support load balancer)

var OldHappner = require('happner');
var Happner = require('../../..');
var expect = require('expect.js');

describe(require('path').basename(__filename), function () {

  context('insecure', function () {

    var server, client;

    before('start server', function (done) {
      server = undefined;
      Happner.create({
        name: 'MESH_NAME',
        domain: 'MESH_DOMAIN', // domain name is inherited from mesh name if unspecified
        modules: {
          'testComponent': {
            instance: {
              method: function ($happn, callback) {
                // return inherited domain name
                callback(null, $happn.info.mesh.domain);
              },
              sendEvent: function ($happn, callback) {
                $happn.emit('/event', $happn.info.mesh.domain);
                callback();
              }
            }
          }
        },
        components: {
          testComponent: {}
        }
      }).then(function (_server) {
        server = _server;
        done();
      }).catch(done);
    });

    before('start client', function (done) {
      var x = new OldHappner.MeshClient();
      x.login().then(function () {
        client = x;
        done();
      }).catch(done);
    });

    after('stop client', function (done) {
      if (!client) return done();
      client.disconnect(done);
    });

    after('stop server', function (done) {
      if (!server) return done();
      server.stop({reconnect: false}, done);
    });

    it('can call component methods', function (done) {
      client.exchange.testComponent.method()
        .then(function (result) {
          expect(result).to.equal('MESH_DOMAIN'); // inherited domain name
        })
        .then(done).catch(done);
    });

    it('can call component methods through rest', function (done) {
      var restler = require('restler');
        restler.get('http://localhost:55000/rest/method/testComponent/method', {})
          .on('complete', function(result) {
            if (result instanceof Error) return done(result);
            expect(result.error).to.eql(null);
            expect(result.data).to.equal('MESH_DOMAIN');
            done();
          });
    });

    it('can subscribe to events', function (done) {
      client.event.testComponent.on('/event', function (data) {
        try {
          expect(data).to.eql({value: 'MESH_DOMAIN'});
          done();
        } catch (e) {
          done(e);
        }
      });
      client.exchange.testComponent.sendEvent().catch(done);
    });

    it('can use data', function (done) {
      client.data.set('/some/path', {val: 'ue'}, function (e) {
        if (e) return done(e);
        client.data.get('/some/path', function (e, result) {
          delete(result._meta);
          expect(result).to.eql({val: 'ue'});
          done();
        });
      })
    });
  });


  context('secure', function () {

    var server, client;

    var user = {
      username: 'username',
      password: 'password'
    };

    before('start server', function (done) {
      server = undefined;
      Happner.create({
        name: 'MESH_NAME',
        domain: 'DOMAIN_NAME', // domain name is inherited from mesh name if unspecified
        happn: {
          secure: true
        },
        modules: {
          'testComponent': {
            instance: {
              method: function ($happn, callback) {
                // return inherited domain name
                callback(null, $happn.info.mesh.domain);
              },
              causeEvent: function ($happn, callback) {
                $happn.emit('event', $happn.info.mesh.domain);
                callback();
              }
            }
          }
        },
        components: {
          testComponent: {}
        }
      }).then(function (_server) {
        server = _server;
        done();
      }).catch(done);
    });

    before('create user', function (done) {
      var security = server.exchange.security;
      var group = {
        name: 'group',
        permissions: {
          events: {
            '/DOMAIN_NAME/testComponent/event': {authorized: true}
          },
          data: {
            '/some/path': {authorized: true}
          },
          methods: {
            '/DOMAIN_NAME/testComponent/method': {authorized: true},
            '/DOMAIN_NAME/testComponent/causeEvent': {authorized: true},
            // '/DOMAIN_NAME/testComponent/useOwnData': {authorized: true},
            // '/DOMAIN_NAME/data/set': {authorized: true},
            // '/DOMAIN_NAME/data/get': {authorized: true}
          }
        }
      };

      Promise.all([
        security.addGroup(group),
        security.addUser(user)
      ])
        .spread(security.linkGroup)
        .then(function () {
          done();
        }).catch(done);
    });

    before('start client', function (done) {
      var x = new OldHappner.MeshClient();
      x.login({
        username: 'username',
        password: 'password'
      })
        .then(function () {
          client = x;
          done();
        })
        .catch(done);
    });

    after('stop client', function (done) {
      if (!client) return done();
      client.disconnect(done);
    });

    after('stop server', function (done) {
      if (!server) return done();
      server.stop({reconnect: false}, done);
    });

    it('can call component methods', function (done) {
      client.exchange.testComponent.method()
        .then(function (result) {
          expect(result).to.equal('DOMAIN_NAME'); // inherited domain name
        })
        .then(done).catch(done);
    });

    it('can call component methods through rest', function (done) {
      var restler = require('restler');
      restler.postJson('http://localhost:55000/rest/login', user).on('complete', function(result){
        if (result.error)
          return done(new Error(result.error.message));
        var token = result.data.token;
        restler.get('http://localhost:55000/rest/method/testComponent/method?happn_token=' + token, {})
          .on('complete', function(result) {
            if (result instanceof Error) return done(result);
            expect(result.error).to.eql(null);
            expect(result.data).to.equal('DOMAIN_NAME');
            done();
          });
      });
    });

    it('can subscribe to events', function (done) {
      client.event.testComponent.on('event', function (data) {
        try {
          expect(data).to.eql({value: 'DOMAIN_NAME'});
          done();
        } catch (e) {
          done(e);
        }
      });
      client.exchange.testComponent.causeEvent().catch(done);
    });

    xit('can use data', function (done) {
      client.data.set('/some/path', {val: 'ue'}, function (e) {
        if (e) return done(e);
        client.data.get('/some/path', function (e, result) {
          delete(result._meta);
          expect(result).to.eql({val: 'ue'});
          done();
        });
      })
    });
  });


});
