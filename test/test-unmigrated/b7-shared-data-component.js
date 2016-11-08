describe('b7 - shared data component', function () {

  this.timeout(120000);

  require('benchmarket').start();
  after(require('benchmarket').store());

  var should = require('chai').should();
  var Mesh = require('../');
  var meshInstance;
  var dataEvents;
  var config;
  var expect = require('expect.js');
  var TestModule1 = {
    setSharedData: function ($happn, path, data, callback) {
      $happn.exchange.data.set(path, data, callback);
    }
  }

  var TestModule2 = {
    getSharedData: function ($happn, path, callback) {
      $happn.exchange.data.get(path, callback);
    }
  }

  before(function (done) {
    var _this = this;
    Mesh.create(config = {
      port: 9898,
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
      done();
    }).catch(done);
  });

  after(function (done) {
    meshInstance.stop({reconnect: false}, done);
  });

  context('direct use', function () {

    it('can set and get with opts', function (done) {
      dataComponent.set('some/path/one', {key: 'value'}, {}, function (e, result) {
        if (e) return done(e);
        dataComponent.get('some/path/one', {}, function (e, result) {
          if (e) return done(e);
          result.key.should.equal('value');
          done();
        });
      });
    });


    it('can set and get without opts', function (done) {

      dataComponent.set('some/path/two', {key: 'value'}, function (e, result) {
        if (e) return done(e);
        dataComponent.get('some/path/two', function (e, result) {
          if (e) return done(e);
          result.key.should.equal('value');
          done();
        });
      });
    });

    it('can subscribe with opts', function (done) {

      dataComponent.on('/some/path/three', {}, function (data, meta) {
        data.should.eql({key: 'VAL'});
        done();
      }, function (e) {
        if (e) return done(e);
        dataComponent.set('/some/path/three', {key: 'VAL'}, {}, function (e) {
          if (e) return done(e);
        })
      });
    });


    it('can subscribe without opts', function (done) {
      dataComponent.on('/some/path/four', function (data, meta) {
        data.should.eql({key: 'VALUE'});
        done();
      }, function (e) {
        if (e) return done(e);
        dataComponent.set('/some/path/four', {key: 'VALUE'}, function (e) {
          if (e) return done(e);
        })
      });
    });

    it('should subscribe and get an initial value on the callback', function (callback) {

      dataComponent.set('/b7/testsubscribe/data/value_on_callback_test', {"test": "data"}, function (e) {
        if (e) return callback(e);

        dataComponent.on('/b7/testsubscribe/data/value_on_callback_test', {
          "event_type": "set",
          "initialCallback": true
        }, function (message) {

          expect(message.updated).to.be(true);
          callback();

        }, function (e, reference, response) {
          if (e) return callback(e);
          try {

            expect(response.length).to.be(1);
            expect(response[0].test).to.be('data');

            dataComponent.set('/b7/testsubscribe/data/value_on_callback_test', {
              "test": "data",
              "updated": true
            }, function (e) {
              if (e) return callback(e);
            });

          } catch (e) {
            return callback(e);
          }
        });

      });

    });

    it('should subscribe and get initial values on the callback', function (callback) {

      dataComponent.set('/b7/testsubscribe/data/values_on_callback_test/1', {"test": "data"}, function (e) {
        if (e) return callback(e);

        dataComponent.set('/b7/testsubscribe/data/values_on_callback_test/2', {"test": "data1"}, function (e) {
          if (e) return callback(e);

          dataComponent.on('/b7/testsubscribe/data/values_on_callback_test/*', {
            "event_type": "set",
            "initialCallback": true
          }, function (message) {

            expect(message.updated).to.be(true);
            callback();

          }, function (e, reference, response) {
            if (e) return callback(e);
            try {

              expect(response.length).to.be(2);
              expect(response[0].test).to.be('data');
              expect(response[1].test).to.be('data1');

              dataComponent.set('/b7/testsubscribe/data/values_on_callback_test/1', {
                "test": "data",
                "updated": true
              }, function (e) {
                if (e) return callback(e);
              });

            } catch (e) {
              return callback(e);
            }
          });
        });
      });
    });

    it('should subscribe and get initial values emitted immediately', function (callback) {

      var caughtEmitted = 0;

      dataComponent.set('/b7/testsubscribe/data/values_emitted_test/1', {"test": "data"}, function (e) {
        if (e) return callback(e);

        dataComponent.set('/b7/testsubscribe/data/values_emitted_test/2', {"test": "data1"}, function (e) {
          if (e) return callback(e);

          dataComponent.on('/b7/testsubscribe/data/values_emitted_test/*', {
            "event_type": "set",
            "initialEmit": true
          }, function (message, meta) {

            caughtEmitted++;

            if (caughtEmitted == 2) {
              expect(message.test).to.be("data1");
              callback();
            }

          }, function (e) {
            if (e) return callback(e);
          });
        });
      });
    });

    it('can unsubscribe', function (done) {
      var received = [];
      dataComponent.on('/some/path/five', function (data, meta) {
        received.push(data);
      }, function (e) {
        if (e) return done(e);
        dataComponent.set('/some/path/five', {key: 1}) // <--------------- 1
          .then(function () {
            return dataComponent.set('/some/path/five', {key: 1}) // <------ 2
          })
          .then(function () {
            return dataComponent.off('/some/path/five') // <------------- unsub
          })
          .then(function () {
            return dataComponent.set('/some/path/five', {key: 1}) // <------- 3
          })
          .then(function () {
            received.length.should.equal(2);
            done();
          })
          .catch(done)
      });
    })

    it('can unsubscribe from all', function (done) {
      var received = [];
      dataComponent.on('/some/path/six', function (data, meta) {
        received.push(data);
      }, function (e) {
        if (e) return done(e);
        dataComponent.set('/some/path/six', {key: 1}) // <--------------- 1
          .then(function () {
            return dataComponent.set('/some/path/six', {key: 1}) // <------ 2
          })
          .then(function(){
           return dataComponent.offAll()
          })
          .then(function () {
            return dataComponent.set('/some/path/six', {key: 1}) // <------- 3
          })
          .then(function () {
            received.length.should.equal(2);
            done();
          })
          .catch(done)
      });
    });

    it('can unsubscribe from a path', function (done) {
      var received = [];
      dataComponent.on('/some/path/seven', function (data, meta) {
        received.push(data);
      }, function (e) {
        if (e) return done(e);
        dataComponent.set('/some/path/seven', {key: 1}) // <--------------- 1
          .then(function () {
            return dataComponent.set('/some/path/seven', {key: 1}) // <------ 2
          })
          .then(function(){
            return dataComponent.offPath('/some/path/seven');
          })
          .then(function () {
            return dataComponent.set('/some/path/seven', {key: 1}) // <------- 3
          })
          .then(function () {
            received.length.should.equal(2);
            done();
          })
          .catch(done)
      });
    })

    it('can delete', function (done) {
      dataComponent.set('some/path/eight', 6)
        .then(function () {
          return dataComponent.get('some/path/eight');
        })
        .then(function (six) {
          six.value.should.equal(6);
          return dataComponent.remove('some/path/eight')
        })
        .then(function (res) {
          return dataComponent.get('some/path/eight');
        })
        .then(function (res) {
          should.not.exist(res);
          done();
        })
        .catch(done)
    });

    it('can get paths', function (done) {
      require('bluebird').all([
          dataComponent.set('this/one', 1),
          dataComponent.set('this/two', 2),
          dataComponent.set('this/three', 3),
        ])
        .then(function () {
          return dataComponent.getPaths('this/*')
        })
        .then(function (paths) {
          paths.length.should.equal(3);
          done();
        })
        .catch(done);
    })

    it('can subscribe to data change with events', function (done) {

      dataEvents.on('/some/path/five', function (data) {

        data.should.property('key', 'VALUE');
        dataEvents.off('/some/path/five', function (data, meta) {
          done();
        });

      }, function (e) {
        if (e) return done(e);
        dataComponent.set('/some/path/five', {key: 'VALUE'}, function (e) {
          if (e) return done(e);
        })
      });
    })

  });


  context('shared use', function () {

    it('can set from one component and getted from another', function (done) {
      meshInstance.exchange.module1.setSharedData('/my/thing', {'y': 'x'})
        .then(function () {
          return meshInstance.exchange.module2.getSharedData('/my/thing')
        })
        .then(function (d) {
          d.y.should.equal('x');
          done();
        })
        .catch(done);
    });

  });

  require('benchmarket').stop();

});

