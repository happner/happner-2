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

  this.static = serveStatic(__dirname + path.sep + 'static');

  this.excludedSpecific = function (req, res, next, $happn) {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({"secure": "value"}));
  };

  this.excludedWildcard = function (req, res, next, $happn) {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({"secure": "value"}));
  };
}
