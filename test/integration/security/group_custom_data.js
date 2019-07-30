var path = require('path');

describe(require('../../__fixtures/utils/test_helper').create().testName(__filename, 3), function () {

  this.timeout(120000);

  var expect = require('expect.js');

  var Mesh = require('../../..');

  var test_id = Date.now() + '_' + require('shortid').generate();

  var fs = require('fs-extra');

  var mesh = new Mesh();

  var config = {
    name: "meshname",
    happn: {
      secure: true,
      adminPassword: test_id
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

  var adminClient = new Mesh.MeshClient({secure: true, test:"adminClient"});

  before('logs in with the admin user', function (done) {

    var credentials = {
      username: '_ADMIN', // pending
      password: test_id
    };

    adminClient.login(credentials).then(function () {
      done();
    }).catch(done);

  });

  after('logs out', function (done) {
    adminClient.disconnect(function(e){
      done(e);
    }, 99);
  });

  after(function (done) {
    mesh.stop({reconnect: false}, done);
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
  };

  var testGroupSaved;

  it('saves and then fetches a group with custom_data - ensures the custom data is preserved', function (done) {

    adminClient.exchange.security.addGroup(testGroup, function (e, result) {

      if (e) return done(e);

      expect(result.name == testGroup.name).to.be(true);
      expect(result.custom_data.customString == testGroup.custom_data.customString).to.be(true);
      expect(result.custom_data.customNumber == testGroup.custom_data.customNumber).to.be(true);

      testGroupSaved = result;

      mesh._mesh.happn.server.services.security.groups.__cache_groups.clear();

      adminClient.exchange.security.getGroup(testGroup.name, function(e, fetchedGroup){

        if (e) return done(e);

        expect(fetchedGroup.custom_data.customString == testGroup.custom_data.customString).to.be(true);
        expect(fetchedGroup.custom_data.customNumber == testGroup.custom_data.customNumber).to.be(true);

        done();

      });
    });
  });
});
