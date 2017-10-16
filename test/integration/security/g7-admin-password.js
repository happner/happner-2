describe(require('path').basename(__filename), function () {

  this.timeout(30000);

  var expect = require('expect.js');

  var TestHelper = require('./helpers/test_helper');

  var helper = new TestHelper();

  var __testFileName1 = helper.newTestFile({name:'g7-admin-password-1'});

  var __testFileName2 = helper.newTestFile({name:'g7-admin-password-2'});

  var config1 = {
    happn:{
      port:55001,
      name:'g7-admin-password-1',
      secure:true,
      services:{
        security:{
          config:{
            adminUser:{
              password:'initialPassword'
            }
          }
        },
        data:{
          config:{
            filename:__testFileName1
          }
        }
      }
    },
    __testOptions:{
      getClient:true
    }
  };

  var config2 = {
    happn:{
      port:55002,
      name:'g7-admin-password-2',
      secure:true,
      services:{
        security:{
          config:{
            adminUser:{
              password:'initialPassword'
            }
          }
        },
        data:{
          config:{
            filename:__testFileName2
          }
        }
      }
    },
    __testOptions:{
      getClient:true
    }
  };

  before('should initialize the helper with services', function (done) {

    helper.startUp([
      config1,
      config2
    ], done);
  });

  after('tears down all services and clients', function (done) {

    helper.tearDown(done);
  });

  it('changes the admin password, then restarts the service - we check the new admin password is still in place', function (done) {

    helper.getClient({name:'g7-admin-password-1'}, function(e, client){

      if (e) return done(e);

      helper.disconnectClient(client.id, function(e){

        if (e) return done(e);

        var service =  helper.findService({id:'g7-admin-password-1'});

        try{

          service.instance.exchange.security.upsertUser({username:'_ADMIN', password:'modifiedPassword'}, function(e){

            if (e) return done(e);

            helper.restartService({id:'g7-admin-password-1'}, function(e){

              expect(e.toString()).to.be('AccessDenied: Invalid credentials');

              console.log('OK AND...');

              config1.happn.services.security.config.adminUser.password = 'modifiedPassword';

              helper.getService(config1, function(e){

                if (e) return done(e);

                helper.getClient({name:'g7-admin-password-1', username:'_ADMIN', password:'modifiedPassword'}, done);
              });
            });
          });
        }catch(e){
          done(e);
        }
      });
    });
  });

  it('restarts the service without changing the password - all should be ok', function (done) {

    helper.getClient({name:'g7-admin-password-2'}, function(e, client){

      if (e) return done(e);

      helper.disconnectClient(client.id, function(e){

        if (e) return done(e);

        try{

          helper.restartService({id:'g7-admin-password-2'}, done);
        }catch(e){
          done(e);
        }
      });
    });
  });
});
