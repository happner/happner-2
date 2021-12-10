var path = require('path');
var sep = path.sep;
var testName = path.basename(__filename);

describe(
  require('../../__fixtures/utils/test_helper')
    .create()
    .testName(__filename, 3),
  function() {
    this.timeout(120000);

    var libFolder =
      path.resolve(__dirname, '../../..') +
      sep +
      ['test', '__fixtures', 'test', 'integration', 'exchange'].join(sep) +
      sep;
    var Happner = require('../../..');
    var async = require('async');
    require('chai').should();
    var test_id = Date.now() + '_' + require('shortid').generate();
    var dbFileName = '.' + path.sep + 'temp' + path.sep + test_id + '.nedb';
    var mesh;
    var fs = require('fs');

    try {
      fs.unlinkSync(dbFileName);
    } catch (e) {
      // do nothing
    }

    var exchangeIterations = process.arch === 'arm' ? 100 : 1000;
    var allowedOverhead = 1500; // Based on tests with node 6. setImmediate introduces variation in the test result
    if (process.env.RUNNING_IN_ACTIONS === 'yes') allowedOverhead = 3000;

    var config = {
      name: testName,
      happn: {
        secure: true,
        persist: true,
        defaultRoute: 'mem',
        filename: dbFileName,
        adminPassword: 'xxx'
      },
      modules: {
        module: {
          path: path.join(libFolder, testName),
          constructor: {
            type: 'sync',
            parameters: []
          }
        }
      },
      components: {
        component: {
          moduleName: 'module',
          startMethod: 'start',
          schema: {
            exclusive: false,
            methods: {
              start: {
                type: 'sync',
                parameters: [{ type: 'object', name: 'options', value: {} }]
              }
            }
          }
        }
      }
    };

    before(function(done) {
      Happner.create(config)
        .then(function(createdMesh) {
          mesh = createdMesh;
          done();
        })
        .catch(done);
    });

    after(function(done) {
      try {
        fs.unlinkSync(dbFileName);
      } catch (e) {
        // do nothing
      }
      mesh.stop({ reconnect: false }, done);
    });

    it(
      'does not add more than ' + allowedOverhead + '% overhead on local exchange functions',
      function(done) {
        var diffTimeExchange;
        var diffTimeDirect;
        var object = {
          someProperty: 'This is the value',
          someNumberProperty: 0
        };
        var startTime = process.hrtime();
        async.timesSeries(
          exchangeIterations,
          function(iteration, cb) {
            mesh.exchange.component.exchangeFunction(object, cb);
          },
          function() {
            var diffTimeExchangeArray = process.hrtime(startTime);
            diffTimeExchange = diffTimeExchangeArray[0] + diffTimeExchangeArray[1] / 1000000000;
            mesh.log.info(
              exchangeIterations +
                ' exchange calls took %d seconds, added %d seconds overhead per call',
              diffTimeExchange,
              diffTimeExchange / exchangeIterations
            );
            runDirectly();
          }
        );

        function runDirectly() {
          var ModuleClass = require(path.join(libFolder, testName));
          var module = new ModuleClass();
          module.start({});
          startTime = process.hrtime();
          async.timesSeries(
            exchangeIterations,
            function(iterations, callback) {
              setImmediate(function() {
                module.exchangeFunction(object, function() {
                  return setImmediate(callback);
                });
              });
            },
            function() {
              var diffTimeDirectArray = process.hrtime(startTime);
              diffTimeDirect = diffTimeDirectArray[0] + diffTimeDirectArray[1] / 1000000000;
              mesh.log.info(
                exchangeIterations +
                  ' direct calls took %d seconds, added %d seconds overhead per call',
                diffTimeDirect,
                diffTimeDirect / exchangeIterations
              );
              var difference = ((diffTimeExchange - diffTimeDirect) / diffTimeDirect) * 100;
              mesh.log.info('Exchange is %d% slower than direct', difference);
              try {
                difference.should.be.lt(allowedOverhead);
                done();
              } catch (e) {
                done(e);
              }
            }
          );
        }
      }
    );

    context('as async with callback', function() {
      it('can call ok', function(done) {
        mesh.exchange.component.methodOk({ key: 'value' }, function(err, result) {
          try {
            result.should.eql({ key: 'value' });
            done();
          } catch (e) {
            done(e);
          }
        });
      });

      it('can call with error', function(done) {
        mesh.exchange.component.methodError(function(err) {
          try {
            err.toString().should.equal('Error: Some problem');
            done();
          } catch (e) {
            done(e);
          }
        });
      });

      it('can inject $happn into position 1', function(done) {
        mesh.exchange.component.methodInjectHappn1({}, function(err, result) {
          if (err) return done(err);
          result.meshName.should.equal(testName);
          done();
        });
      });

      it('can inject $happn into position 2', function(done) {
        mesh.exchange.component.methodInjectHappn2({}, function(err, result) {
          try {
            result.meshName.should.equal(testName);
            done();
          } catch (e) {
            done(e);
          }
        });
      });

      it('does inject $origin as _ADMIN', function(done) {
        mesh.exchange.component.methodInjectOrigin({ key: 'value' }, function(err, result) {
          try {
            result.should.eql({
              key: 'value',
              meshName: testName,
              originUser: '_ADMIN'
            });
            done();
          } catch (e) {
            done(e);
          }
        });
      });

      it('can inject $happn last', function(done) {
        mesh.exchange.component.methodInjectHappnLast({ key: 'value' }, function(err, result) {
          try {
            result.should.eql({
              key: 'value',
              meshName: testName,
              originUser: '_ADMIN'
            });
            done();
          } catch (e) {
            done(e);
          }
        });
      });
    });

    context('as async with promise', function() {
      it('can call ok', function(done) {
        mesh.exchange.component
          .methodOk({ key: 'value' })
          .then(function(result) {
            result.should.eql({ key: 'value' });
            done();
          })
          .catch(done);
      });

      it('can call with error', function(done) {
        mesh.exchange.component
          .methodError()
          .then(function() {
            done(new Error('should not succeed'));
          })
          .catch(function(error) {
            error.toString().should.equal('Error: Some problem');
            done();
          })
          .catch(done);
      });

      it('can inject $happn into position 1', function(done) {
        mesh.exchange.component
          .methodInjectHappn1({})
          .then(function(result) {
            result.meshName.should.equal(testName);
            done();
          })
          .catch(done);
      });

      it('can inject $happn into position 2', function(done) {
        mesh.exchange.component
          .methodInjectHappn2({})
          .then(function(result) {
            result.meshName.should.equal(testName);
            done();
          })
          .catch(done);
      });

      it('does inject $origin as _ADMIN', function(done) {
        mesh.exchange.component
          .methodInjectOrigin({ key: 'value' })
          .then(function(result) {
            result.should.eql({
              key: 'value',
              meshName: testName,
              originUser: '_ADMIN'
            });
            done();
          })
          .catch(done);
      });

      it('can inject $happn last', function(done) {
        mesh.exchange.component
          .methodInjectHappnLast({ key: 'value' })
          .then(function(result) {
            result.should.eql({
              key: 'value',
              meshName: testName,
              originUser: '_ADMIN'
            });
            done();
          })
          .catch(done);
      });
    });
    context('as async with async', function() {
      it('can call ok', async () => {
        const result1 = await mesh.exchange.component.asyncMethod(1, 2);
        result1.should.eql([1, 2]);
        const result2 = await mesh.exchange.component.asyncMethod(1);
        result2.should.eql([1, undefined]);
      });
    });
  }
);
