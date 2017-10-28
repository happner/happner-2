describe(require('../../__fixtures/utils/test_helper').create().testName(__filename, 3), function () {

  this.timeout(120000);

  var expect = require('expect.js');

  var Mesh = require('../../..');
  var mesh;

  it('tests the client newMesh call', function (done) {

    Mesh.create( function(e, instance){

      if (e) return callback(e);
      mesh = instance;

      mesh._mesh._createElement({component:{}, module:{config:{}}},{}, function(e){
        mesh.stop({reconnect:false}, done);
      });

    });

  });

  it('tests a re-initialized mesh', function (done) {

    Mesh.create( function(e, instance){

      if (e) return callback(e);
      mesh = instance;

      mesh._mesh._createElement({component:{}, module:{config:{}}},{}, function(e){

          mesh.stop({reconnect:false}, function(e){

            if (e) return done(e);

            mesh.initialize({},function(e, instance){

              instance._mesh._createElement({component:{}, module:{config:{}}},{}, function(e){

                mesh.stop({reconnect:false},done);

              });
            });
          });
        });
    });
  });
});
