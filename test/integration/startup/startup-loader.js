var path = require("path");

describe(
  require("../../__fixtures/utils/test_helper")
    .create()
    .testName(__filename, 3),
  function() {
    require("chai").should();
    var Mesh = require("../../..");
    var libFolder =
      path.resolve(__dirname, "../../..") +
      path.sep +
      ["test", "__fixtures", "test", "integration", "startup"].join(path.sep) +
      path.sep;
    var spawn = require("child_process").spawn;
    var expect = require("expect.js");
    var async = require("async");
    var exec = require("child_process").exec;

    this.timeout(120000);

    var childPIDs = [];

    var configDeferredListen = {
      name: "startupProxiedDifferentPort",
      port: 55001,
      "happner-loader": {},
      deferListen: true
    };

    var configDifferentPortMeshLog = {
      name: "configDifferentPortMeshLog",
      port: 55003
    };

    var meshes = [];
    var mesh;

    function killProc(pid, callback, removeFromChildPIDs) {
      exec("kill -9 " + pid, function(error, stdout, stderr) {
        if (removeFromChildPIDs)
          childPIDs.map(function(childPid, ix) {
            if (childPid == pid) childPIDs.splice(ix, 1);
          });

        callback();
      });
    }

    function doRequest(reqPath, callback, port) {
      var request = require("request");

      if (!port) port = 55000;

      if (reqPath[0] != "/") reqPath = "/" + reqPath;

      var options = {
        url: "http://127.0.0.1:" + port.toString() + reqPath
      };

      request(options, function(error, response, body) {
        callback(body);
      });
    }

    it("starts the loader http server", function(done) {
      var LoaderProgress = require("../../../lib/startup/loader_progress");

      var loaderProgress = new LoaderProgress({ port: 55000 });

      loaderProgress.listen(function(e) {
        if (e) return done(e);

        loaderProgress.progress("test", 10);
        loaderProgress.progress("test1", 20);

        doRequest(
          "/progress",
          function(data) {
            var prog_data = JSON.parse(data);

            expect(prog_data[0].log).to.be("test");
            expect(prog_data[0].progress).to.be(10);
            expect(prog_data[1].log).to.be("test1");
            expect(prog_data[1].progress).to.be(20);

            loaderProgress.stop();

            done();
          },
          55000
        );
      });
    });

    it("starts a mesh with a deferred listen", function(done) {
      Mesh.create(configDeferredListen, function(e, created) {
        if (e) return done(e);

        meshes.push(created);

        doRequest(
          "/ping",
          function(data) {
            expect(data).to.be(undefined);

            created.listen(function(e) {
              if (e) return done(e);

              doRequest(
                "/ping",
                function(data) {
                  expect(data).to.be("pong");
                  done();
                },
                55001
              );
            });
          },
          55001
        );
      });
    });

    xit("starts a mesh and checks we have mesh logs", function(done) {
      var meshLogs = [];

      var doneHappened = false;

      Mesh.on("mesh-log", function(data) {
        meshLogs.push(data);

        if (data.stack == "started!") {
          expect(meshLogs.length > 16).to.be(true);
          if (!doneHappened) {
            doneHappened = true;
            done();
          }
        }
      });

      Mesh.create(configDifferentPortMeshLog, function(e, created) {
        if (e) return done(e);

        meshes.push(created);
      });
    });

    it("starts a loader process, we analyze the loader logs to ensure it is all working", function(done) {
      this.timeout(15000);

      var loaderPath = path.resolve(__dirname, "../../../bin/happner-loader");
      var confPath = path.resolve(libFolder + "conf_redirect.json");

      var spawnEnv = JSON.parse(JSON.stringify(process.env));

      spawnEnv.LOG_LEVEL = "info";

      // spawn remote mesh in another process
      var remote = spawn("node", [loaderPath, "--conf", confPath], {
        env: spawnEnv
      });
      var logs = [];

      var verifyLogs = function() {
        var logScore = 0;

        for (var logIndex in logs) {
          var logMessage = logs[logIndex];

          if (
            logMessage.indexOf("(mesh) initialized component 'security'") >= 0
          ) {
            logScore++;
          }
          if (
            logMessage.indexOf("(mesh) initialized component 'system'") >= 0
          ) {
            logScore++;
          }
          if (logMessage.indexOf("happner ready to start listening") >= 0) {
            logScore++;
          }
          if (
            logMessage.indexOf(
              "happner process is now listening, killing parent process in 5 seconds"
            ) >= 0
          ) {
            logScore++;
          }
        }
        return logScore;
      };

      remote.stdout.on("data", function(data) {
        var logMessage = data.toString().toLowerCase();

        logs.push(logMessage);

        if (logMessage.indexOf("child process loaded") >= 0) {
          var childPIDLog = logMessage.split(":::");
          var childPID = parseInt(childPIDLog[childPIDLog.length - 1]);

          childPIDs.push(childPID);
        }

        if (
          logMessage.indexOf(
            "happner process is now listening, killing parent process in 5 seconds"
          ) >= 0
        ) {
          setTimeout(function() {
            doRequest(
              "/ping",
              function(data) {
                expect(data).to.be("pong");
                var score = verifyLogs();

                if (score == 4) killProc(childPID, done, true);
                else
                  done(
                    new Error("log message score invalid:::" + score.toString())
                  );
              },
              55004
            );
          }, 7000);
        }
      });
    });

    after("kills the proxy and stops the mesh if its running", function(done) {
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

      if (meshes.length > 0)
        async.eachSeries(
          meshes,
          function(stopMesh, cb) {
            stopMesh.stop({ reconnect: false }, cb);
          },
          killProcs
        );
      else killProcs();
    });
  }
);
