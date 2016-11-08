module.exports = function (opt1, opt2) {
  return new Thing(opt1, opt2);
}

function Thing(opt1, opt2) {
  this.opt1 = opt1;
  this.opt2 = opt2;
}

Thing.prototype.method = function (callback) {
  callback(null, this.opt1 + ' ' + this.opt2);
}

