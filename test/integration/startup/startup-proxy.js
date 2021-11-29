/**
 * Created by craigsampson on 28/06/2016.
 */
var path = require('path');

describe(
  require('../../__fixtures/utils/test_helper')
    .create()
    .testName(__filename, 3),
  function() {
    require('chai').should();

    var testServer;
    var spawn = require('child_process').spawn;
    var tree_kill = require('tree-kill');
    var libFolder =
      path.resolve(__dirname, '../../..') +
      path.sep +
      ['test', '__fixtures', 'test', 'integration', 'startup'].join(path.sep) +
      path.sep;

    this.timeout(15000);

    var childPS = {};

    function killProc(pid) {
      tree_kill(pid);
    }

    function addProc(pid, process) {
      //console.log('added pid: ', pid);
      childPS[pid] = process;
    }

    function doRequest(reqPath, callback, port) {
      var request = require('request');

      if (!port) port = 55000;

      if (reqPath[0] !== '/') reqPath = '/' + reqPath;

      var options = {
        url: 'http://127.0.0.1:' + port.toString() + reqPath
      };

      request(options, callback);
    }

    before('Set up Loader with Proxy', function(done) {
      if (process.env.RUNNING_IN_ACTIONS === 'yes') return done();

      var loaderPath = path.resolve(__dirname, '../../../bin/happner-loader');

      var confPath = path.resolve(libFolder + 'conf_w_proxy.js');

      var logs = [];

      var spawnEnv = JSON.parse(JSON.stringify(process.env));

      spawnEnv.LOG_LEVEL = 'info';

      // spawn remote mesh in another process
      var remote = spawn('node', [loaderPath, '--conf', confPath], { env: spawnEnv });

      addProc(remote.pid, remote);

      remote.stderr.on('data', function(data) {
        //skip deprecation warning, node v14
        if (data.indexOf('Transform.prototype._transformState is deprecated') > -1) return;
        remote.stderr.removeAllListeners();
        done(new Error(data.toString()));
      });

      remote.stdout.on('data', function(data) {
        var logMessage = data.toString().toLowerCase();

        logs.push(logMessage);

        if (logMessage.indexOf('cache service loaded') >= 0) {
          var childPIDLog = logMessage.split(':::');
          var childPID = parseInt(childPIDLog[childPIDLog.length - 1]);
          addProc(childPID, {});
          remote.stdout.removeAllListeners();
          done();
        }
      });
    });

    it('Get the content of the loader target', function(done) {
      if (process.env.RUNNING_IN_ACTIONS === 'yes') return done();

      doRequest(
        'loader.htm',
        function(error, response) {
          response.statusCode.should.eql(200);
          done();
        },
        55009
      );
    });

    it('Get the content of a proxy file, with no server (error response)', function(done) {
      if (process.env.RUNNING_IN_ACTIONS === 'yes') return done();

      doRequest(
        'index.htm',
        function(error, response) {
          response.statusCode.should.eql(502);
          done();
        },
        55009
      );
    });

    it('Get the content of a proxy file, with remote http server', function(done) {
      if (process.env.RUNNING_IN_ACTIONS === 'yes') return done();

      var http = require('http');

      testServer = http.createServer(function(req, res) {
        if (req.url === '/index.htm') res.writeHead(200, { 'Content-Type': 'text/html' });
        else res.writeHead(404, { 'Content-Type': 'text/html' });
        res.write('Marker');
        res.end();
      });

      testServer.listen(55019);

      doRequest(
        'index.htm',
        function(error, response, body) {
          body.should.eql('Marker');
          response.statusCode.should.eql(200);
          done();
        },
        55009
      );
    });

    it('Get the content of a 404 file, should have valid content', function(done) {
      if (process.env.RUNNING_IN_ACTIONS === 'yes') return done();

      doRequest(
        'bad/url/location',
        function(error, response, body) {
          body.should.not.eql('Marker'); // We have the loader.htm body
          response.statusCode.should.eql(200);
          response.request.path.should.eql('/bad/url/location'); // We do not want to redirect.
          done();
        },
        55009
      );
    });

    after('kills the proxy and stops the mesh if its running', function(done) {
      if (process.env.RUNNING_IN_ACTIONS === 'yes') return done();

      this.timeout(10000);

      if (testServer) testServer.close();

      Object.keys(childPS).forEach(killProc);

      setTimeout(function() {
        // console.log('UNRELEASED HANDLES:::');
        // log();
        done();
      }, 2000);
    });
  }
);
