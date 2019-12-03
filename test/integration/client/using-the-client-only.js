const testHelper = require('../../__fixtures/utils/test_helper').create();
describe(testHelper.testName(__filename, 3), function() {
  this.timeout(20000);

  const spawn = require('child_process').spawn;
  const sep = require('path').sep;
  let remote;
  const assert = require('assert');
  const path = require('path');
  const libFolder = path.resolve(
    __dirname,
    `..${sep}..${sep}__fixtures${sep}test${sep}integration${sep}mesh`
  );

  // Spawn mesh in another process.
  before(function(done) {
    remote = spawn('node', [libFolder + sep + '4-first-mesh']);
    remote.stdout.on('data', function(data) {
      if (!data.toString().match(/READY/)) return;
      done();
    });
  });

  after(async () => {
    remote.kill();
  });

  //for use possibly later
  //testHelper.showOpenHandles(after, 5000);

  context('with clientside bits', function() {
    it('can ride the slippery slip', function(done) {
      var MeshClient = require('../../../lib/system/shared/mesh-client');

      new MeshClient({ port: 3001, username: '_ADMIN', password: 'guessme' }, function(
        err,
        client
      ) {
        if (err) return done(err);
        client.exchange.remoteComponent.rideTheSlipperySlip('one!', 'two!', 'three!', function(
          err,
          res
        ) {
          if (err) return done(err);
          assert(res === 'one! two! three!, wheeeeeeeeeeeeheeee!');
          client.disconnect(done);
        });
      });
    });
  });
});
