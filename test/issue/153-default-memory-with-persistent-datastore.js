var should = require('chai').should();
var shortId = require('shortid');
var happner2 = require('../../');
var path = require('path');
var async = require('async');

describe('datastores', function () {

  it.only('should test persistency', function (done) {
    var c = getConfig();

    var mesh;
    async.series([
      function (cb) {
        startMesh(c, function (err, _mesh) {
          mesh = _mesh;
          cb(err);
        });
      },
      function (cb) {
        mesh.exchange.myComponent.setData('a', {value: 1}, cb);
      },
      function (cb) {
        mesh.stop(cb);
      },
      function (cb) {
        startMesh(c, function (err, _mesh) {
          mesh = _mesh;
          cb(err);
        });
      },
      function (cb) {
        mesh.exchange.myComponent.getData('a', function (err, data) {
          data.should.property('value', 1);
          cb(err);
        });
      }
    ], done);

  });

});

function startMesh(c, cb) {
  happner2.create(c)
    .then(function (_mesh) {
      cb(null, _mesh);
    })
    .catch(cb);
}

function getConfig() {
  return {
    happn: {
      port: 55000,
      secure: true,
      encryptPayloads: true,
      setOptions: {
        timeout: 60000
      },
      services: {
        data: {
          config: {
            datastores: [
              {
                name: 'persist',
                settings: {
                  filename: path.join(__dirname, '../tmp/' + shortId() + '.nedb'),
                  compactInterval: 5000
                }
              },
              {
                name: 'memory',
                isDefault: true
              }
            ]
          }
        },
        security: {
          config: {
            adminUser: {
              password: 'password'
            }
          }
        },
        connect: {
          config: {
            middleware: {
              security: {
                exclusions: [
                  '/*'
                ]
              }
            }
          }
        }
      }
    },
    modules: {
      myComponent: {
        instance: {
          setData: function ($happn, key, data, callback) {
            $happn.data.set('myData/' + key, data, {}, callback);
          },
          getData: function ($happn, key, callback) {
            $happn.data.get('myData/' + key, callback);
          }
        }
      }
    },
    components: {
      myComponent: {
        data: {
          routes: {
            "myData": 'persist'
          }
        }
      }
    }
  };
}
