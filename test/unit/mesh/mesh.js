describe(require('../../__fixtures/utils/test_helper').create().testName(__filename, 3), function () {

  var expect = require('expect.js');

  function mockMesh(config){

    const Mesh = require('../../../lib/mesh');
    const mesh = new Mesh({});

    mesh.log = {
      info:function(){},
      error:function(){},
      trace:function(){},
      $$DEBUG:function(){},
      createLogger:function(){
        return mesh.log;
      }
    }

    mesh.unsubscribeFromProcessEvents = function(){}
    return mesh;
  }

  it('tests the _initializeDataLayer function, empty config', function (done) {

    var config = {};
    var mesh = mockMesh(config);

    mesh._initializeDataLayer(config, function(e){
      expect(config.happn.name).to.be(undefined);
      expect(config.happn.port).to.be(55000);
      expect(config.happn.secure).to.be(undefined);
      expect(config.happn.persist).to.be(undefined);
      expect(config.happn.services.data.config).to.eql({
        "datastores": [
          {
            "name": "default",
            "provider": "./providers/nedb",
            "isDefault": true,
            "settings": {
              "timestampData": true
            }
          }
        ]
      });

      expect(config.happn.setOptions).to.eql({
        timeout:10000,
        noStore: true
      });

      mesh.stop(done);
    });
  });

  it('tests the _initializeDataLayer function, config settings', function (done) {

    var config = {
      name: 'test',
      port:55008,
      secure:true,
      persist:true
    };

    var mesh = mockMesh(config);

    mesh._initializeDataLayer(config, function(e){
      expect(config.happn.name).to.be('test');
      expect(config.happn.port).to.be(55008);
      expect(config.happn.secure).to.be(true);
      expect(config.happn.persist).to.be(true);

      delete config.happn.services.data.config.datastores[0].settings.filename;

      expect(config.happn.services.data.config).to.eql({
        "datastores": [
          {
            "name": "persist",
            "isDefault": true,
            "settings": {
              "autoload": true,
              "timestampData": true
            },
            "patterns": [
              "/_SYSTEM/*"
            ],
            "provider": "./providers/nedb"
          },
          {
            "name": "mem",
            "isDefault": false,
            "patterns": [],
            "provider": "./providers/nedb"
          }
        ],
        "secure": true
      });

      expect(config.happn.setOptions).to.eql({
        timeout:10000,
        noStore: true
      });

      mesh.stop(done);
    });
  });

  it('tests the _destroyElement nonexistent component', function (done) {

    var config = {};
    var mesh = mockMesh(config);

    mesh._destroyElement('nonexistent-component', function(e){
      expect(e).to.be(undefined);
      done();
    });
  });
});
