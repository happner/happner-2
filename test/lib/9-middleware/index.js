/**
 * Created by Johan on 10/14/2015.
 */

var serveStatic = require('serve-static');
var path = require('path');

module.exports = function () {
  return new Module();
};

function Module() {
  this.checkIndex = function (req, res, next, $happn) {
    req.url = req.url.replace('html', 'htm');
    next();
  };

  this.content = serveStatic(__dirname + path.sep + 'static');

  this.singularMethod = function (req, res) {
    res.end('OK');
  };

  this.multiMethod1 = function (req, res, next) {
    res.write('_1');
    next();
  };

  this.multiMethod2 = function (req, res, next) {
    res.write('_2');
    next();
  };

  this.multiMethod3 = function (req, res) {
    res.end('_3');
  };

  this.injectHappnMethod = function (req, $happn, res) {
    res.end($happn.info.mesh.name);
  };

  this.injectOriginMethod = function (req, $origin, res, next) {
    res.write($origin.username);
    next();
  };

  this.injectForwardOrder = function(req, $happn, $origin, res) {
    res.end($origin.username + '_' + $happn.info.mesh.name);
  };

  this.injectReverseOrder = function(req, $origin, $happn, res) {
    res.end($origin.username + '_' + $happn.info.mesh.name);
  };

}
