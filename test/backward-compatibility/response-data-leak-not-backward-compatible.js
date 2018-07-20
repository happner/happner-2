module.exports = SecuredComponent;

var DONE = false;

function SecuredComponent() {
}

SecuredComponent.prototype.method1 = function ($happn, options, callback) {
  options.methodName = 'method1';
  callback(null, options);
};

SecuredComponent.prototype.method2 = function ($happn, options, callback) {
  options.methodName = 'method2';
  callback(null, options);
};

SecuredComponent.prototype.method3 = function ($happn, options, callback) {
  options.methodName = 'method3';
  callback(null, options);
};

SecuredComponent.prototype.fireEvent = function ($happn, eventName, callback) {
  $happn.emit(eventName, eventName);
  callback(null, eventName + ' emitted');
};

SecuredComponent.prototype.webGetPutPost = function (req, res, next) {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({"method": req.method}));
};

SecuredComponent.prototype.webDelete = function (req, res, next) {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({"method": req.method}));
};

SecuredComponent.prototype.webAny = function (req, res, next) {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({"method": req.method}));
};

if (global.TESTING_F5) return; // When 'requiring' the module above,
// don't run the tests below
//.............
var SECURE = true;

describe(require('../__fixtures/utils/test_helper').create().testName(__filename), function () {

  var expect = require('expect.js');
  var mesh;
  var Mesh = require('../..');
  var adminClient = new Mesh.MeshClient({secure: true});
  var async = require('async');
  var filename = require('path').basename(__filename);
  var test_id = filename;
  var dbFileName = './temp/' + filename + '.nedb';

  this.timeout(120000);

  before(function (done) {

    try{
      require('fs').unlinkSync(dbFileName);

    }catch(e){}

    global.TESTING_F5 = true; //.............

    mesh = this.mesh = new Mesh();

    mesh.initialize({
      name: 'f5-responses-data-leak',
      directResponses:true,
      happn: {
        secure: SECURE,
        adminPassword: test_id
      },
      modules: {
        'SecuredComponent': {
          path: __filename
        }
      },
      components: {
        'SecuredComponent': {
          moduleName: 'SecuredComponent',
          schema: {
            exclusive: false,
            methods: {}
          },
          web: {
            routes: {
              "Web": ["webGetPutPost"],
              "WebDelete": ["webDelete"],
              "WebAny": ["webAny"],
            }
          }
        }
      }

    }, function (err) {

      if (err) return done(err);

      mesh.start(function (err) {

        if (err) {
          return done(err);
        }

        // Credentials for the login method
        var credentials = {
          username: '_ADMIN', // pending
          password: test_id
        };

        adminClient.login(credentials).then(function () {

          if (SECURE){

            createUser1(function(e){

              if (e) return done(e);

              createUser2(function(e){

                if (e) return done(e);
                done();
              });
            });
          }

        }).catch(done);

      });
    });
  });

  after(function (done) {
    delete global.TESTING_B4; //.............
    mesh.stop({reconnect: false}, done);
  });

  function createUser1 (done) {

    var testGroup = {
      name: 'GROUP1',

      custom_data: {
        customString: 'custom1',
        customNumber: 0
      },

      permissions: {
        methods: {
          'SecuredComponent/method1': {authorized: true, description: 'a test method'}
        }
      }
    };

    var testGroupSaved;
    var testUserSaved;

    adminClient.exchange.security.addGroup(testGroup, function (e, result) {

      if (e) return done(e);

      testGroupSaved = result;

      var testUser = {
        username: 'USER1',
        password: 'TEST PWD',
        custom_data: {
          something: 'useful'
        }
      };

      adminClient.exchange.security.addUser(testUser, function (e, result) {

        if (e) return done(e);

        expect(result.username).to.be(testUser.username);
        testUserSaved = result;

        adminClient.exchange.security.linkGroup(testGroupSaved, testUserSaved, done);
      });
    });
  }

  function createUser2 (done) {

    var testGroup = {
      name: 'GROUP2',

      custom_data: {
        customString: 'custom1',
        customNumber: 0
      },

      permissions: {
        methods: {
          'SecuredComponent/method1': {authorized: true, description: 'a test method'}
        }
      }
    };

    var testGroupSaved;
    var testUserSaved;

    adminClient.exchange.security.addGroup(testGroup, function (e, result) {

      if (e) return done(e);

      testGroupSaved = result;

      var testUser = {
        username: 'USER2',
        password: 'TEST PWD',
        custom_data: {
          something: 'useful'
        }
      };

      adminClient.exchange.security.addUser(testUser, function (e, result) {

        if (e) return done(e);

        expect(result.username).to.be(testUser.username);
        testUserSaved = result;

        adminClient.exchange.security.linkGroup(testGroupSaved, testUserSaved, done);
      });
    });
  }

  it('we log in with both users, then listen for responses on SecuredComponent/method1/* with user1, and then run user2\'s web method', function (done) {

    var credentials1 = {
      username: 'USER1', // pending
      password: 'TEST PWD'
    };

    var credentials2 = {
      username: 'USER2', // pending
      password: 'TEST PWD'
    };

    var user1Client = new Mesh.MeshClient({secure: true});
    var user2Client = new Mesh.MeshClient({secure: true});

    user1Client.login(credentials1).then(function () {

      user2Client.login(credentials2).then(function () {

        user1Client.data.on('/_exchange/responses/f5-responses-data-leak/SecuredComponent/method1/*', function(data){

          done(new Error('data was leaked on subscription path'));

        }, function(e){

          if (e){

            if (e.toString() === 'Error: wildcard listens on _exchange responses are forbidden, bad path: /_exchange/responses/f5-responses-data-leak/SecuredComponent/method1/*')
              return done();

            return done(e);
          }

          user2Client.exchange.SecuredComponent.method1({value:1}, function(e, response){
            setTimeout(done, 1000);//give user1Client a chance to fail
          });
        });

      }).catch(function(e){
        done(e);
      });

    }).catch(function(e){
      done(e);
    });

  });

  it('we log in with both users, then run web method for both users, negative check', function (done) {

    var credentials1 = {
      username: 'USER1', // pending
      password: 'TEST PWD'
    };

    var credentials2 = {
      username: 'USER2', // pending
      password: 'TEST PWD'
    };

    var user1Client = new Mesh.MeshClient({secure: true});
    var user2Client = new Mesh.MeshClient({secure: true});

    user1Client.login(credentials1).then(function () {

      user2Client.login(credentials2).then(function () {

        user2Client.exchange.SecuredComponent.method1({value:1}, function(e, response){
          user1Client.exchange.SecuredComponent.method1({value:1}, function(e, response){
            setTimeout(done, 1000);//give user1Client a chance to fail
          });
        });

      }).catch(function(e){
        done(e);
      });

    }).catch(function(e){
      done(e);
    });

  });

});
