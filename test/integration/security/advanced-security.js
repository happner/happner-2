var path = require('path');

describe(require('../../__fixtures/utils/test_helper').create().testName(__filename, 3), function () {

  var Promise = require('bluebird');

  var request = Promise.promisify(require('request'));

  this.timeout(15000);

  var expect = require('expect.js');

  var Mesh = require('../../..');

  var test_id = Date.now() + '_' + require('shortid').generate();

  var should = require('chai').should();

  var dbFileName = '.' + path.sep + 'temp' + path.sep + 'b1-advanced-security' + test_id + '.nedb';

  var fs = require('fs-extra');

  var mesh = new Mesh();

  var DELETEFILE = false;

  var config = {
    name: "meshname",
    happn: {
      secure: true,
      adminPassword: test_id,
      filename: dbFileName
    },
    modules: {
      'module': {
        instance: {
          method1: function ($happn, callback) {
            $happn.emit('event1');
            callback(null, 'reply1');
          },
          method2: function ($happn, callback) {
            $happn.emit('event2');
            callback(null, 'reply2');
          },
          webmethod1: function (req, res) {
            res.end('ok1');
          },
          webmethod2: function (req, res) {
            res.end('ok2');
          }
        }
      }
    },
    components: {
      'component': {
        module: 'module',
        web: {
          routes: {
            webmethod1: 'webmethod1',
            webmethod2: 'webmethod2'
          }
        }
      }
    }
  };

  before(function (done) {

    mesh = new Mesh();
    mesh.initialize(config, function (err) {
      if (err) {
        console.log(err.stack);
        done(err);
      } else {
        mesh.start(done);
      }
    });
  });

  var adminClient = new Mesh.MeshClient({secure: true, test: "adminClient"});
  var testUserClient = new Mesh.MeshClient({secure: true, test: "testUserClient"});
  //NB in browser is: new MeshClient();
  //in node is: require('happner').MeshClient;

  before('logs in with the admin user', function (done) {

    // Credentials for the login method
    var credentials = {
      username: '_ADMIN', // pending
      password: test_id
    };

    adminClient.login(credentials).then(function () {
      done();
    }).catch(done);

  });

  after('logs out', function (done) {
    adminClient.disconnect(function (e) {
      done(e);
    }, 99);
  });

  after(function (done) {

    if (DELETEFILE) {

      fs.unlink(dbFileName, function (e) {
        if (e) return done(e);
        mesh.stop({reconnect: false}, done);
      });

    } else mesh.stop({reconnect: false}, done);

  });

  var testGroup = {
    name: 'TEST GROUP' + test_id,

    custom_data: {
      customString: 'custom1',
      customNumber: 0
    },

    permissions: {
      methods: {
        //in a /Mesh name/component name/method name - with possible wildcards
        '/meshname/security/*': {authorized: true}
      },
      events: {
        //in a /Mesh name/component name/event key - with possible wildcards
        '/meshname/security/*': {authorized: true}
      }
    }
  }

  var testGroupSaved;

  it('creates a test group, with permissions to access the security component', function (done) {

    adminClient.exchange.security.addGroup(testGroup, function (e, result) {

      if (e) return callback(e);

      expect(result.name == testGroup.name).to.be(true);
      expect(result.custom_data.customString == testGroup.custom_data.customString).to.be(true);
      expect(result.custom_data.customNumber == testGroup.custom_data.customNumber).to.be(true);

      testGroupSaved = result;
      done();

    });

  });

  var testUser = {
    username: 'TEST USER@blah.com' + test_id,
    password: 'TEST PWD',
    custom_data: {
      something: 'useful'
    }
  };

  var testUserSaved;

  it('creates a test user', function (done) {
    adminClient.exchange.security.addUser(testUser, function (e, result) {

      if (e) return done(e);

      expect(result.username).to.be(testUser.username);
      testUserSaved = result;

      done();

    });

  });

  it('adds test group to the test user', function (done) {

    adminClient.exchange.security.linkGroup(testGroupSaved, testUserSaved, function (e) {
      //we'll need to fetch user groups, do that later
      done(e);
    });

  });

  it('logs in with the test user', function (done) {

    testUserClient.login(testUser).then(function () {

      //do some stuff with the security manager here
      //securityManager = testUserClient.exchange.security;
      //NB - we dont have the security checks on method/component calls yet

      done();
    }).catch(function (e) {
      done(e);
    });

  });

  it('changes the password and custom data for the test user, then logs in with the new password', function (done) {

    var updatedPassword = 'PWD-UPD';

    testUserSaved.password = updatedPassword;
    testUserSaved.custom_data = {'changedCustom': 'changedCustom'};

    adminClient.exchange.security.updateUser(testUserSaved, function (e, result) {

      if (e) return done(e);
      expect(result.custom_data.changedCustom).to.be('changedCustom');
      testUserClient.login(testUserSaved).then(done).catch(done);

    });

  });

  it('fails to modify permissions using a non-admin user', function (done) {

    var testGroup = {
      name: 'B1USER_NONADMIN' + test_id,

      custom_data: {
        customString: 'custom1',
        customNumber: 0
      },

      permissions: {
        methods: {},
        events: {}
      }
    }

    var testGroupSaved;
    var testUserSaved;
    var testUserClient;

    adminClient.exchange.security.addGroup(testGroup, function (e, result) {

      if (e) return done(e);

      testGroupSaved = result;

      var testUser = {
        username: 'B1USER_NONADMIN' + test_id,
        password: 'TEST PWD',
        custom_data: {
          something: 'useful'
        }
      }

      adminClient.exchange.security.addUser(testUser, function (e, result) {

        if (e) return done(e);

        expect(result.username).to.be(testUser.username);
        testUserSaved = result;

        adminClient.exchange.security.linkGroup(testGroupSaved, testUserSaved, function (e) {

          if (e) return done(e);

          testUserClient = new Mesh.MeshClient({secure: true, test: 'testUserClient'});

          testUserClient.login(testUser).then(function () {

            testUserClient.exchange.security.linkGroup(testGroupSaved, testUserSaved, function (e, result) {

              if (!e)
                return done(new Error('this was not meant to happn'));

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

  it('should fail to login with a bad user', function (done) {

    testUserClient.login({username: 'naughty', password: '1234'}).then(function () {
      done(new Error('this was not meant to happn'));
    }).catch(function (e) {

      done();

    });

  });

  it('should list all groups', function (done) {

    adminClient.exchange.security.listGroups('*', function (e, groups) {

      if (e) return done(e);

      expect(groups.length).to.be(5);

      done();

    });

  });

  it('should list all users, no options', function (done) {

    adminClient.exchange.security.listUsers('*', function (e, users) {

      if (e) return done(e);

      expect(users.length).to.be(3);
      done();
    });

  });

  it('should list all users, options with criteria', function (done) {

    adminClient.exchange.security.listUsers('*', {criteria:{"_meta.path":'/_SYSTEM/_SECURITY/_USER/_ADMIN'}}, function (e, users) {

      if (e) return done(e);
      expect(users.length).to.be(1);
      done();
    });

  });

  it('should get a specific user, with rolled up group data', function (done) {

    adminClient.exchange.security.getUser(testUserSaved.username, function (e, user) {

      if (e) return done(e);

      expect(user.groups[testGroupSaved.name] != undefined).to.be(true);
      done();

    });

  });

  it('should be able to link another group to a user', function (done) {

    var testGroup2 = {
      name: 'TEST GROUP 2 ' + test_id,
      permissions: {
        methods: {},
        events: {}
      }
    };

    adminClient.exchange.security.addGroup(testGroup2, function (e, group2) {
      if (e) return done(e);
      adminClient.exchange.security.getUser(testUserSaved.username, function (e, user) {
        if (e) return done(e);
        adminClient.exchange.security.linkGroup(group2, user, function (e) {
          if (e) return done(e);
          adminClient.exchange.security.getUser(testUserSaved.username, function (e, user_new) {
            if (e) return done(e);
            expect(user_new.groups[testGroupSaved.name] != undefined).to.be(true);
            expect(user_new.groups[testGroup2.name] != undefined).to.be(true);
            done();
          });
        });
      });
    });
  });


  it('delete a user, fail to access the system with the deleted user', function (done) {

    adminClient.exchange.security.deleteUser(testUserSaved, function (e, result) {

      if (e) return done(e);

      testUserClient.login({username: testUserSaved.username, password: 'PWD-UPD'}).then(function () {
        done(new Error('this was not meant to happn'));
      }).catch(function (e) {

        expect(e.toString()).to.be('AccessDenied: Invalid credentials');
        done();

      });

    });

  });

  var testGroupAdmin = {
    name: 'TEST GROUP ADMIN',

    custom_data: {
      customString: 'custom1',
      customNumber: 0
    },

    permissions: {
      methods: {
        //in a /Mesh name/component name/method name - with possible wildcards
        '/meshname/security/*': {authorized: true}
      },
      events: {
        //in a /Mesh name/component name/event key - with possible wildcards
        '/meshname/security/*': {authorized: true}
      }
    }
  };

  var testGroupUser = {
    name: 'TEST GROUP USER',

    custom_data: {
      customString: 'custom2',
      customNumber: 0
    },

    permissions: {
      methods: {
        //in a /Mesh name/component name/method name - with possible wildcards
        '/meshname/security/*': {authorized: false}
      },
      events: {
        //in a /Mesh name/component name/event key - with possible wildcards
        '/meshname/security/*': {authorized: false}
      }
    }
  };

  it('should not allow calls to methods from /meshname/security after groups is updated to TEST GROUP USER', function (done) {

    this.timeout(2000);

    var testUser = {
      username: 'user1',
      password: 'password',
      custom_data: {
        role: 'TEST GROUP ADMIN'
      }
    };

    var all_groups = [], admin_group, user_group, user_data, new_meshClient;

    var addedUser;

    adminClient.exchange.security.addGroup(testGroupAdmin)
      .then(function () {
        return adminClient.exchange.security.addGroup(testGroupUser);
      })
      .then(function () {
        return adminClient.exchange.security.listGroups('*');
      })
      .then(function (groups) {
        all_groups = groups;
        return adminClient.exchange.security.addUser(testUser);
      })
      .then(function (user_data) {

        addedUser = user_data;

        for (var i = 0; i < all_groups.length; i++) {
          if (all_groups[i].name === 'TEST GROUP ADMIN') admin_group = all_groups[i];
          if (all_groups[i].name === 'TEST GROUP USER') user_group = all_groups[i];
        }

        //Linking the group to TEST GROUP ADMIN first.
        return adminClient.exchange.security.linkGroup(admin_group, addedUser);
      })
      .then(function () {
        //UnLinking the group from TEST GROUP ADMIN.
        return adminClient.exchange.security.unlinkGroup(admin_group, addedUser);
      })
      .then(function () {
        //Linking the group to TEST GROUP USER next.
        return adminClient.exchange.security.linkGroup(user_group, addedUser);
      })
      .then(function () {
        new_meshClient = new Mesh.MeshClient({secure: true, test: 'new_meshClient'});
        return new_meshClient.login(testUser);
      })
      .then(function () {
        //Expected to throw an error as the TEST GROUP USER has no permission for this method.
        new_meshClient.exchange.security.getUser(testUser.username, function (e, fetchedUser) {
          expect(e.toString()).to.equal('AccessDenied: unauthorized');
          expect(fetchedUser).to.be(undefined);
          return done();
        });
      })
      .catch(function (e) {
        return done(e);
      });
  });
  //deleteUser

  context('update group', function () {

    var user, groupName = 'group';

    before('create test user', function (done) {

      user = {
        username: 'username',
        password: 'password'
      };

      var group = {
        name: groupName,
        custom_data: {
          customString: 'custom1',
          customNumber: 0
        },
        permissions: {
          methods: {
            '/meshname/component/method1': {authorized: true}
          },
          events: {
            '/meshname/component/event1': {authorized: true}
          },
          web: {
            '/component/webmethod1': {
              authorized: true,
              actions: [
                'get',
                'put',
                'post',
                'head',
                'delete'
              ]
            }
          }
        }
      };

      Promise.all([
          adminClient.exchange.security.addGroup(group),
          adminClient.exchange.security.addUser(user)
        ])
        .spread(adminClient.exchange.security.linkGroup)
        .then(function (ignore) {
        })
        .then(done)
        .catch(done);

    });

    var client;

    before('login test user and verify security', function (done) {

      var _client = new Mesh.MeshClient({test: '_client'});

      _client.login(user)

        .then(function () {

          client = _client;

          // permissions working?
          client.event.component.on('event1', function () {

            // ensure not allowed
            client.exchange.component.method2()
              .catch(function (error) {
                if (error.toString() == 'AccessDenied: unauthorized') return done();
                done(error);
              });
          });
          client.exchange.component.method1().catch(done);
        })
        .catch(done);
    });

    var webmethod;

    before('can do permitted webmethod', function (done) {

      if (!client.token) return done(new Error('oh'));

      webmethod = function (method, path) {
        var j = request.jar();
        var cookie = request.cookie('happn_token=' + client.token);
        var url = 'http://localhost:55000' + path;
        j.setCookie(cookie, url);
        return request({method: method, url: url, jar: j})
          .then(function (res) {
            return res[1]; //body
          })
      };

      webmethod('get', '/component/webmethod1')
        .then(function (body) {
          if (body !== 'ok1') {
            return done(new Error('Failed on webmethod1: ' + body));
          }
          done();
        })
        .catch(done);

    });

    before('cannot do denied webmethod', function (done) {

      webmethod('get', '/component/webmethod2')
        .then(function (body) {
          if (!body.match(/^unauthorized access/)) {
            return done(new Error('Failed to not fail to access inaccessible'))
          }
          done();
        })
        .catch(done);

    });

    after('logout test user', function (done) {
      if (!client) return done();
      client.disconnect(done, 98);
    });

    var addPermissions = {
      methods: {
        '/meshname/component/method2': {authorized: true}
      },
      events: {
        '/meshname/component/event2': {/*authorized: true */} // assumed true
      },
      web: {
        '/component/webmethod1': {authorized: true, actions: ['options']}, // amend into existing
        '/component/webmethod2': {authorized: true, actions: ['get']}
      }
    };

    it('can add group permissions', function (done) {

      adminClient.exchange.security.addGroupPermissions(groupName, addPermissions)

        .then(function (updatedGroup) {

          return adminClient.exchange.security.getGroup(groupName);
        })

        .then(function (fetchedGroup) {

          expect(fetchedGroup).to.eql({
            name: 'group',
            custom_data: {
              customString: 'custom1',
              customNumber: 0
            },
            permissions: {
              methods: {
                'meshname/component/method1': {authorized: true},
                'meshname/component/method2': {authorized: true}
              },
              events: {
                'meshname/component/event1': {authorized: true},
                'meshname/component/event2': {authorized: true}
              },
              web: {
                'component/webmethod1': {
                  authorized: true,
                  actions: [
                    "delete",
                    "get",
                    "head",
                    "options",
                    "post",
                    "put"
                  ]
                },
                'component/webmethod2': {
                  authorized: true,
                  actions: [
                    'get'
                  ]
                }
              }
            }
          });
        })

        // can use new event and method permission?
        .then(function () {
          return new Promise(function (resolve, reject) {
            client.event.component.on('event2', function () {
              resolve();
            });

            client.exchange.component.method2().catch(reject);
          });
        })

        // can use new webmethod permission
        .then(function () {
          return webmethod('get', '/component/webmethod2');
        })

        .then(function (body) {
          expect(body).to.equal('ok2');
        })
        .then(done).catch(done);

    });

    it('can remove group permissions', function (done) {

      adminClient.exchange.security.addGroupPermissions(groupName, addPermissions)

        .then(function () {

          return adminClient.exchange.security.getGroup(groupName);
        })

        .then(function (fetchedGroup) {

          expect(fetchedGroup).to.eql({
            name: 'group',
            custom_data: {
              customString: 'custom1',
              customNumber: 0
            },
            permissions: {
              methods: {
                'meshname/component/method2': {authorized: true},
                'meshname/component/method1': {authorized: true}
              },
              events: {
                'meshname/component/event2': {authorized: true},
                'meshname/component/event1': {authorized: true}
              },
              web: {
                'component/webmethod1': {
                  authorized: true,
                  actions: [
                    "delete","get","head","options","post","put"
                  ]
                },
                'component/webmethod2': {
                  authorized: true,
                  actions: [
                    'get'
                  ]
                }
              }
            }
          });

          var removePermissions = {
            methods: {
              '/meshname/component/method1': {} // remove whole permission path
            },
            events: {
              'meshname/component/event1': {}
            },
            web: {
              '/component/webmethod1': {
                actions: [ // remove ONLY these actions
                  'put',
                  'head'
                ]
              }
            }
          };

          return adminClient.exchange.security.removeGroupPermissions(groupName, removePermissions)
        })

        .then(function (updatedGroup) {

          return adminClient.exchange.security.getGroup(groupName);
        })

        .then(function (fetchedGroup) {

          expect(fetchedGroup).to.eql({
            name: 'group',
            custom_data: {
              customString: 'custom1',
              customNumber: 0
            },
            permissions: {
              methods: {
                'meshname/component/method2': {authorized: true}
              },
              events: {
                'meshname/component/event2': {authorized: true}
              },
              web: {
                'component/webmethod1': {
                  authorized: true,
                  actions: [
                    "delete",
                    "get",
                    "options",
                    "post"
                  ]
                },
                'component/webmethod2': {
                  authorized: true,
                  actions: [
                    'get'
                  ]
                }
              }
            }
          })
        })

        // cant do method1 anymore
        .then(function () {
          return new Promise(function (resolve, reject) {
            client.exchange.component.method1().catch(function (error) {
              if (error.toString() != 'AccessDenied: unauthorized') {
                return reject(new Error('Not AccessDenied'));
              }
              resolve();
            })
          });
        })

        // cant put
        .then(function () {
          return webmethod('put', '/component/webmethod1')
        })

        .then(function (body) {
          if (!body.match(/^unauthorized/)) throw new Error('Not Unauthorized');
        })

        // can still get
        .then(function () {
          return webmethod('get', '/component/webmethod1')
        })

        .then(function (body) {
          if (body !== 'ok1') throw new Error('Unauthorized');
        })

        .then(done).catch(done);

    });
  });

  it('can upsert an existing group, merging permissions', function (done) {

    this.timeout(5000);

    var testUpsertGroup = {
      name: 'TEST_UPSERT_EXISTING',

      custom_data: 'TEST UPSERT EXISTING',

      permissions: {
        methods: {
          //in a /Mesh name/component name/method name - with possible wildcards
          '/meshname/component/method1': {authorized: true}
        },
        events: {
          //in a /Mesh name/component name/event key - with possible wildcards
          '/meshname/component/event1': {authorized: true}
        }
      }
    };

    var testUpsertGroup1 = {
      name: 'TEST_UPSERT_EXISTING',

      custom_data: 'TEST UPSERT EXISTING 1',

      permissions: {
        methods: {
          //in a /Mesh name/component name/method name - with possible wildcards
          '/meshname/component/method2': {authorized: true}
        },
        events: {
          //in a /Mesh name/component name/event key - with possible wildcards
          '/meshname/component/event2': {authorized: true}
        }
      }
    };

    var testUpsertUser = {
      username: 'TEST_UPSERT_EXISTING',
      password: 'TEST PWD',
      custom_data: {
        something: 'useful'
      }
    };

    Promise.all([
        adminClient.exchange.security.addGroup(testUpsertGroup),
        adminClient.exchange.security.addUser(testUpsertUser)
      ])
      .spread(adminClient.exchange.security.linkGroup)
      .then(function (addedGroup, addedUser) {

        var testUpsertClient = new Mesh.MeshClient({secure: true, test: 'testUpsertClient'});

        testUpsertClient.login(testUpsertUser).then(function () {

          expect(testUpsertClient.exchange.component.method1).to.not.be(null);
          expect(testUpsertClient.exchange.component.method2).to.not.be(null);

          testUpsertClient.exchange.component.method2(function (e) {

            expect(e.toString()).to.be('AccessDenied: unauthorized');

            adminClient.exchange.security.upsertGroup(testUpsertGroup1, function (e, upserted) {

              testUpsertClient.exchange.component.method2(function (e, result) {

                expect(e).to.be(null);

                done();
              });
            });
          });

        }).catch(done);

      })
      .catch(done);

  });

  it('can upsert an existing group, overwriting permissions', function (done) {

    var testUpsertGroup = {

      name: 'TEST_UPSERT_EXISTING_2',

      custom_data: 'TEST UPSERT EXISTING 2',

      permissions: {
        methods: {
          //in a /Mesh name/component name/method name - with possible wildcards
          '/meshname/component/method1': {authorized: true}
        },
        events: {
          //in a /Mesh name/component name/event key - with possible wildcards
          '/meshname/component/event1': {authorized: true}
        }
      }
    };

    var testUpsertGroup1 = {

      name: 'TEST_UPSERT_EXISTING_2',

      custom_data: 'TEST UPSERT EXISTING 3',

      permissions: {
        methods: {
          '/meshname/component/method1': {authorized: false},
          '/meshname/component/method2': {authorized: true}
        },
        events: {
          '/meshname/component/event1': {authorized: false},
          '/meshname/component/event2': {authorized: true}
        }
      }
    };

    var testUpsertUser = {
      username: 'TEST_UPSERT_EXISTING_2',
      password: 'TEST PWD',
      custom_data: {
        something: 'useful'
      }
    };

    Promise.all([
        adminClient.exchange.security.addGroup(testUpsertGroup),
        adminClient.exchange.security.addUser(testUpsertUser)
      ])
      .spread(adminClient.exchange.security.linkGroup)
      .then(function (addedGroup, addedUser) {

        var testUpsertClient = new Mesh.MeshClient({secure: true, test: 'testUpsertClient1'});

        testUpsertClient.login(testUpsertUser).then(function () {

          expect(testUpsertClient.exchange.component.method1).to.not.be(null);
          expect(testUpsertClient.exchange.component.method2).to.not.be(null);

          testUpsertClient.exchange.component.method2(function (e) {

            expect(e.toString()).to.be('AccessDenied: unauthorized');

            adminClient.exchange.security.upsertGroup(testUpsertGroup1, {overwritePermissions: true}, function (e, upserted) {

              testUpsertClient.exchange.component.method2(function (e, result) {

                expect(e).to.be(null);

                testUpsertClient.exchange.component.method1(function (e, result) {

                  expect(e.toString()).to.be('AccessDenied: unauthorized');

                  done();
                });
              });
            });
          });

        }).catch(done);

      })
      .catch(done);

  });

  it('can upsert a new group, merging permissions', function (done) {

    var testUpsertGroup = {

      name: 'TEST_UPSERT_EXISTING_3',

      custom_data: 'TEST UPSERT EXISTING 3',

      permissions: {
        methods: {
          //in a /Mesh name/component name/method name - with possible wildcards
          '/meshname/component/method1': {authorized: true}
        },
        events: {
          //in a /Mesh name/component name/event key - with possible wildcards
          '/meshname/component/event1': {authorized: true}
        }
      }
    };

    var testUpsertGroup1 = {

      name: 'TEST_UPSERT_EXISTING_3',

      custom_data: 'TEST UPSERT EXISTING 4',

      permissions: {
        methods: {
          //in a /Mesh name/component name/method name - with possible wildcards
          '/meshname/component/method2': {authorized: true}
        },
        events: {
          //in a /Mesh name/component name/event key - with possible wildcards
          '/meshname/component/event2': {authorized: true}
        }
      }
    };

    var testUpsertUser = {
      username: 'TEST_UPSERT_EXISTING_3',
      password: 'TEST PWD',
      custom_data: {
        something: 'useful'
      }
    };

    Promise.all([
        adminClient.exchange.security.upsertGroup(testUpsertGroup),
        adminClient.exchange.security.addUser(testUpsertUser)
      ])
      .spread(adminClient.exchange.security.linkGroup)
      .then(function (upsertedGroup, addedUser) {

        var testUpsertClient = new Mesh.MeshClient({secure: true, test: 'testUpsertClient2'});

        testUpsertClient.login(testUpsertUser).then(function () {

          expect(testUpsertClient.exchange.component.method1).to.not.be(null);
          expect(testUpsertClient.exchange.component.method2).to.not.be(null);

          testUpsertClient.exchange.component.method2(function (e) {

            expect(e.toString()).to.be('AccessDenied: unauthorized');

            adminClient.exchange.security.upsertGroup(testUpsertGroup1, function (e, upserted) {

              testUpsertClient.exchange.component.method2(function (e, result) {

                expect(e).to.be(null);

                testUpsertClient.exchange.component.method1(function (e, result) {

                  expect(e).to.be(null);

                  done();
                });
              });
            });
          });

        }).catch(done);

      })
      .catch(done);

  });

  it('can upsert a new group, merging permissions with an authorized:false', function (done) {

    var testUpsertGroup = {

      name: 'TEST_UPSERT_EXISTING_4',

      custom_data: 'TEST UPSERT EXISTING 4',

      permissions: {
        methods: {
          //in a /Mesh name/component name/method name - with possible wildcards
          '/meshname/component/method1': {authorized: true}
        },
        events: {
          //in a /Mesh name/component name/event key - with possible wildcards
          '/meshname/component/event1': {authorized: true}
        }
      }
    };

    var testUpsertGroup1 = {

      name: 'TEST_UPSERT_EXISTING_4',

      custom_data: 'TEST UPSERT EXISTING 5',

      permissions: {
        methods: {
          //in a /Mesh name/component name/method name - with possible wildcards
          '/meshname/component/method2': {authorized: true},
          '/meshname/component/method1': {authorized: false}
        },
        events: {
          //in a /Mesh name/component name/event key - with possible wildcards
          '/meshname/component/event2': {authorized: true}
        }
      }
    };

    var testUpsertUser = {
      username: 'TEST_UPSERT_EXISTING_4',
      password: 'TEST PWD',
      custom_data: {
        something: 'useful'
      }
    };

    Promise.all([
        adminClient.exchange.security.upsertGroup(testUpsertGroup),
        adminClient.exchange.security.addUser(testUpsertUser)
      ])
      .spread(adminClient.exchange.security.linkGroup)
      .then(function (addedGroup, addedUser) {

        var testUpsertClient = new Mesh.MeshClient({secure: true, test: 'testUpsertClient4'});

        testUpsertClient.login(testUpsertUser).then(function () {

          expect(testUpsertClient.exchange.component.method1).to.not.be(null);
          expect(testUpsertClient.exchange.component.method2).to.not.be(null);

          testUpsertClient.exchange.component.method2(function (e) {

            expect(e.toString()).to.be('AccessDenied: unauthorized');

            adminClient.exchange.security.upsertGroup(testUpsertGroup1, {overwritePermissions: true}, function (e, upserted) {

              testUpsertClient.exchange.component.method2(function (e, result) {

                expect(e).to.be(null);

                testUpsertClient.exchange.component.method1(function (e, result) {

                  expect(e.toString()).to.be('AccessDenied: unauthorized');

                  done();
                });
              });
            });
          });
        }).catch(done);
      })
      .catch(done);

  });

  it('can upsert an existing user, and merge group memberships', function (done) {

    var testUpsertGroup = {

      name: 'TEST_UPSERT_EXISTING_6',

      custom_data: 'TEST UPSERT EXISTING 7',

      permissions: {
        methods: {
          //in a /Mesh name/component name/method name - with possible wildcards
          '/meshname/component/method1': {authorized: true}
        },
        events: {
          //in a /Mesh name/component name/event key - with possible wildcards
          '/meshname/component/event1': {authorized: true}
        }
      }
    };

    var testUpsertGroup1 = {

      name: 'TEST_UPSERT_EXISTING_6_1',

      custom_data: 'TEST UPSERT EXISTING 7',

      permissions: {
        methods: {
          //in a /Mesh name/component name/method name - with possible wildcards
          '/meshname/component/method2': {authorized: true}
        },
        events: {
          //in a /Mesh name/component name/event key - with possible wildcards
          '/meshname/component/event2': {authorized: true}
        }
      }
    };

    var testUpsertUser = {
      username: 'TEST_UPSERT_EXISTING_6',
      password: 'TEST PWD',
      custom_data: {
        something: 'useful'
      },
      groups: {}
    };

    Promise.all([
        adminClient.exchange.security.upsertGroup(testUpsertGroup),
        adminClient.exchange.security.addUser(testUpsertUser)
      ])
      .spread(adminClient.exchange.security.linkGroup)
      .then(function (addedGroup, addedUser) {

        var testUpsertClient = new Mesh.MeshClient({secure: true, test: 'testUpsertClient'});

        testUpsertClient.login(testUpsertUser).then(function () {

          expect(testUpsertClient.exchange.component.method1).to.not.be(null);
          expect(testUpsertClient.exchange.component.method2).to.not.be(null);

          testUpsertClient.exchange.component.method2(function (e) {

            expect(e.toString()).to.be('AccessDenied: unauthorized');

            adminClient.exchange.security.addGroup(testUpsertGroup1, function (e, added) {

              expect(!e).to.be(true);

              testUpsertUser.groups['TEST_UPSERT_EXISTING_6_1'] = true;

              adminClient.exchange.security.upsertUser(testUpsertUser, function (e, result) {

                expect(!e).to.be(true);

                testUpsertClient.exchange.component.method2(function (e, result) {

                  expect(!e).to.be(true);
                  done();
                });
              });
            });
          });
        }).catch(done);
      })
      .catch(done);

  });

  it('can upsert an existing user, and overwrite group memberships', function (done) {

    var testUpsertGroup = {

      name: 'TEST_UPSERT_EXISTING_7',

      custom_data: 'TEST UPSERT EXISTING 8',

      permissions: {
        methods: {
          //in a /Mesh name/component name/method name - with possible wildcards
          '/meshname/component/method1': {authorized: true}
        },
        events: {
          //in a /Mesh name/component name/event key - with possible wildcards
          '/meshname/component/event1': {authorized: true}
        }
      }
    };

    var testUpsertGroup1 = {

      name: 'TEST_UPSERT_EXISTING_7_1',

      custom_data: 'TEST UPSERT EXISTING 7',

      permissions: {
        methods: {
          //in a /Mesh name/component name/method name - with possible wildcards
          '/meshname/component/method2': {authorized: true}
        },
        events: {
          //in a /Mesh name/component name/event key - with possible wildcards
          '/meshname/component/event2': {authorized: true}
        }
      }
    };

    var testUpsertUser = {
      username: 'TEST_UPSERT_EXISTING_7',
      password: 'TEST PWD',
      custom_data: {
        something: 'useful'
      },
      groups: {}
    };

    Promise.all([
        adminClient.exchange.security.upsertGroup(testUpsertGroup),
        adminClient.exchange.security.addUser(testUpsertUser)
      ])
      .spread(adminClient.exchange.security.linkGroup)
      .then(function (addedGroup, addedUser) {

        var testUpsertClient = new Mesh.MeshClient({secure: true, test: 'testUpsertClient6'});

        testUpsertClient.login(testUpsertUser).then(function () {

          expect(testUpsertClient.exchange.component.method1).to.not.be(null);
          expect(testUpsertClient.exchange.component.method2).to.not.be(null);

          testUpsertClient.exchange.component.method2(function (e) {

            expect(e.toString()).to.be('AccessDenied: unauthorized');

            adminClient.exchange.security.addGroup(testUpsertGroup1, function (e, added) {

              expect(!e).to.be(true);

              testUpsertUser.groups['TEST_UPSERT_EXISTING_7_1'] = true;

              adminClient.exchange.security.upsertUser(testUpsertUser, {overwriteMemberships: true}, function (e) {

                expect(!e).to.be(true);

                testUpsertClient.exchange.component.method2(function (e, result) {

                  expect(!e).to.be(true);

                  testUpsertClient.exchange.component.method1(function (e, result) {

                    expect(e.toString()).to.be('AccessDenied: unauthorized');
                    done();
                  });
                });
              });
            });
          });
        }).catch(done);
      })
      .catch(done);

  });

  it('can upsert a new user', function (done) {

    var testUpsertGroup = {

      name: 'TEST_UPSERT_EXISTING_8',

      custom_data: 'TEST UPSERT EXISTING 9',

      permissions: {
        methods: {
          //in a /Mesh name/component name/method name - with possible wildcards
          '/meshname/component/method1': {authorized: true}
        },
        events: {
          //in a /Mesh name/component name/event key - with possible wildcards
          '/meshname/component/event1': {authorized: true}
        }
      }
    };

    var testUpsertGroup1 = {

      name: 'TEST_UPSERT_EXISTING_8_1',

      custom_data: 'TEST UPSERT EXISTING 8',

      permissions: {
        methods: {
          //in a /Mesh name/component name/method name - with possible wildcards
          '/meshname/component/method2': {authorized: true}
        },
        events: {
          //in a /Mesh name/component name/event key - with possible wildcards
          '/meshname/component/event2': {authorized: true}
        }
      }
    };

    var testUpsertUser = {
      username: 'TEST_UPSERT_EXISTING_8',
      password: 'TEST PWD',
      custom_data: {
        something: 'useful'
      },
      groups: {
        'TEST_UPSERT_EXISTING_8': true
      }
    };

    Promise.all([

        adminClient.exchange.security.upsertGroup(testUpsertGroup),
        adminClient.exchange.security.upsertUser(testUpsertUser)

      ])

      .spread(adminClient.exchange.security.linkGroup)

      .then(function (addedGroup, addedUser) {

        expect(addedGroup).to.not.be(null);
        expect(addedUser).to.not.be(null);

        var testUpsertClient = new Mesh.MeshClient({secure: true, test: 'testUpsertClient7'});

        testUpsertClient.login(testUpsertUser).then(function () {

          expect(testUpsertClient.exchange.component.method1).to.not.be(null);
          expect(testUpsertClient.exchange.component.method2).to.not.be(null);

          testUpsertClient.exchange.component.method2(function (e) {

            expect(e.toString()).to.be('AccessDenied: unauthorized');

            testUpsertClient.exchange.component.method1(function (e, result) {

              expect(!e).to.be(true);
              expect(result).to.be('reply1');

              done();
            });
          });
        }).catch(done);
      })
      .catch(done);

  });

  it('fails upsert an existing user, non-existing group', function (done) {

    var testUpsertGroup = {

      name: 'TEST_UPSERT_EXISTING_9',

      custom_data: 'TEST UPSERT EXISTING 9',

      permissions: {
        methods: {
          //in a /Mesh name/component name/method name - with possible wildcards
          '/meshname/component/method1': {authorized: true}
        },
        events: {
          //in a /Mesh name/component name/event key - with possible wildcards
          '/meshname/component/event1': {authorized: true}
        }
      }
    };

    var testUpsertGroup1 = {

      name: 'TEST_UPSERT_EXISTING_9_1',

      custom_data: 'TEST UPSERT EXISTING 9',

      permissions: {
        methods: {
          //in a /Mesh name/component name/method name - with possible wildcards
          '/meshname/component/method2': {authorized: true}
        },
        events: {
          //in a /Mesh name/component name/event key - with possible wildcards
          '/meshname/component/event2': {authorized: true}
        }
      }
    };

    var testUpsertUser = {
      username: 'TEST_UPSERT_EXISTING_9',
      password: 'TEST PWD',
      custom_data: {
        something: 'useful'
      },
      groups: {}
    };

    Promise.all([
        adminClient.exchange.security.upsertGroup(testUpsertGroup),
        adminClient.exchange.security.addUser(testUpsertUser)
      ])
      .spread(adminClient.exchange.security.linkGroup)
      .then(function (addedGroup, addedUser) {

        var testUpsertClient = new Mesh.MeshClient({secure: true, test: 'testUpsertClient8'});

        testUpsertClient.login(testUpsertUser).then(function () {

          expect(testUpsertClient.exchange.component.method1).to.not.be(null);
          expect(testUpsertClient.exchange.component.method2).to.not.be(null);

          testUpsertClient.exchange.component.method2(function (e) {

            expect(e.toString()).to.be('AccessDenied: unauthorized');

            adminClient.exchange.security.addGroup(testUpsertGroup1, function (e, added) {

              expect(!e).to.be(true);

              testUpsertUser.groups['TEST_UPSERT_EXISTING_NON_EXISTING'] = true;

              adminClient.exchange.security.upsertUser(testUpsertUser, function (e, result) {

                expect(e).to.not.be(null);
                expect(e.toString()).to.be('Error: group with name TEST_UPSERT_EXISTING_NON_EXISTING does not exist');
                done();

              });
            });
          });
        }).catch(done);
      })
      .catch(done);
  });
});
