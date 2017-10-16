var serveStatic = require('serve-static');
var path = require('path');

module.exports = function () {
  return new ModuleFive();
}

function ModuleFive() {

  this.preProcessor = function (req, res, next) {
    req.url = '/preprocessed-' + req.url.slice(1, req.url.length);
    next();
  };

  this.static = serveStatic(__dirname + path.sep + 'static5');

  this.testScope = function (req, res) {
    res.statusCode = 200;
    if (this.__proto__.constructor.name != req.uri.query.scope) {
      res.statusCode = 500;
    }
    res.end();
  }

}
