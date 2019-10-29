var path = require('path');

describe(
  require('../../__fixtures/utils/test_helper')
    .create()
    .testName(__filename, 3),
  function() {
    require('chai').should();

    var libFolder =
      path.resolve(__dirname, '../../..') +
      path.sep +
      ['test', '__fixtures', 'test', 'integration', 'startup'].join(path.sep) +
      path.sep;
    var spawn = require('child_process').spawn;
    var async = require('async');
    var exec = require('child_process').exec;

    this.timeout(30000);

    var childPIDs = [];

    var meshes = [];

    function killProc(pid, callback, removeFromChildPIDs) {
      exec('kill -9 ' + pid, function() {
        if (removeFromChildPIDs)
          childPIDs.map(function(childPid, ix) {
            if (childPid === pid) childPIDs.splice(ix, 1);
          });

        callback();
      });
    }

    function doRequest(reqPath, callback, port) {
      var request = require('request');

      if (!port) port = 55000;

      if (reqPath[0] !== '/') reqPath = '/' + reqPath;

      var options = {
        url: 'http://127.0.0.1:' + port.toString() + reqPath
      };

      request(options, function(error, response, body) {
        callback(body);
      });
    }

    var remote;

    before(
      'starts a loader process, we analyze the loader logs to ensure it is all working',
      function(done) {
        var loaderPath = path.resolve(__dirname, '../../../bin/happner-loader');
        var confPath = path.resolve(libFolder + 'conf_cant_start.js');

        var spawnEnv = JSON.parse(JSON.stringify(process.env));

        spawnEnv.LOG_LEVEL = 'info';

        // spawn remote mesh in another process
        remote = spawn('node', [loaderPath, '--conf', confPath], { env: spawnEnv });

        var logs = [];

        // remote.stderr.on('data', function (data) {
        //   console.log('on error:::', data.toString());
        // })

        remote.stdout.on('data', function(data) {
          //console.log('on data:::', data.toString());

          if (data == null) return;

          var logMessage = data.toString().toLowerCase();

          logs.push(logMessage);

          if (logMessage.indexOf('child process loaded') >= 0) {
            var childPIDLog = logMessage.split(':::');
            var childPID = parseInt(childPIDLog[childPIDLog.length - 1]);

            childPIDs.push(childPID);
          }

          if (logMessage.indexOf('could not start child') !== -1) {
            doRequest(
              '/log',
              function(body) {
                var logs = JSON.parse(body);
                for (var i = 0; i < logs.length; i++) {
                  if (
                    logs[i].level === 'error' &&
                    logs[i].message.indexOf("\"Error: Cannot find module 'badPath'") === 0
                  ) {
                    done();
                    remote.stdout.removeAllListeners();
                    break;
                  }
                }
              },
              55010
            );
          }
        });
      }
    );

    it('has restarted it at least twice', function(done) {
      checkLog();

      function checkLog() {
        var totalFound = 0;
        doRequest(
          '/log',
          function(body) {
            var logs = JSON.parse(body);
            for (var i = 0; i < logs.length; i++) {
              if (
                logs[i].level === 'error' &&
                logs[i].message.indexOf("\"Error: Cannot find module 'badPath'") === 0
              ) {
                totalFound++;
              }
            }
            if (totalFound > 1) {
              done();
              return;
            }
            setTimeout(checkLog, 1000);
          },
          55010
        );
      }
    });

    after('kills the proxy and stops the mesh if its running', function(done) {
      if (remote) remote.kill();

      var killProcs = function() {
        if (childPIDs.length > 0) {
          async.eachSeries(
            childPIDs,
            function(pid, cb) {
              killProc(pid, cb);
            },
            done
          );
        } else done();
      };

      if (meshes.length > 0) {
        async.eachSeries(
          meshes,
          function(stopMesh, cb) {
            stopMesh.stop({ reconnect: false }, cb);
          },
          killProcs
        );
      } else killProcs();
    });
  }
);
