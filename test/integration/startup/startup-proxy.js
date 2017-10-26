/**
 * Created by craigsampson on 28/06/2016.
 */
var path = require('path');

describe(path.basename(__filename), function () {

  require('chai').should();

  var expect = require('expect.js');
  var async = require('async');
  var exec = require('child_process').exec;
  var http = require('http');
  var spawn = require('child_process').spawn;
  var libFolder = path.resolve(__dirname, '../../..') + path.sep + ['test', '__fixtures', 'test', 'integration', 'startup'].join(path.sep) + path.sep;

  this.timeout(15000);

  var childPIDs = [];

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

    request(options, callback);
  }

  before('Set up Loader with Proxy', function (done) {

    var loaderPath = path.resolve(__dirname, '../../../bin/happner-loader');

    var confPath = path.resolve(libFolder + 'conf_w_proxy.js');

    var logs = [];

    var spawnEnv = JSON.parse(JSON.stringify(process.env));

    spawnEnv.LOG_LEVEL = 'info';

    // spawn remote mesh in another process
    var remote = spawn('node', [loaderPath, '--conf', confPath], {env:spawnEnv});

    remote.stderr.on('data', function (data) {

      remote.stderr.removeAllListeners();
      done(data.toString());
    });

    remote.stdout.on('data', function (data) {

      if (childPIDs.length == 0) {
        childPIDs.push(remote.pid);
      }

      var logMessage = data.toString().toLowerCase();

      logs.push(logMessage);

      if (logMessage.indexOf('cache service loaded') >= 0) {

        var childPIDLog = logMessage.split(':::');
        var childPID = parseInt(childPIDLog[childPIDLog.length - 1]);
        childPIDs.push(childPID);
        done();
      }
    });
  });


  it('Get the content of the loader target', function (done) {
    doRequest('loader.htm', function (error, response, body) {

      response.statusCode.should.eql(200);
      done();
    }, 55009);
  });


  it('Get the content of a proxy file, with no server (error response)', function (done) {
    doRequest('index.htm', function (error, response, body) {
      response.statusCode.should.eql(502);
      done();
    }, 55009);
  });


  it('Get the content of a proxy file, with remote http server', function (done) {

    var http = require("http");

    http.createServer(function (req, res) {
      if (req.url == '/index.htm')
        res.writeHead(200, {"Content-Type": "text/html"});
      else
        res.writeHead(404, {"Content-Type": "text/html"});
      res.write("Marker");
      res.end();
    }).listen(55019);

    doRequest('index.htm', function (error, response, body) {
      body.should.eql("Marker");
      response.statusCode.should.eql(200);
      done();
    }, 55009);
  });

  it('Get the content of a 404 file, should have valid content', function (done) {
    doRequest('bad/url/location', function (error, response, body) {
      body.should.not.eql("Marker"); // We have the loader.htm body
      response.statusCode.should.eql(200);
      response.request.path.should.eql("/bad/url/location"); // We do not want to redirect.
      done();
    }, 55009);
  });

  after('kills the proxy and stops the mesh if its running', function (done) {

      if (childPIDs.length > 0) {
        async.eachSeries(childPIDs, function (pid, cb) {
          killProc(pid, cb);
        }, done);

      } else done();
  });

});
