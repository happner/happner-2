var Happner = require('../');

describe(require('path').basename(__filename), function () {

  var local, remote;

  before('start remote', function (done) {
    Happner.create({
      name: 'REMOTE'
    }).then(function (mesh) {
      remote = mesh;
    }).then(done).catch(done);
  });

  before('start local', function (done) {
    Happner.create({
      port: 55001,
      endpoints: {
        'REMOTE': {}
      }
    }).then(function (mesh) {
      local = mesh;
    }).then(done).catch(done);
  });

  after('stop local', function (done) {
    if (!local) return done();
    local.stop({reconnect: false}, done);
  });

  after('stop remote', function (done) {
    if (!remote) return done();
    remote.stop({reconnect: false}, done);
  });


  xit('can stop the mesh after endpoint disconnected', function (done) {

    // stop remote to which endpoint is connected

    remote.stop({reconnect: false}, function (e) {

      if (e) return done(e);

      remote = undefined;

      local.stop({reconnect: false}, function (e) {

        // does not call back

        if (e) return done(e);

        local = undefined;

        done();

      })

    });

  });

});
