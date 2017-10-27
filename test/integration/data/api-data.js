var path = require('path');

describe(require('../../__fixtures/utils/test_helper').create().testName(__filename, 3), function () {

  var maximumPings = 1000;
  var libFolder = path.resolve(__dirname, '../../..') + path.sep + ['test', '__fixtures', 'test', 'integration', 'data'].join(path.sep);
  var Mesh = require('../../..');
  var should = require('chai').should();

  this.timeout(120000);

  // var mesh = require('../lib/mesh')();

  var config = {
    name: "testProtectedDataAPI",
    modules: {
      "module1": {
        path: libFolder + path.sep + "api-data-module1",
        construct: {
          type: "sync",
          parameters: [
            {value: {maximumPings: maximumPings}}
          ]
        }
      },
      "module2": {
        path: libFolder + path.sep + "api-data-module2",
        construct: {
          type: "sync"
        }
      }
    },
    components: {
      "component1": {
        moduleName: "module1",
        startMethod: "start",
        schema: {
          "exclusive": false,//means we dont dynamically share anything else
          "methods": {
            "start": {
              type: "async",
              parameters: [
                {"required": true, "value": {"message": "this is a start parameter"}}
              ]
            }
          }
        }
      },
      "component2": {
        moduleName: "module2",
        schema: {
          "exclusive": false
        }
      }
    }
  };

  after(function (done) {
    this.mesh.stop({reconnect: false}, done);
  });

  before(function (done) {
    var _this = this;
    Mesh.create(config).then(function (mesh) {
      _this.mesh = mesh;
      done();
    }).catch(done);
  });

  it('stores some data on component1, we look at the output from happn', function (done) {

    this.mesh.exchange.component1.storeData('/test/integration/data/api-data', {"testprop1": "testval1"}, {}, function (e, result) {

      result._meta.path.should.equal('/_data/component1/test/integration/data/api-data');

      setTimeout(done, 200); //so the on picks something up?

    });

  });

  it('checks the on count on component1 must be greater than 0', function (done) {

    this.mesh.exchange.component1.getOnCount(function (e, result) {

      if (!result || result == 0)
        return done(new Error('result should be greater than 0'));

      done();
    });

  });

});









