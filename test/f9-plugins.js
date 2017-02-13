var expect = require('expect.js');
var Happner = require('..');

describe('f9 - plugins', function () {

  var server;

  after(function (done) {
    if (!server) return done();
    server.stop({reconnect: false}, done);
  });


  it('allows for modification of mesh just before registerSchema', function (done) {

    Happner.create({

      plugins: [
        function(mesh, logger, callback) {
          mesh.xxx = 1;
          callback();
        },
        function(mesh, logger, callback) {
          mesh.yyy = 1;
          callback();
        }
      ]

    })

      .then(function (_server) {
        server = _server;

        expect(server.xxx).to.be(1);
        expect(server.yyy).to.be(1);

        done();
      })

      .catch(done)

  });

});
