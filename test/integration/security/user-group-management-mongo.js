module.exports = TestMesh;

function TestMesh() {
}

TestMesh.prototype.method1 = function ($happn, options, callback) {
  options.methodName = 'method1';
  callback(null, options);
};

if (global.TESTING_USER_MANAGEMENT) return; // When 'requiring' the module above.

describe(require('../../__fixtures/utils/test_helper').create().testName(__filename, 3), function () {

  this.timeout(120000);

  var expect = require('expect.js');
  require('chai').should();
  var mesh;
  var Mesh = require('../../..');

  var adminClient = new Mesh.MeshClient({secure: true, port: 8003});
  var test_id = Date.now() + '_' + require('shortid').generate();

  let DB_NAME = 'test-happner-2-user-group-management';
  let COLL_NAME = 'test-happner-2-user-group-management-coll';

  before('should clear the mongo collection', async() => {
    let dropMongoDb = require('../../__fixtures/utils/drop-mongo-db');
    await dropMongoDb(DB_NAME);
  });

  before(function (done) {

    global.TESTING_USER_MANAGEMENT = true; //.............

    mesh = this.mesh = new Mesh();

    mesh.initialize({
      name: 'user-management',
      happn: {
        secure: true,
        adminPassword: test_id,
        port: 8003,
        services:{
          data: {
            config: {
              autoUpdateDBVersion: true,
              datastores: [{
                name: 'mongo',
                provider:'happn-service-mongo-2',
                isDefault: true,
                settings: {
                  database: DB_NAME,
                  collection: COLL_NAME
                }
              }]
            }
          }
        }
      },
      modules: {
        'TestMesh': {
          path: __filename
        }
      },
      components: {
        'TestMesh': {
          moduleName: 'TestMesh',
          schema: {
            exclusive: false,
            methods: {}
          }
        }
      }

    }, function (err) {
      if (err) return done(err);
      mesh.start(function (err) {
        if (err) {
          return done(err);
        }
        var credentials = {
          username: '_ADMIN',
          password: test_id
        };
        adminClient.login(credentials).then(function () {
          done();
        }).catch(done);
      });
    });
  });

  after(function (done) {
    delete global.TESTING_USER_MANAGEMENT;
    adminClient.disconnect(()=>{
      mesh.stop({reconnect: false}, done);
    });
  });

  it('adds a test user, modifies the users password with the admin user, logs in with the test user', function (done) {

    var testGroup = {
      name: 'TESTGROUP1' + test_id,
      custom_data: {
        customString: 'custom1',
        customNumber: 0
      },
      permissions: {
        methods: {}
      }
    };

    var testGroupSaved;
    var testUserSaved;
    var testUserClient;

    adminClient.exchange.security.addGroup(testGroup, function (e, result) {

      if (e) return done(e);

      testGroupSaved = result;

      var testUser = {
        username: 'TESTUSER1' + test_id,
        password: 'TEST PWD',
        custom_data: {
          something: 'useful'
        }
      };

      adminClient.exchange.security.addUser(testUser, function (e, result) {

        if (e) return done(e);

        expect(result.username).to.be(testUser.username);
        testUserSaved = result;

        adminClient.exchange.security.linkGroup(testGroupSaved, testUserSaved, function (e) {
          if (e) return done(e);

          testUser.password = 'NEW PWD';
          testUser.custom_data = {changedCustom: 'changedCustom'};

          adminClient.exchange.security.updateUser(testUser, function (e) {
            if (e) return done(e);
            testUserClient = new Mesh.MeshClient({secure: true, port: 8003});
            return testUserClient.login(testUser).then(done).catch(done);
          });
        });
      });
    });
  });

  it('adds a test user, logs in with the test user - modifies the users password, fetches modified user and ensures oldPassword is not present', function (done) {

    var testGroup = {

      name: 'TESTGROUP2' + test_id,

      custom_data: {
        customString: 'custom1',
        customNumber: 0
      },

      permissions: {
        methods: {}
      }
    };

    var testGroupSaved;
    var testUserSaved;
    var testUserClient;

    adminClient.exchange.security.addGroup(testGroup, function (e, result) {

      if (e) return done(e);

      testGroupSaved = result;

      var testUser = {
        username: 'TESTUSER2' + test_id,
        password: 'TEST PWD',
        custom_data: {
          something: 'useful'
        }
      };

      adminClient.exchange.security.addUser(testUser, function (e, result) {

        if (e) return done(e);

        expect(result.username).to.be(testUser.username);
        testUserSaved = result;

        adminClient.exchange.security.linkGroup(testGroupSaved, testUserSaved, function (e) {
          if (e) return done(e);

          testUserClient = new Mesh.MeshClient({secure: true, port: 8003});

          testUserClient.login(testUser).then(function () {

            testUser.oldPassword = 'TEST PWD';
            testUser.password = 'NEW PWD';
            testUser.custom_data = {changedCustom: 'changedCustom'};

            testUserClient.exchange.security.updateOwnUser(testUser, function (e, result) {

              if (e) return done(e);
              expect(result.custom_data.changedCustom).to.be('changedCustom');
              testUserClient.login(testUser).then(function(){

                adminClient.exchange.security.getUser(testUser.username)
                  .then(function(fetchedUser){

                    expect(fetchedUser.oldPassword).to.be(undefined);

                    done();
                  });

              }).catch(done);
            });

          }).catch(function (e) {
            done(e);
          });
        });
      });
    });

  });

  it('adds a test user, logs in with the test user - fails to modify the user using updateUser on another user', function (done) {

    var testGroup = {
      name: 'TESTGROUP3' + test_id,

      custom_data: {
        customString: 'custom1',
        customNumber: 0
      },

      permissions: {
        methods: {}
      }
    };

    var testGroupSaved;
    var testUserSaved;
    var testUserClient;

    adminClient.exchange.security.addGroup(testGroup, function (e, result) {

      if (e) return done(e);

      testGroupSaved = result;

      var testUser = {
        username: 'TESTUSER3' + test_id,
        password: 'TEST PWD',
        custom_data: {
          something: 'useful'
        }
      };

      adminClient.exchange.security.addUser(testUser, function (e, result) {

        if (e) return done(e);

        expect(result.username).to.be(testUser.username);
        testUserSaved = result;

        adminClient.exchange.security.linkGroup(testGroupSaved, testUserSaved, function (e) {

          if (e) return done(e);

          testUserClient = new Mesh.MeshClient({secure: true, port: 8003});

          testUserClient.login(testUser).then(function () {

            testUser.oldPassword = 'TEST PWD';
            testUser.password = 'NEW PWD';
            testUser.custom_data = {changedCustom: 'changedCustom'};

            testUserClient.exchange.security.updateUser(testUser, function (e) {
              expect(e.toString()).to.be('AccessDenied: unauthorized');
              done();
            });
          }).catch(function (e) {
            done(e);
          });
        });
      });
    });
  });

  it('adds a test user, logs in with the test user - fails to modify the password, as old password was not included', function (done) {

    var testGroup = {
      name: 'TESTGROUP4' + test_id,

      custom_data: {
        customString: 'custom1',
        customNumber: 0
      },

      permissions: {
        methods: {}
      }
    };

    var testGroupSaved;
    var testUserSaved;
    var testUserClient;

    adminClient.exchange.security.addGroup(testGroup, function (e, result) {

      if (e) return done(e);

      testGroupSaved = result;

      var testUser = {
        username: 'TESTUSER4' + test_id,
        password: 'TEST PWD',
        custom_data: {
          something: 'useful'
        }
      };

      adminClient.exchange.security.addUser(testUser, function (e, result) {

        if (e) return done(e);

        expect(result.username).to.be(testUser.username);
        testUserSaved = result;

        adminClient.exchange.security.linkGroup(testGroupSaved, testUserSaved, function (e) {

          if (e) return done(e);

          testUserClient = new Mesh.MeshClient({secure: true, port: 8003});

          testUserClient.login(testUser).then(function () {

            testUser.password = 'NEW PWD';
            testUser.custom_data = {changedCustom: 'changedCustom'};

            testUserClient.exchange.security.updateOwnUser(testUser, function (e) {
              expect(e.toString()).to.be('Error: missing oldPassword parameter');
              done();
            });
          }).catch(function (e) {
            done(e);
          });
        });
      });
    });
  });

  it('adds a test user, logs in with the test user - fails to modify the password, as old password does not match the current one', function (done) {

    var testGroup = {
      name: 'TESTGROUP5' + test_id,

      custom_data: {
        customString: 'custom1',
        customNumber: 0
      },

      permissions: {
        methods: {}
      }
    };

    var testGroupSaved;
    var testUserSaved;
    var testUserClient;

    adminClient.exchange.security.addGroup(testGroup, function (e, result) {

      if (e) return done(e);

      testGroupSaved = result;

      var testUser = {
        username: 'TESTUSER5' + test_id,
        password: 'TEST PWD',
        custom_data: {
          something: 'useful'
        }
      };

      adminClient.exchange.security.addUser(testUser, function (e, result) {

        if (e) return done(e);

        expect(result.username).to.be(testUser.username);
        testUserSaved = result;

        adminClient.exchange.security.linkGroup(testGroupSaved, testUserSaved, function (e) {

          if (e) return done(e);

          testUserClient = new Mesh.MeshClient({secure: true, port: 8003});

          testUserClient.login(testUser).then(function () {

            testUser.oldPassword = 'NEW PWD';
            testUser.password = 'NEW PWD';
            testUser.custom_data = {changedCustom: 'changedCustom'};

            testUserClient.exchange.security.updateOwnUser(testUser, function (e) {
              expect(e.toString()).to.be('Error: old password incorrect');
              done();
            });
          }).catch(function (e) {
            done(e);
          });
        });
      });
    });
  });

  it('adds a test user, logs in with the test user - modifies the user details without the users password changing', function (done) {

    var testGroup = {
      name: 'TESTGROUP6' + test_id,

      custom_data: {
        customString: 'custom1',
        customNumber: 0
      },

      permissions: {
        methods: {}
      }
    };

    var testGroupSaved;
    var testUserSaved;
    var testUserClient;

    adminClient.exchange.security.addGroup(testGroup, function (e, result) {

      if (e) return done(e);

      testGroupSaved = result;

      var testUser = {
        username: 'TESTUSER6' + test_id,
        password: 'TEST PWD',
        custom_data: {
          something: 'useful'
        },
        application_data: {
          something: 'sacred'
        }
      };

      adminClient.exchange.security.addUser(testUser, function (e, result) {

        if (e) return done(e);

        expect(result.username).to.be(testUser.username);
        testUserSaved = result;
        adminClient.exchange.security.linkGroup(testGroupSaved, testUserSaved, function (e) {

          if (e) return done(e);
          testUserClient = new Mesh.MeshClient({secure: true, port: 8003});
          testUserClient.login(testUser).then(function () {
            delete testUser.password;
            testUser.custom_data = {changedCustom: 'changedCustom'};
            testUser.application_data = {something: 'profane'};
            testUserClient.exchange.security.updateOwnUser(testUser, function (e, result) {
              if (e) return done(e);
              expect(result.custom_data.changedCustom).to.be('changedCustom');
              expect(result.application_data.something).to.be('sacred');
              testUserClient.login({username: testUser.username, password: 'TEST PWD'}).then(done).catch(function(e){
                if (e) return done(e);
                adminClient.getUser(testUser.username, function(e){
                  if (e) return done(e);
                  expect(result.application_data.something).to.be('sacred');
                  testUser.application_data = {something: 'profane'};
                  adminClient.exchange.security.updateUser(testUser, function (e, result) {
                    if (e) return done(e);
                    expect(result.application_data.something).to.be('profane');
                    adminClient.getUser(testUser.username, function(e){
                      if (e) return done(e);
                      expect(result.application_data.something).to.be('profane');
                      done();
                    });
                  });
                });
              });
            });
          }).catch(function (e) {
            done(e);
          });
        });
      });
    });
  });

  it('adds a test user, we fetch the user using the listUsersByGroup method', function (done) {

    var testGroup = {
      name: 'TESTGROUP7' + test_id,
      custom_data: {
        customString: 'custom1',
        customNumber: 0
      },
      permissions: {
        methods: {}
      }
    };

    var testGroupSaved;
    var testUserSaved;

    adminClient.exchange.security.addGroup(testGroup, function (e, result) {

      if (e) return done(e);

      testGroupSaved = result;

      var testUser = {
        username: 'TESTUSER7' + test_id,
        password: 'TEST PWD',
        custom_data: {
          something: 'useful',
          extra:8
        }
      };

      var steps = [];

      adminClient.exchange.security.addUser(testUser, function (e, result) {

        if (e) return done(e);
        expect(result.username).to.be(testUser.username);
        testUserSaved = result;

        adminClient.exchange.security.linkGroup(testGroupSaved, testUserSaved, function (e) {

          if (e) return done(e);
          adminClient.exchange.security.listUsersByGroup('TESTGROUP7' + test_id)
            .then(function(users){
              expect(users.length).to.be(1);
              expect(users[0].username).to.be('TESTUSER7' + test_id);
              expect(users[0].custom_data).to.eql({
                something: 'useful',
                extra:8
              });
              steps.push(1);
              return adminClient.exchange.security.listUsersByGroup('TESTGROUP7' + test_id, {criteria:{'custom_data.extra':8}});
            })
            .then(function(users){
              expect(users.length).to.be(1);
              expect(users[0].username).to.be('TESTUSER7' + test_id);
              expect(users[0].custom_data).to.eql({
                something: 'useful',
                extra:8
              });
              steps.push(2);
              return adminClient.exchange.security.listUsersByGroup('TESTGROUP50' + test_id);
            })
            .then(function(users){
              expect(users.length).to.be(0);
              steps.push(3);
              return adminClient.exchange.security.listUsersByGroup('TESTGROUP7' + test_id, {criteria:{'custom_data.extra':9}});
            })
            .then(function(users){
              expect(users.length).to.be(0);
              steps.push(4);
              return adminClient.exchange.security.listUserNamesByGroup('TESTGROUP7' + test_id);
            })
            .then(function(usernames){
              expect(usernames.length).to.be(1);
              expect(usernames[0]).to.be('TESTUSER7' + test_id);
              steps.push(5);
              return adminClient.exchange.security.listUsersByGroup(null);
            })
            .catch(function(e){
              expect(e.toString()).to.be('Error: validation error: groupName must be specified');
              expect(steps.length).to.be(5);
              done();
            });
        });
      });
    });
  });

  it('tests the listUsers method with and without criteria', async () => {

    await adminClient.exchange.security.addUser({
      username: 'TESTUSER_LIST1',
      password: 'TEST PWD',
      custom_data: {
        something: 'useful'
      }
    });

    await adminClient.exchange.security.addUser({
      username: 'TESTUSER_LIST2',
      password: 'TEST PWD',
      custom_data: {
        something: 'useful'
      }
    });

    await adminClient.exchange.security.addUser({
      username: 'TESTUSER_LIST3',
      password: 'TEST PWD',
      custom_data: {
        something: 'else'
      }
    });

    await adminClient.exchange.security.addUser({
      username: 'TESTUSER_LIST4',
      password: 'TEST PWD',
      custom_data: {
        something: 'else'
      }
    });

    let usersFiltered = await adminClient.exchange.security.listUsers('TESTUSER_LIST*', {
      criteria:{
        "custom_data.something":{$eq:"useful"}
      }
    });

    let usersUnFiltered = await adminClient.exchange.security.listUsers('TESTUSER_LIST*');

    expect(usersFiltered.length).to.be(2);
    expect(usersUnFiltered.length).to.be(4);
  });

  it('tests the listGroups method with and without criteria', async () => {
    await adminClient.exchange.security.addGroup({
      name: 'TESTGROUP_LIST1',
      custom_data: {
        something: 'useful'
      },
      permissions: {
        methods: {}
      }
    });

    await adminClient.exchange.security.addGroup({
      name: 'TESTGROUP_LIST2',
      custom_data: {
        something: 'useful'
      },
      permissions: {
        methods: {}
      }
    });

    await adminClient.exchange.security.addGroup({
      name: 'TESTGROUP_LIST3',
      custom_data: {
        something: 'else'
      },
      permissions: {
        methods: {}
      }
    });

    await adminClient.exchange.security.addGroup({
      name: 'TESTGROUP_LIST4',
      custom_data: {
        something: 'else'
      },
      permissions: {
        methods: {}
      }
    });

    let groupsFiltered = await adminClient.exchange.security.listGroups('TESTGROUP_LIST*', {
      criteria:{
        "custom_data.something":{$eq:"useful"}
      }
    });

    let groupsUnFiltered = await adminClient.exchange.security.listGroups('TESTGROUP_LIST*');

    expect(groupsUnFiltered.length).to.be(4);
    expect(groupsFiltered.length).to.be(2);
  });

  it('should get groups matching special criteria with limit, skip and count', async () => {

    await adminClient.exchange.security.addGroup({
      name: 'TESTGROUP_SEARCH1',
      custom_data: {
        cadre: 0
      },
      permissions: {
        methods: {}
      }
    });

    await adminClient.exchange.security.addGroup({
      name: 'TESTGROUP_SEARCH2',
      custom_data: {
        cadre: 0
      },
      permissions: {
        methods: {}
      }
    });

    await adminClient.exchange.security.addGroup({
      name: 'TESTGROUP_SEARCH3',
      custom_data: {
        cadre: 1
      },
      permissions: {
        methods: {}
      }
    });

    await adminClient.exchange.security.addGroup({
      name: 'TESTGROUP_SEARCH4',
      custom_data: {
        cadre: 2
      },
      permissions: {
        methods: {}
      }
    });

    let results1 = await adminClient.exchange.security.listGroups(
      'TESTGROUP_SEARCH*',
      {
        criteria: {
          'custom_data.cadre': { $gt: 0 }
        },
        limit: 1
      }
    );

    let results2 = await adminClient.exchange.security.listGroups(
      'TESTGROUP_SEARCH*',
      {
        criteria: {
          'custom_data.cadre': { $gt: 0 }
        },
        skip: 1
      }
    );

    let resultscontrol = await adminClient.exchange.security.listGroups(
      'TESTGROUP_SEARCH*',
      {
        criteria: {
          'custom_data.cadre': { $gt: 0 }
        }
      }
    );

    let results3 = await adminClient.exchange.security.listGroups(
      'TESTGROUP_SEARCH*',
      {
        criteria: {
          'custom_data.cadre': { $gt: 0 }
        },
        count: true
      }
    );

    expect(results1.length).to.be(1);
    expect(results2.length).to.be(1);
    expect(resultscontrol.length).to.be(2);

    expect(results3.value).to.be(2);
  });

  it('should get users matching special criteria with limit, skip and count', async () => {

    await adminClient.exchange.security.addUser({
      username: 'TESTUSER_SEARCH1',
      password: 'TEST PWD',
      custom_data: {
        cadre: 0
      }
    });

    await adminClient.exchange.security.addUser({
      username: 'TESTUSER_SEARCH2',
      password: 'TEST PWD',
      custom_data: {
        cadre: 0
      }
    });

    await adminClient.exchange.security.addUser({
      username: 'TESTUSER_SEARCH3',
      password: 'TEST PWD',
      custom_data: {
        cadre: 1
      }
    });

    await adminClient.exchange.security.addUser({
      username: 'TESTUSER_SEARCH4',
      password: 'TEST PWD',
      custom_data: {
        cadre: 2
      }
    });

    let results1 = await adminClient.exchange.security.listUsers(
      'TESTUSER_SEARCH*',
      {
        criteria: {
          'custom_data.cadre': { $gt: 0 }
        },
        limit: 1
      }
    );

    let results2 = await adminClient.exchange.security.listUsers(
      'TESTUSER_SEARCH*',
      {
        criteria: {
          'custom_data.cadre': { $gt: 0 }
        },
        skip: 1
      }
    );

    let resultscontrol = await adminClient.exchange.security.listUsers(
      'TESTUSER_SEARCH*',
      {
        criteria: {
          'custom_data.cadre': { $gt: 0 }
        }
      }
    );

    let results3 = await adminClient.exchange.security.listUsers(
      'TESTUSER_SEARCH*',
      {
        criteria: {
          'custom_data.cadre': { $gt: 0 }
        },
        count: true
      }
    );

    expect(results1.length).to.be(1);
    expect(results2.length).to.be(1);
    expect(resultscontrol.length).to.be(2);

    expect(results3.value).to.be(2);
  });

  it('should get users matching special criteria and collation', async () => {

    await adminClient.exchange.security.addUser({
      username: 'TEST_user_COLLATION1',
      password: 'TEST PWD',
      custom_data: {
        cadre: 0
      }
    });

    await adminClient.exchange.security.addUser({
      username: 'TEST_USER_COLLATION1',
      password: 'TEST PWD',
      custom_data: {
        cadre: 0
      }
    });

    let results1 = await adminClient.exchange.security.listUsers(
      '*',
      {
        criteria: {
          'username': 'TEST_USER_COLLATION1'
        },
        collation:{
          locale: 'en_US',
          strength: 1
        }
      }
    );

    let results2 = await adminClient.exchange.security.listUsers(
      '*',
      {
        criteria: {
          'username': 'TEST_USER_COLLATION1'
        }
      }
    );

    expect(results1.length).to.be(2);
    expect(results2.length).to.be(1);
  });
});
