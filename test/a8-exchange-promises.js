/* RUN: LOG_LEVEL=off mocha test/18-exchange-promises.js */

var Promise = require('bluebird');

module.exports = SeeAbove;

function SeeAbove() {
}

SeeAbove.prototype.methodName1 = function (opts, callback) {

  if (opts.errorAs == 'callback') return callback(new Error('THIS IS JUST A TEST'));
  if (opts.errorAs == 'throw') throw new Error('THIS IS JUST A TEST');

  opts.number++;
  callback(null, opts);
};

SeeAbove.prototype.callCallbackTwice = function (opts, callback) {
  opts.number++;
  callback(null, opts);

  setTimeout(function () {
    callback(null, {number: opts.number + 1});
  }, 100);
};

SeeAbove.prototype.fireAndForget = function (opts) {
  //do nothing
};

SeeAbove.prototype.promiseMethod = Promise.promisify(function (opts, callback) {

  if (opts.errorAs == 'callback') return callback(new Error('THIS IS JUST A TEST WITH CALLBACK ERROR'));
  if (opts.errorAs == 'throw') throw new Error('THIS IS JUST A TEST THAT THROWS AN ERROR');


  opts.number++;
  callback(null, opts);

});

SeeAbove.prototype.promisePromiseCaller = Promise.promisify(function (opts, callback) {

  this.promiseMethod(opts)
    .then(function () {
      callback(null, opts);
    })
    .catch(callback)

});

SeeAbove.prototype.promiseCaller = function (opts, callback) {

  this.promiseMethod(opts)
    .then(function () {
      callback(null, opts);
    })
    .catch(callback)

};

SeeAbove.prototype.promiseReturnerNoCallback = function (opts) {
  return this.promiseMethod(opts);
};

SeeAbove.prototype.promiseReturner = Promise.promisify(function (opts,callback) {
  return this.promiseMethod(opts, callback);
});


SeeAbove.prototype.synchronousMethodHappnOrigin = function (opts, opts2, $happn, $origin) {

  if (!$happn) throw new Error('$happn is meant to exist');
  if (!$origin) throw new Error('$origin is meant to exist');

  return opts + opts2;
};

SeeAbove.prototype.synchronousMethod = function (opts, opts2) {
  return opts + opts2;
};

SeeAbove.prototype.$happner = {
  config: {
    'component': {
      schema: {
        methods: {
          'methodName1': {
            alias: 'ancientmoth'
          },
          'synchronousMethod': {
            type: 'sync-promise'//NB - this is how you can wrap a synchronous method with a promise
          },
          'synchronousMethodHappnOrigin': {
            type: 'sync-promise'//NB - this is how you can wrap a synchronous method with a promise
          },
          'fireAndForget': {
            type: 'sync'
          }
        }
      }
    }
  }
};


if (global.TESTING_18) return; // When 'requiring' the module above,
// don't run the tests below
//.............
var should = require('chai').should();

describe('a8 - exchange supports promises', function () {

  require('benchmarket').start();
  after(require('benchmarket').store());

  var Mesh = require('../');
  var mesh;

  this.timeout(120000);

  before(function (done) {

    global.TESTING_18 = true; //.............

    mesh = this.mesh = new Mesh();

    mesh.initialize({
      dataLayer: {
        setOptions: {
          timeout: 1000
        }
      },
      util: {
        //logLevel: 'trace'
      },
      modules: {
        'component': {
          path: __filename   // .............
        }
      },
      components: {
        'component': {}
      }
    }, function (err) {
      delete global.TESTING_18; //.............
      if (err) return done(err);
      done();
    });
  });

  after(function (done) {
    mesh.stop({reconnect: false}, done);
  });

  it('supports non-promises in the exchange', function (done) {

    this.mesh.exchange.component.methodName1({number: 1}, function (err, res) {

      res.should.eql({number: 2});
      done();

    });

  });


  it('supports promises in the exchange', function (done) {

    this.mesh.exchange.component.methodName1({number: 1})

      .then(function (res) {
        res.should.eql({number: 2});
        done();
      })

  });


  it('the promise implementation supports .catch from callback error', function (done) {

    this.mesh.exchange.component.methodName1({errorAs: 'callback'})

      .then(function (res) {
        done(new Error('did not catch'));
      })

      .catch(function (err) {
        err.should.match(/THIS IS JUST A TEST/);
        done();
      })

  });


  it('the promise implementation supports .catch from thrown error', function (done) {

    this.mesh.exchange.component.methodName1({errorAs: 'throw'})

      .then(function (res) {
        console.log(res);
        done(new Error('did not catch'));
      })

      .catch(function (err) {
        err.should.match(/THIS IS JUST A TEST/);
        done();
      })

  });


  it('supports non-promises on the alias', function (done) {

    this.mesh.exchange.component.ancientmoth({number: 1}, function (err, res) {

      res.should.eql({number: 2});
      done();

    });

  })


  it('supports promises on the alias', function (done) {

    this.mesh.exchange.component.ancientmoth({number: 1})

      .then(function (res) {
        res.should.eql({number: 2});
        done();
      });

  });

  it('supports fire and forget', function (done) {

    this.timeout(1500);

    this.mesh.exchange.component.methodName1({errorAs: 'throw'});
    done();
  });

  it('supports calling a synchronous method and getting a promise back', function (done) {

    this.timeout(1500);

    this.mesh.exchange.component.synchronousMethod(1, 2)

      .then(function (res) {
        res.should.eql(3);
        done();
      })

      .catch(function (err) {
        done(err);
      })
    ;

  });

  it('supports calling a synchronous method with $happn and $origin and getting a promise back', function (done) {

    this.timeout(1500);

    this.mesh.exchange.component.synchronousMethodHappnOrigin(1, 2)

      .then(function (res) {
        res.should.eql(3);
        done();
      })

      .catch(function (err) {
        done(err);
      })
    ;

  });

  it('supports calling a synchronous method fire and forget', function (done) {

    this.timeout(1500);
    this.mesh.exchange.component.synchronousMethod(1, 2);
    done();

  });

  it('supports exposing a promise on the exchange', function (done) {

    this.mesh.exchange.component.promiseMethod({number: 1})

      .then(function (res) {
        res.should.eql({number: 2});
        done();
      })

  });

  it('supports calling a promise from a promise on the exchange', function (done) {

    this.timeout(1500);
    var _this = this;

    this.mesh.exchange.component.promisePromiseCaller({number: 1})

      .then(function (res) {
        res.should.eql({number: 2});
        done();
      }.bind(_this))

  });

  it('supports calling a promise from a method on the exchange', function (done) {

    this.timeout(1500);

    this.mesh.exchange.component.promiseCaller({number: 1})

      .then(function (res) {
        res.should.eql({number: 2});
        done();
      })

  });


  it('supports returning a promise from a method on the exchange', function (done) {

    this.timeout(1500);

    this.mesh.exchange.component.promiseReturner({number: 1})
      .then(function (res) {
        res.should.eql({number: 2});
        done();
      })

  });

  it('supports returning a promise from a method on the exchange with no callback', function (done) {

    this.timeout(1500);

    this.mesh.exchange.component.promiseReturnerNoCallback({number: 1})
      .then(function (res) {
        res.should.eql({number: 2});
        done();
      })

  });

  it('supports returning a promise from a method on the exchange that throws an error', function (done) {

    this.timeout(1500);

    this.mesh.exchange.component.promiseReturnerNoCallback({number: 1, errorAs: 'throw'})
      .then(function () {
        done(new Error('should not get here'));
      })
      .catch(function (err) {
        err.message.should.eql('THIS IS JUST A TEST THAT THROWS AN ERROR');
        done();
      });
  });

  it('supports returning a promise from a method on the exchange that callbacks an error', function (done) {

    this.timeout(1500);

    this.mesh.exchange.component.promiseReturnerNoCallback({number: 1, errorAs: 'callback'})
      .then(function () {
        done(new Error('should not get here'));
      })
      .catch(function (err) {
        err.message.should.eql('THIS IS JUST A TEST WITH CALLBACK ERROR');
        done();
      });
  });

  it('does not time out a sync function', function (done) {

    this.timeout(2500);

    this.mesh.exchange.component.fireAndForget({number: 1})
      .then(function (res) {
        // should never get here
        done(new Error('Should not get a result'));
      })
      .catch(function (err) {
        done(err);
      });

    setTimeout(done, 2000);

  });

  it('does not fire a callback twice', function (done) {

    this.timeout(2000);

    this.mesh.exchange.component.callCallbackTwice({number: 1}, function (err, result) {
      result.number.should.eql(2);
      setTimeout(done, 500);
    });
  });


  require('benchmarket').stop();

});

