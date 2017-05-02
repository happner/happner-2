module.exports = TestComponent;

function TestComponent() {
}

TestComponent.prototype.method1 = function ($happn, args, callback) {

  // var e = new Error('xxx');
  // console.log(e.stack);

  // console.log('1 ARGS', args);
  // console.log('1 CALLBACK', callback);

  callback = args; // callback comes in position1

  callback(null, 'result1');
}

TestComponent.prototype.method2 = function ($happn, args, callback) {
  // console.log('1 ARGS', args);
  // console.log('1 CALLBACK', callback);

  callback(null, 'result2');
}


if (global.TESTING_C5) return; // When 'requiring' the module above,
// don't run the tests below
//.............


describe('c5 - multiple exchange calls', function () {

  this.timeout(120000);

  var expect = require('expect.js');
  var Mesh = require('happner');
  var Mesh2 = require('../..');

  /*
   * Note: also tests that args arrive in the called sequence.
   *
   * eg. When calling function(arg1, callback) with only the callback os the only arg
   *     then the resulting call actoss the exchange has arg1 as the callback
   *     and callback as undefined)
   *
   */

  before(function () {
    global.TESTING_C5 = true; //.............
  });

  beforeEach(function (done) {
    var _this = this;
    Mesh2.create({
        port: 54545,
        modules: {
          'test': {
            path: __filename
          }
        },
        components: {
          'test': {
            module: 'test'
          }
        }
      })
      .then(function (mesh) {
        _this.mesh = mesh;
      })
      .then(done).catch(done);
  });

  afterEach(function (done) {
    this.mesh.stop({reconnect: false}, done);
  });

  it('client can call more than one method in sequence (callback)', function (done) {
    var client = new Mesh.MeshClient({
      port: 54545
    });
    client.login().then(function () {

      client.exchange.test.method1(function (e, result) {

        if (e) return done(e);
        expect(result).to.equal('result1');

        var args = {};

        client.exchange.test.method2(args, function (e, result) {

          if (e) return done(e);
          expect(result).to.equal('result2');
          done();

        });
      });
    });
  });


  it('client can call more than one method in sequence (promise)', function (done) {
    var client = new Mesh.MeshClient({
      port: 54545
    });
    client.login().then(function () {

      client.exchange.test.method1()

        .then(function (result) {
          expect(result).to.equal('result1');
          var args = {};
          return client.exchange.test.method2(args);
        })

        .then(function (result) {
          expect(result).to.equal('result2');
        })

        .then(done).catch(done);

    });
  });

});

