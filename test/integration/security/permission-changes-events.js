describe(
  require('../../__fixtures/utils/test_helper')
    .create()
    .testName(__filename, 3),
  function() {
    this.timeout(120000);

    var expect = require('expect.js');
    require('chai').should();

    var Mesh = require('../../..');
    var mesh = new Mesh();

    var test_id = Date.now() + '_' + require('shortid').generate();

    before(function(done) {
      var _this = this;

      _this.adminClient = new Mesh.MeshClient({ secure: true, port: 8004 });

      mesh.initialize(
        {
          name: 'permission-changes-events',
          happn: {
            secure: true,
            adminPassword: test_id,
            port: 8004
          }
        },
        function(err) {
          if (err) return done(err);
          mesh.start(function(err) {
            if (err) {
              return done(err);
            }

            // Credentials for the login method
            var credentials = {
              username: '_ADMIN', // pending
              password: test_id
            };

            _this.adminClient
              .login(credentials)
              .then(function() {
                done();
              })
              .catch(done);
          });
        }
      );
    });

    after(function(done) {
      this.timeout(20000);
      if (this.adminClient)
        return this.adminClient.disconnect(() => {
          this.adminClient.event.security.offPath('upsert-user');
          this.adminClient.event.security.offPath('upsert-group');
          this.adminClient.event.security.offPath('link-group');
          this.adminClient.event.security.offPath('unlink-group');
          this.adminClient.event.security.offPath('delete-group');
          this.adminClient.event.security.offPath('delete-user');
          mesh.stop({ reconnect: false }, function() {
            setTimeout(() => {
              //log();
              done();
            }, 11000);
          });
        });
      return done();
    });

    it('tests that all security events are being bubbled back from happn to happner security - and are consumable from an admin client', function(done) {
      var _this = this;

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

      //link-group
      //

      var eventsToFire = {
        'upsert-user': false,
        'upsert-group': false,
        'link-group': false,
        'unlink-group': false,
        'delete-group': false,
        'delete-user': false
      };

      var fireEvent = function(key) {
        eventsToFire[key] = true;

        for (var eventKey in eventsToFire) if (eventsToFire[eventKey] === false) return;

        done();
      };

      _this.adminClient.exchange.security.attachToSecurityChanges(function(e) {
        if (e) return done(e);

        _this.adminClient.event.security.on('upsert-user', function() {
          fireEvent('upsert-user');
        });

        _this.adminClient.event.security.on('upsert-group', function() {
          fireEvent('upsert-group');
        });

        _this.adminClient.event.security.on('link-group', function() {
          fireEvent('link-group');
        });

        _this.adminClient.event.security.on('unlink-group', function() {
          fireEvent('unlink-group');
        });

        _this.adminClient.event.security.on('delete-group', function() {
          fireEvent('delete-group');
        });

        _this.adminClient.event.security.on('delete-user', function() {
          fireEvent('delete-user');
        });

        _this.adminClient.exchange.security.addGroup(testGroup, function(e, result) {
          if (e) return done(e);

          testGroupSaved = result;

          var testUser = {
            username: 'TESTUSER1' + test_id,
            password: 'TEST PWD',
            custom_data: {
              something: 'useful'
            }
          };

          _this.adminClient.exchange.security.addUser(testUser, function(e, result) {
            if (e) return done(e);

            expect(result.username).to.be(testUser.username);
            testUserSaved = result;

            _this.adminClient.exchange.security.linkGroup(testGroupSaved, testUserSaved, function(
              e
            ) {
              //we'll need to fetch user groups, do that later
              if (e) return done(e);

              testUser.password = 'NEW PWD';
              testUser.custom_data = { changedCustom: 'changedCustom' };

              _this.adminClient.exchange.security.updateUser(testUser, function(e) {
                if (e) return done(e);

                _this.adminClient.exchange.security.unlinkGroup(
                  testGroupSaved,
                  testUserSaved,
                  function(e) {
                    if (e) return done(e);

                    _this.adminClient.exchange.security.deleteGroup(testGroupSaved, function(e) {
                      if (e) return done(e);

                      _this.adminClient.exchange.security.deleteUser(testUser, function() {
                        //this will error because when we do done in event, the server closes its connections
                      });
                    });
                  }
                );
              });
            });
          });
        });
      });
    });
  }
);
