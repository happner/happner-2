/**
 * Created by Johan on 10/14/2015.
 */
module.exports = function () {
  return new Module();
};

function Module() {
  this.doAnotherSomething = function(req, res, next) {
    res.write('_didAnotherSomething');
    next();
  };

  this.doAnotherSomethingElse = function(req, res, next) {
    res.write('_didAnotherSomethingElse');
    next();
  };
}
