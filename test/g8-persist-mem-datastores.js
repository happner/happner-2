describe(require('path').basename(__filename), function () {

  this.timeout(30000);

  var expect = require('expect.js');

  var TestHelper = require('./helpers/test_helper');

  var helper = new TestHelper();

  var __testFileName = helper.newTestFile({name:'g8-persist-mem-datastores'});

  var config = {
    happn:{
      port:55000,
      name:'g8-persist-mem-datastores',
      secure:true,
      services:{
        data:{
          config:{
            filename:__testFileName
          }
        }
      }
    },
    __testOptions:{
      getClient:true
    },
    modules:{
      persistComponent:{
        instance: {
          writeData : function($happn, options, callback){

            $happn.data.set(options.path, options.data, {}, function (e, response) {

              return callback(e, response)
            });
          }
        }
      }
    },
    components:{
      persistComponent:{
        data: {
          routes: {
            "persist/*": "persist",
            "mem/*": "mem"
          }
        }
      }
    }
  };

  before('should initialize the helper with services', function (done) {

    helper.startUp([
      config
    ], done);
  });

  after('tears down all services and clients', function (done) {

    helper.tearDown(done);
  });

  it('checks the default datastores are in place', function (done) {

    var service = helper.findService('g8-persist-mem-datastores');

    var happnServer = service.instance._mesh.happn.server;

    expect(happnServer.services.data.datastores.mem).to.not.be(null);

    expect(happnServer.services.data.dataroutes['/_data/persistComponent/mem/*'].provider.db.inMemoryOnly).to.be(true);

    expect(happnServer.services.data.dataroutes['/_data/persistComponent/persist/*'].provider.db.filename).to.be(__testFileName);

    done();
  });

  it('writes to mem path, and then to persist path, ensures the data is in the right places', function (done) {

    var service = helper.findService('g8-persist-mem-datastores');

    service.instance.exchange.persistComponent.writeData({
      path:'persist/some/data',
      data:{data:'isPersisted'}
    }, function(e, response){

      if (e) return done(e);

      var record = helper.getRecordFromSmallFile({filename:__testFileName, dataPath:'/_data/persistComponent/persist/some/data'});

      expect(record.data.data).to.be('isPersisted');

      service.instance.exchange.persistComponent.writeData({
        path:'mem/some/data',
        data:{data:'isVolatile'}
      }, function(e, response){

        if (e) return done(e);

        helper.getRecordFromHappn({instanceName:'g8-persist-mem-datastores', dataPath:'/_data/persistComponent/mem/some/data'}, function(e, record){

          expect(record.data).to.be('isVolatile');

          var notFoundRecord = helper.getRecordFromSmallFile({filename:__testFileName, dataPath:'/_data/persistComponent/mem/some/data'});

          expect(notFoundRecord).to.be(null);

          done();
        });
      });
    });

  });
});
