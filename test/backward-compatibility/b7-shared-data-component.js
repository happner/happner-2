describe('b7 - shared data component', function () {

  this.timeout(120000);

  var should = require('chai').should();

  var Mesh = require('happner');

  var Mesh2 = require('../..');

  var meshInstance;
  var dataEvents;
  var config;
  var expect = require('expect.js');

  var TestModule1 = {
    setSharedData: function ($happn, path, data, callback) {
      $happn.exchange.data.set(path, data, callback);
    }
  };

  var TestModule2 = {
    getSharedData: function ($happn, path, callback) {
      $happn.exchange.data.get(path, callback);
    }
  };

  var PORT = 9898;

  var test_id = Date.now() + '_' + require('shortid').generate();

  var adminClient = new Mesh.MeshClient({secure: true, port:PORT});

  before(function (done) {

    Mesh2.create(config = {
      happn:{
        port: PORT,
        secure: true,
        adminPassword: test_id
      },
      modules: {
        'module1': {
          instance: TestModule1
        },
        'module2': {
          instance: TestModule2
        }
      },

      components: {
        'data': {},
        'module1': {},
        'module2': {},
      }


    }).then(function (mesh) {

      meshInstance = mesh;
      dataComponent = mesh.exchange.data;
      dataEvents = mesh.event.data;

      var credentials = {
        username: '_ADMIN', // pending
        password: test_id
      };

      adminClient.login(credentials).then(done).catch(done);

    }).catch(done);
  });

  after(function (done) {
    meshInstance.stop({reconnect: false}, done);
  });

  context('happner-1 client to happner-2 data component', function () {

    it('can set and get with opts', function (done) {

      adminClient.exchange.data.set('some/path/one', {key: 'value'}, {}, function (e, result) {
        if (e) return done(e);
        adminClient.exchange.data.get('some/path/one', {}, function (e, result) {
          if (e) return done(e);
          result.key.should.equal('value');
          done();
        });
      });
    });


    it('can set and get without opts', function (done) {

      adminClient.exchange.data.set('some/path/two', {key: 'value'}, function (e, result) {
        if (e) return done(e);
        adminClient.exchange.data.get('some/path/two', function (e, result) {
          if (e) return done(e);
          result.key.should.equal('value');
          done();
        });
      });
    });

    it('can subscribe with opts', function (done) {

      adminClient.event.data.on('/some/path/three', function (data) {

        expect(data).to.eql({key: 'VAL'});
        done();
      }, function (e) {
        if (e) return done(e);
        adminClient.exchange.data.set('/some/path/three', {key: 'VAL'}, {}, function (e) {
          if (e) return done(e);
        })
      });
    });


    it('can subscribe without opts', function (done) {
      adminClient.event.data.on('/some/path/four', function (data) {

        expect(data).to.eql({key: 'VALUE'});
        done();
      }, function (e) {
        if (e) return done(e);
        adminClient.exchange.data.set('/some/path/four', {key: 'VALUE'}, function (e) {
          if (e) return done(e);
        })
      });
    });

    it('can unsubscribe', function (done) {
      var received = [];
      adminClient.event.data.on('/some/path/five', function (data) {
        received.push(data);
      }, function (e) {
        if (e) return done(e);
        adminClient.exchange.data.set('/some/path/five', {key: 1}) // <--------------- 1
          .then(function () {
            return adminClient.exchange.data.set('/some/path/five', {key: 1}) // <------ 2
          })
          .then(function () {
            return adminClient.event.data.off('/some/path/five') // <------------- unsub
          })
          .then(function () {
            return adminClient.exchange.data.set('/some/path/five', {key: 1}) // <------- 3
          })
          .then(function () {
            received.length.should.equal(2);
            done();
          })
          .catch(done)
      });
    })

    it('can delete', function (done) {
      adminClient.exchange.data.set('some/path/eight', 6)
        .then(function () {
          return adminClient.exchange.data.get('some/path/eight');
        })
        .then(function (six) {
          six.value.should.equal(6);
          return adminClient.exchange.data.remove('some/path/eight')
        })
        .then(function (res) {
          return adminClient.exchange.data.get('some/path/eight');
        })
        .then(function (res) {
          should.not.exist(res);
          done();
        })
        .catch(done)
    });

    it('can get paths', function (done) {
      require('bluebird').all([
          adminClient.exchange.data.set('this/one', 1),
          adminClient.exchange.data.set('this/two', 2),
          adminClient.exchange.data.set('this/three', 3),
        ])
        .then(function () {
          return adminClient.exchange.data.getPaths('this/*')
        })
        .then(function (paths) {
          paths.length.should.equal(3);
          done();
        })
        .catch(done);
    })

  });
});

