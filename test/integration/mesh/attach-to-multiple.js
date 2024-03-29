var path = require('path');

describe(
  require('../../__fixtures/utils/test_helper')
    .create()
    .testName(__filename, 3),
  function() {
    var promise = require('when').promise;
    var parallel = require('when/parallel');
    var spawn = require('child_process').spawn;
    var libFolder =
      path.resolve(__dirname, '../../..') +
      path.sep +
      ['test', '__fixtures', 'test', 'integration', 'mesh'].join(path.sep) +
      path.sep;
    require('chai').should();
    var Mesh = require('../../..');

    var bunchOfRemoteNodes = [1, 2, 3];

    this.timeout(60000);

    before(function(done) {
      var _this = this;

      if (process.env.RUNNING_IN_ACTIONS) return done();
      var kids = (this.kids = []);

      var config = {
        endpoints: {}
      };

      parallel(
        bunchOfRemoteNodes.map(function(i) {
          // for each i, re-map to...
          return function() {
            // ...to an array of functions, ie. parallel([fn,fn,fn])
            return promise(
              // each function returns a promise
              function(resolve, reject) {
                // receive resolve() and reject() from promise()
                var kid;
                // argv[2]
                kids.push(
                  (kid = spawn(
                    // i in kid as (3000 + i) port
                    'node',
                    [libFolder + 'a1-remote-mesh', i]
                  ))
                );

                kid.stdout.on('data', function(data) {
                  // console._stdout.write('remote' +i+ ' ' + data.toString());
                  if (data.toString().match(/READY/)) resolve();
                });

                kid.on('exit', function() {
                  reject(new Error('kid ' + i + ' exited'));
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
                };
              }
            );
          };
        })
      )
        .then(function() {
          return Mesh.create(config);
        })

        .then(function(mesh) {
          _this.mesh = mesh;
          done();
        })

        .catch(function(e) {
          done(e);
        });
    });

    after(function(done) {
      if (process.env.RUNNING_IN_ACTIONS) return done();
      this.kids.forEach(function(kid) {
        kid.kill();
      });
      this.mesh.stop({ reconnect: false }, done);
    });

    it('can call methods on all', function(done) {
      if (process.env.RUNNING_IN_ACTIONS) return done();

      var i = 0;
      var mesh = this.mesh;
      var expecting = this.kids.map(function(kid) {
        return [++i, kid.pid];
      });

      parallel(
        bunchOfRemoteNodes.map(function(i) {
          return function() {
            return promise(function(resolve, reject) {
              mesh.exchange['mesh' + i].component.getPid(function(err, pid) {
                if (err) return reject(err);
                resolve([i, pid]);
              });
            });
          };
        })
      )
        .then(function(iPids) {
          iPids.should.eql(expecting);
          done();
        })
        .catch(done);
    });
  }
);
