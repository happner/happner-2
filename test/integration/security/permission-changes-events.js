describe(require('../../__fixtures/utils/test_helper').create().testName(__filename, 3), function () {

  this.timeout(120000);

  var expect = require('expect.js');
  require('chai').should();

  var Mesh = require('../../..');
  var mesh = new Mesh();

  var test_id = Date.now() + '_' + require('shortid').generate();
  var async = require('async');

  before(function (done) {

    var _this = this;

    _this.adminClient = new Mesh.MeshClient({secure: true, port: 8004});

    mesh.initialize({
      name: 'permission-changes-events',
      happn: {
        secure: true,
        adminPassword: test_id,
        port: 8004
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

        _this.adminClient.login(credentials).then(function () {
          done();
        }).catch(done);

      });
    });
  });

  after(function (done) {
    mesh.stop({reconnect: false}, done);
  });

  it('tests that all security events are being bubbled back from happn to happner security - and are consumable from an admin client', function (done) {

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

    _this.adminClient.exchange.security.attachToSecurityChanges(function (e) {//test still backward compatible

      if (e) return done(e);

      var eventCount = 0;

      _this.adminClient.event.security.on('security-data-updated', function (data) {
        eventCount++;
      });

      _this.adminClient.exchange.security.addGroup(testGroup, function (e, result) {

        if (e) return done(e);

        testGroupSaved = result;

        var testUser = {
          username: 'TESTUSER1' + test_id,
          password: 'TEST PWD',
          custom_data: {
            something: 'useful'
          }
        };

        _this.adminClient.exchange.security.addUser(testUser, function (e, result) {

          if (e) return done(e);

          expect(result.username).to.be(testUser.username);
          testUserSaved = result;

          _this.adminClient.exchange.security.linkGroup(testGroupSaved, testUserSaved, function (e) {
            //we'll need to fetch user groups, do that later
            if (e) return done(e);

            testUser.password = 'NEW PWD';
            testUser.custom_data = {changedCustom: 'changedCustom'};

            _this.adminClient.exchange.security.updateUser(testUser, function (e, result) {

              if (e) return done(e);

              _this.adminClient.exchange.security.unlinkGroup(testGroupSaved, testUserSaved, function (e, result) {

                if (e) return done(e);

                _this.adminClient.exchange.security.deleteGroup(testGroupSaved, function (e, result) {

                  if (e) return done(e);

                  _this.adminClient.exchange.security.deleteUser(testUser, function (e, result) {

                    if (e) return done(e);

                    expect(eventCount >= 8).to.be(true);

                    done();
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});
