var path = require('path');

describe(path.basename(__filename), function () {

  require('chai').should();

  var libFolder = path.resolve(__dirname, '../../..') + path.sep + ['test', '__fixtures', 'test', 'integration', 'startup'].join(path.sep) + path.sep;
  var spawn = require('child_process').spawn;
  var expect = require('expect.js');
  var async = require('async');
  var exec = require('child_process').exec;

  this.timeout(5000);

  var childPIDs = [];

  var meshes = [];
  var mesh;

  function killProc(pid, callback, removeFromChildPIDs) {

    exec("kill -9 " + pid, function (error, stdout, stderr) {

      if (removeFromChildPIDs)
        childPIDs.map(function (childPid, ix) {
          if (childPid == pid)
            childPIDs.splice(ix, 1);
        });

      callback();
    });
  }

  function doRequest(reqPath, callback, port) {

    var request = require('request');

    if (!port) port = 55000;

    if (reqPath[0] != '/')
      reqPath = '/' + reqPath;

    var options = {
      url: 'http://127.0.0.1:' + port.toString() + reqPath
    };

    request(options, function (error, response, body) {
      callback(body);
    });
  }

  var remote;

  before('starts a loader process, we analyze the loader logs to ensure it is all working', function (done) {

    this.timeout(15000);

    var loaderPath = path.resolve(__dirname, '../../../bin/happner-loader');
    var confPath = path.resolve(libFolder + 'conf_cant_start.js');

    // spawn remote mesh in another process
    remote = spawn('node', [loaderPath, '--conf', confPath]);
    var logs = [];

    remote.stdout.on('data', function (data) {

      var logMessage = data.toString().toLowerCase();

      logs.push(logMessage);

      if (logMessage.indexOf('child process loaded') >= 0) {

        var childPIDLog = logMessage.split(':::');
        var childPID = parseInt(childPIDLog[childPIDLog.length - 1]);

        childPIDs.push(childPID);
      }

      if (logMessage.indexOf('could not start child') != -1) {
        doRequest('/log', function (body) {
          var logs = JSON.parse(body);
          for (var i = 0; i < logs.length; i++) {
            if (logs[i].level == 'error' && logs[i].message == '"Error: Cannot find module \'badPath\'"') {
              done();
              remote.stdout.removeAllListeners();
              break;
            }
          }
        }, 55010)
      }
    });
  });

  it('has restarted it at least twice', function (done) {

    this.timeout(5000);
    checkLog();

    function checkLog() {
      var totalFound = 0;
      doRequest('/log', function (body) {
        var logs = JSON.parse(body);
        for (var i = 0; i < logs.length; i++) {
          if (logs[i].level == 'error' && logs[i].message == '"Error: Cannot find module \'badPath\'"') {
            totalFound++;
          }
        }
        if (totalFound > 1) {
          done();
          return;
        }
        setTimeout(checkLog, 500);
      }, 55010)
    }
  });


  after('kills the proxy and stops the mesh if its running', function (done) {

    if (remote) remote.kill();

    var killProcs = function () {

      if (childPIDs.length > 0) {

        async.eachSeries(childPIDs, function (pid, cb) {

          killProc(pid, cb);
        }, done);

      } else done();
    };

    if (meshes.length > 0) {
      async.eachSeries(meshes, function (stopMesh, cb) {
        stopMesh.stop({reconnect: false}, cb);
      }, killProcs);
    } else killProcs();
  });
});
