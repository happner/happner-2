describe('c1 - security layer should be initialized before user components are started', function () {

  this.timeout(120000);

  require('benchmarket').start();
  after(require('benchmarket').store());

  var should = require('chai').should();
  var path = require('path');

  var meshpath = path.join(__dirname, '../lib/mesh');

  var happner = require(meshpath);

  var testComponentPath = path.join(__dirname, 'lib/c1-system-component-initialization.js');

  var mesh = new happner();

  var config = {
    dataLayer: {
      secure: true
    },

    modules: {
      testComponent: {
        path: testComponentPath
      }
    },
    components: {
      testComponent: {
        name: 'testComponent',
        moduleName: 'testComponent',
        startMethod: "start",
        schema: {
          "exclusive": false,
          "methods": {
            "start": {
              type: "async"
            }
          }
        }
      }
    }
  };

  after('should stop the happn server', function (done) {
    mesh.stop({reconnect: false}, done);
  });

  it('should start a user component that expects the security layer to be initialized', function (done) {
    mesh.initialize(config, function (err) {
      if (err) console.log(err);
      should.not.exist(err);

      mesh.start(function (err) {
        if (err) console.log(err);
        should.not.exist(err);
        done();
      });
    });
  });

  require('benchmarket').stop();

});
