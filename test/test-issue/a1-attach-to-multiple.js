describe(require('path').basename(__filename), function () {

  //require('benchmarket').start();
  //after(//require('benchmarket').store());

  var promise = require('when').promise;
  var parallel = require('when/parallel');
  var spawn = require('child_process').spawn;
  var sep = require('path').sep;
  var libFolder = __dirname + sep + 'lib' + sep;
  var should = require('chai').should();
  var Mesh = require('../');

  var bunchOfRemoteNodes = [1, 2, 3];

  this.timeout(60000);

  before(function (done) {

    var _this = this;

    var kids = this.kids = [];

    var config = {
      endpoints: {}
    };

    parallel(
      bunchOfRemoteNodes.map(
        function (i) {   // for each i, re-map to...
          return function () {  // ...to an array of functions, ie. parallel([fn,fn,fn])
            return promise(  // each function returns a promise
              function (resolve, reject) { // receive resolve() and reject() from promise()
                var kid;
                // argv[2]
                kids.push(kid = spawn(                   // i in kid as (3000 + i) port
                  'node', [libFolder + 'a1-remote-mesh', i]
                ));

                kid.stdout.on('data', function (data) {
                  // console._stdout.write('remote' +i+ ' ' + data.toString());
                  if (data.toString().match(/READY/)) resolve();
                });

                kid.on('exit', function () {
                  reject(new Error('kid ' + i + ' exited'))
                  // this also runs in the after hook, but the rejection will
                  // be ignored because the promise will have already resolved()
                  // (cannot resolve and then reject)
                });

                // assemble endpoints in local mesh config per i
                config.endpoints['mesh' + i] = {
                  config: {
                    port: 3000 + i,
                    host: 'localhost'
                  }
                }
              }
            )
          }
        }
      )
    ).then(function () {

      // console.log(config);

      // local mesh init
      return Mesh.create(config);
    })

      .then(function (mesh) {
        _this.mesh = mesh;
        done();
      })

      .catch(function (e) {
        done(e);
      });
    // call done with rejections error (if)
  });

  after(function (done) {

    var _this = this;

    var __timeout = _this.kids.length * 500;

    this.timeout(__timeout + 5000);

    _this.kids.forEach(function (kid) {
      // console.log('killing kid', kid);
      kid.kill();
    });

    console.log('killed kids:::');

    _this.mesh.stop({reconnect: false}, function(e){

      if (e) {

        console.log('failed to stop', e);
        return done(e);
      }

      done();
    });


  });

  it('can call methods on all', function (done) {

    var i = 0;
    var mesh = this.mesh;
    var expecting = this.kids.map(function (kid) {
      return [++i, kid.pid];
    });

    parallel(
      bunchOfRemoteNodes.map(
        function (i) {
          return function () {
            return promise(
              function (resolve, reject) {
                mesh.exchange['mesh' + i].component.getPid(function (err, pid) {
                  if (err) return reject(err);
                  resolve([i, pid]);
                });
              }
            )
          }
        }
      )
    ).then(function (iPids) {

      iPids.should.eql(expecting);
      done();

    }).catch(done)
  });


  //require('benchmarket').stop();

});
