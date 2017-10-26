/* RUN: LOG_LEVEL=off mocha test/18-exchange-promises.js */
describe(require('../../__fixtures/utils/test_helper').create().testName(__filename, 3), function () {

  /**
   * Simon Bishop
   * @type {expect}
   */

  // Uses unit test 2 modules
  var path = require('path');
  var Mesh = require('../../..');
  var libFolder = path.resolve(__dirname, '../../..') + path.sep + ['test', '__fixtures', 'test', 'integration', 'client'].join(path.sep);
  var REMOTE_MESH = 'pleasant-victim-secure';
  var REMOTE_PORT = 11111;
  var ADMIN_PASSWORD = 'ADMIN_PASSWORD';
  var spawn = require('child_process').spawn;
  var async = require('async');

  this.timeout(120000);

  var mesh;
  var remote;

  var CONNECTION_COUNT = 3;

  var startRemoteMesh = function (callback) {

    var timedOut = setTimeout(function () {
      callback(new Error('remote mesh start timed out'));
    }, 5000);

    // spawn remote mesh in another process
    remote = spawn('node', [libFolder + path.sep + REMOTE_MESH]);

    remote.stdout.on('data', function (data) {

      if (data.toString().match(/READY/)) {

        clearTimeout(timedOut);

        setTimeout(function () {
          callback(null, remote);
        }, 1000);
      }
    });
  };

  it('starts and connects to a remote mesh, then stops the mesh ' + CONNECTION_COUNT + ' times', function (done) {

    var timeout = 20000 * CONNECTION_COUNT;

    this.timeout(timeout);

    async.timesSeries(CONNECTION_COUNT, function(time, timeCB){

      startRemoteMesh(function (e, remoteProcess) {

        if (e) return done(e);

        var testClient = new Mesh.MeshClient({port: REMOTE_PORT});

        testClient.login({
          username: '_ADMIN',
          password: 'happn'
        }).then(function(e){

          if (e) {
            remoteProcess.kill();
            return done(e);
          }

          remoteProcess.kill();

          setTimeout(timeCB, 1500);
        });
      });
    }, done);
  });
});
