describe(
  require('../../__fixtures/utils/test_helper')
    .create()
    .testName(__filename, 3),
  function() {
    this.timeout(120000);

    const util = require('util');
    var should = require('chai').should();
    var Mesh = require('../../..');
    var meshInstance;
    var dataEvents;
    var expect = require('expect.js');
    var Promise = require('bluebird');

    var TestModule1 = {
      setSharedData: function($happn, path, data, callback) {
        $happn.exchange.data.set(path, data, callback);
      }
    };

    var TestModule2 = {
      getSharedData: function($happn, path, callback) {
        $happn.exchange.data.get(path, callback);
      }
    };

    before(function(done) {
      Mesh.create({
        port: 9898,
        modules: {
          module1: {
            instance: TestModule1
          },
          module2: {
            instance: TestModule2
          }
        },
        components: {
          data: {},
          module1: {},
          module2: {}
        }
      })
        .then(function(mesh) {
          meshInstance = mesh;
          dataComponent = mesh.exchange.data;
          dataEvents = mesh.event.data;
          done();
        })
        .catch(done);
    });

    after(function(done) {
      meshInstance.stop({ reconnect: false }, done);
    });

    context('direct use', function() {
      it('can set and get with opts', function(done) {
        dataComponent.set('some/path/one', { key: 'value' }, {}, function(e) {
          if (e) return done(e);
          dataComponent.get('some/path/one', {}, function(e, result) {
            if (e) return done(e);
            result.key.should.equal('value');
            done();
          });
        });
      });

      it('can set and get without opts', function(done) {
        dataComponent.set('some/path/two', { key: 'value' }, function(e) {
          if (e) return done(e);
          dataComponent.get('some/path/two', function(e, result) {
            if (e) return done(e);
            result.key.should.equal('value');
            done();
          });
        });
      });

      it('can subscribe with opts', function(done) {
        dataComponent.on(
          '/some/path/three',
          {},
          function(data) {
            data.should.eql({ key: 'VAL' });
            done();
          },
          function(e) {
            if (e) return done(e);
            dataComponent.set('/some/path/three', { key: 'VAL' }, {}, function(e) {
              if (e) return done(e);
            });
          }
        );
      });

      it('can support concurrent subscriptions without counts - works', async () => {
        const updates = [];
        const on = util.promisify(dataComponent.on);
        const off = util.promisify(dataComponent.off);
        const sub1 = await on('/some/path/four', data =>
          updates.push({ name: 'sub1', data: data })
        );
        await dataComponent.set('/some/path/four', { key: 'VAL' });
        const sub2 = await on('/some/path/four', data =>
          updates.push({ name: 'sub2', data: data })
        );
        await dataComponent.set('/some/path/four', { key: 'VAL-2' });
        await new Promise(resolve => setTimeout(resolve, 1000));
        expect(updates).eql([
          { name: 'sub1', data: { key: 'VAL' } },
          { name: 'sub1', data: { key: 'VAL-2' } },
          { name: 'sub2', data: { key: 'VAL-2' } }
        ]);
        await off(sub1);
        await off(sub2);
      });

      it('can support concurrent subscriptions with count expiry - 1', async () => {
        const updates = [];
        const on = util.promisify(dataComponent.on);
        await on('/some/path/five', { count: 1 }, data =>
          updates.push({ name: 'sub1', data: data })
        );
        await dataComponent.set('/some/path/five', { key: 'VAL' });
        await on('/some/path/five', { count: 1 }, data =>
          updates.push({ name: 'sub2', data: data })
        );
        await dataComponent.set('/some/path/five', { key: 'VAL-2' });
        await new Promise(resolve => setTimeout(resolve, 1000));
        expect(updates).eql([
          { name: 'sub1', data: { key: 'VAL' } },
          { name: 'sub2', data: { key: 'VAL-2' } }
        ]);
      });

      it('can support concurrent subscriptions with count expiry - 2', async () => {
        const updates = [];
        const on = util.promisify(dataComponent.on);
        await on('/some/path/six', { count: 2 }, data =>
          updates.push({ name: 'sub1', data: data })
        );
        await dataComponent.set('/some/path/six', { key: 'VAL' });
        await on('/some/path/six', { count: 1 }, data =>
          updates.push({ name: 'sub2', data: data })
        );
        await dataComponent.set('/some/path/six', { key: 'VAL-2' });
        await new Promise(resolve => setTimeout(resolve, 1000));
        expect(updates).eql([
          { name: 'sub1', data: { key: 'VAL' } },
          { name: 'sub1', data: { key: 'VAL-2' } },
          { name: 'sub2', data: { key: 'VAL-2' } }
        ]);
      });

      it('can subscribe without opts', function(done) {
        dataComponent.on(
          '/some/path/seven',
          function(data) {
            data.should.eql({ key: 'VALUE' });
            done();
          },
          function(e) {
            if (e) return done(e);
            dataComponent.set('/some/path/seven', { key: 'VALUE' }, function(e) {
              if (e) return done(e);
            });
          }
        );
      });

      it('should subscribe and get an initial value on the callback', function(callback) {
        dataComponent.set(
          '/b7/testsubscribe/data/value_on_callback_test',
          { test: 'data' },
          function(e) {
            if (e) return callback(e);

            dataComponent.on(
              '/b7/testsubscribe/data/value_on_callback_test',
              {
                event_type: 'set',
                initialCallback: true
              },
              function(message) {
                expect(message.updated).to.be(true);
                callback();
              },
              function(e, reference, response) {
                if (e) return callback(e);
                try {
                  expect(response.length).to.be(1);
                  expect(response[0].test).to.be('data');

                  dataComponent.set(
                    '/b7/testsubscribe/data/value_on_callback_test',
                    {
                      test: 'data',
                      updated: true
                    },
                    function(e) {
                      if (e) return callback(e);
                    }
                  );
                } catch (e) {
                  return callback(e);
                }
              }
            );
          }
        );
      });

      it('should subscribe and get initial values on the callback', function(callback) {
        dataComponent.set(
          '/b7/testsubscribe/data/values_on_callback_test/1',
          { test: 'data' },
          function(e) {
            if (e) return callback(e);

            dataComponent.set(
              '/b7/testsubscribe/data/values_on_callback_test/2',
              { test: 'data1' },
              function(e) {
                if (e) return callback(e);

                dataComponent.on(
                  '/b7/testsubscribe/data/values_on_callback_test/*',
                  {
                    event_type: 'set',
                    initialCallback: true
                  },
                  function(message) {
                    expect(message.updated).to.be(true);
                    callback();
                  },
                  function(e, reference, response) {
                    if (e) return callback(e);
                    try {
                      expect(response.length).to.be(2);
                      expect(response[0].test).to.be('data');
                      expect(response[1].test).to.be('data1');

                      dataComponent.set(
                        '/b7/testsubscribe/data/values_on_callback_test/1',
                        {
                          test: 'data',
                          updated: true
                        },
                        function(e) {
                          if (e) return callback(e);
                        }
                      );
                    } catch (e) {
                      return callback(e);
                    }
                  }
                );
              }
            );
          }
        );
      });

      it('should subscribe and get initial values emitted immediately', function(callback) {
        var caughtEmitted = 0;

        dataComponent.set(
          '/b7/testsubscribe/data/values_emitted_test/1',
          { test: 'data' },
          function(e) {
            if (e) return callback(e);

            dataComponent.set(
              '/b7/testsubscribe/data/values_emitted_test/2',
              { test: 'data1' },
              function(e) {
                if (e) return callback(e);

                dataComponent.on(
                  '/b7/testsubscribe/data/values_emitted_test/*',
                  {
                    event_type: 'set',
                    initialEmit: true
                  },
                  function(message) {
                    caughtEmitted++;

                    if (caughtEmitted === 2) {
                      expect(message.test).to.be('data1');
                      callback();
                    }
                  },
                  function(e) {
                    if (e) return callback(e);
                  }
                );
              }
            );
          }
        );
      });

      it('can unsubscribe', function(done) {
        var received = [];
        dataComponent.on(
          '/some/path/five',
          function(data) {
            received.push(data);
          },
          function(e) {
            if (e) return done(e);
            dataComponent
              .set('/some/path/five', { key: 1 }) // <--------------- 1
              .then(function() {
                return dataComponent.set('/some/path/five', { key: 1 }); // <------ 2
              })
              .then(function() {
                return dataComponent.offPath('/some/path/five'); // <------------- unsub
              })
              .then(function() {
                return dataComponent.set('/some/path/five', { key: 1 }); // <------- 3
              })
              .then(function() {
                received.length.should.equal(2);
                done();
              })
              .catch(done);
          }
        );
      });

      it('can unsubscribe from all', function(done) {
        var received = [];
        dataComponent.on(
          '/some/path/six',
          function(data) {
            received.push(data);
          },
          function(e) {
            if (e) return done(e);
            dataComponent
              .set('/some/path/six', { key: 1 }) // <--------------- 1
              .then(function() {
                return dataComponent.set('/some/path/six', { key: 1 }); // <------ 2
              })
              .then(function() {
                return dataComponent.offAll();
              })
              .then(function() {
                return dataComponent.set('/some/path/six', { key: 1 }); // <------- 3
              })
              .then(function() {
                received.length.should.equal(2);
                done();
              })
              .catch(done);
          }
        );
      });

      it('can unsubscribe from a path', function(done) {
        var received = [];
        dataComponent.on(
          '/some/path/seven',
          function(data) {
            received.push(data);
          },
          function(e) {
            if (e) return done(e);
            dataComponent
              .set('/some/path/seven', { key: 1 }) // <--------------- 1
              .then(function() {
                return dataComponent.set('/some/path/seven', { key: 1 }); // <------ 2
              })
              .then(function() {
                return dataComponent.offPath('/some/path/seven');
              })
              .then(function() {
                return dataComponent.set('/some/path/seven', { key: 1 }); // <------- 3
              })
              .then(function() {
                received.length.should.equal(2);
                done();
              })
              .catch(done);
          }
        );
      });

      it('can delete', function(done) {
        dataComponent
          .set('some/path/eight', 6)
          .then(function() {
            return dataComponent.get('some/path/eight');
          })
          .then(function(six) {
            six.value.should.equal(6);
            return dataComponent.remove('some/path/eight');
          })
          .then(function() {
            return dataComponent.get('some/path/eight');
          })
          .then(function(res) {
            should.not.exist(res);
            done();
          })
          .catch(done);
      });

      it('can get paths', function(done) {
        Promise.all([
          dataComponent.set('this/one', 1),
          dataComponent.set('this/two', 2),
          dataComponent.set('this/three', 3)
        ])
          .then(function() {
            return dataComponent.getPaths('this/*');
          })
          .then(function(paths) {
            paths.length.should.equal(3);
            done();
          })
          .catch(done);
      });

      it('can subscribe to data change with events', function(done) {
        dataEvents.on(
          '/some/path/five',
          function(data) {
            data.should.property('key', 'VALUE');
            dataEvents.off('/some/path/five', function() {
              done();
            });
          },
          function(e) {
            if (e) return done(e);
            dataComponent.set('/some/path/five', { key: 'VALUE' }, function(e) {
              if (e) return done(e);
            });
          }
        );
      });

      it('works with noPublish option', function(done) {
        meshInstance.event.data.on(
          '/some/path/testNoPublish2',
          function(data) {
            delete data._meta;
            data.should.eql({ val: 'must be emitted' });
            // allow time for possible wrong event
            setTimeout(done, 1000);
          },
          function(e) {
            if (e) return done(e);
            dataComponent.set(
              '/some/path/testNoPublish2',
              { val: 'must not be emitted' },
              { noPublish: true },
              function(e) {
                if (e) return done(e);
                dataComponent.set(
                  '/some/path/testNoPublish2',
                  { val: 'must be emitted' },
                  undefined,
                  function(e) {
                    if (e) return done(e);
                  }
                );
              }
            );
          }
        );
      });

      it('increments a value on a path', function(done) {
        var async = require('async');

        async.timesSeries(
          10,
          function(time, timeCB) {
            dataComponent.set(
              'test/increment/multiple',
              'counter',
              { increment: 1, noPublish: true },
              timeCB
            );
          },
          function(e) {
            if (e) return done(e);

            dataComponent.get('test/increment/multiple', function(e, result) {
              if (e) return done(e);

              expect(result.counter.value).to.be(10);

              done();
            });
          }
        );
      });

      it('increments a value on a path, multiple gauges', function(done) {
        var async = require('async');

        async.timesSeries(
          10,
          function(time, timeCB) {
            dataComponent.set(
              'test/increment/multiple/gauges',
              'counter-' + time,
              { increment: 1, noPublish: true },
              function(e) {
                timeCB(e);
              }
            );
          },
          function(e) {
            if (e) return done(e);

            dataComponent.get('test/increment/multiple/gauges', function(e, result) {
              if (e) return done(e);

              expect(result['counter-0'].value).to.be(1);
              expect(result['counter-1'].value).to.be(1);
              expect(result['counter-2'].value).to.be(1);
              expect(result['counter-3'].value).to.be(1);
              expect(result['counter-4'].value).to.be(1);
              expect(result['counter-5'].value).to.be(1);
              expect(result['counter-6'].value).to.be(1);
              expect(result['counter-7'].value).to.be(1);
              expect(result['counter-8'].value).to.be(1);
              expect(result['counter-9'].value).to.be(1);

              done();
            });
          }
        );
      });

      it('increments a value on a path, convenience method, listens on path receives event', function(done) {
        dataComponent.on(
          'increment/event',
          function(data) {
            expect(data.value).to.be(1);
            expect(data.gauge).to.be('counter');

            done();
          },
          function(e) {
            if (e) return done(e);

            dataComponent.increment('increment/event', 1, function(e) {
              if (e) return done(e);
            });
          }
        );
      });
    });

    context('shared use', function() {
      it('can set from one component and getted from another', function(done) {
        meshInstance.exchange.module1
          .setSharedData('/my/thing', { y: 'x' })
          .then(function() {
            return meshInstance.exchange.module2.getSharedData('/my/thing');
          })
          .then(function(d) {
            d.y.should.equal('x');
            done();
          })
          .catch(done);
      });
    });

    context(
      'subscribe to all events to specific depth, variable depth subscription capability added to happn',
      function() {
        it('does a variable depth on which eclipses another .on, do off and ensure the correct handlers are called', function(done) {
          var results = [];

          dataComponent.on(
            '/test/path/**',
            { depth: 4 },
            function(data, meta) {
              results.push({ data: data, channel: meta.channel, path: meta.path });
            },
            function(e, handle1) {
              if (e) return done(e);
              dataComponent.on(
                '/test/path/1/**',
                { depth: 4 },
                function(data, meta) {
                  results.push({ data: data, channel: meta.channel, path: meta.path });
                },
                function(e) {
                  if (e) return done(e);
                  dataComponent.set('/test/path/1/1', { set: 1 }, function(e) {
                    if (e) return done(e);
                    dataComponent.off(handle1, function(e) {
                      if (e) return done(e);
                      dataComponent.set('/test/path/1/1', { set: 2 }, function(e) {
                        if (e) return done(e);
                        expect(results).to.eql([
                          {
                            data: { set: 1 },
                            channel: '/ALL@/_data/data/test/path/1/**',
                            path: '/_data/data/test/path/1/1'
                          },
                          {
                            data: { set: 1 },
                            channel: '/ALL@/_data/data/test/path/**',
                            path: '/_data/data/test/path/1/1'
                          },
                          {
                            data: { set: 2 },
                            channel: '/ALL@/_data/data/test/path/1/**',
                            path: '/_data/data/test/path/1/1'
                          }
                        ]);
                        done();
                      });
                    });
                  });
                }
              );
            }
          );
        });

        it('should subscribe and get initial values on the callback', function(callback) {
          dataComponent.set(
            '/initialCallback/testsubscribe/data/values_on_callback_test/1',
            {
              test: 'data'
            },
            function(e) {
              if (e) return callback(e);

              dataComponent.set(
                '/initialCallback/testsubscribe/data/values_on_callback_test/2',
                {
                  test: 'data1'
                },
                function(e) {
                  if (e) return callback(e);

                  dataComponent.on(
                    '/initialCallback/**',
                    {
                      event_type: 'set',
                      initialCallback: true
                    },
                    function(message) {
                      expect(message.updated).to.be(true);
                      callback();
                    },
                    function(e, reference, response) {
                      if (e) return callback(e);
                      try {
                        expect(response.length).to.be(2);
                        expect(response[0].test).to.be('data');
                        expect(response[1].test).to.be('data1');

                        dataComponent.set(
                          '/initialCallback/testsubscribe/data/values_on_callback_test/1',
                          {
                            test: 'data',
                            updated: true
                          },
                          function(e) {
                            if (e) return callback(e);
                          }
                        );
                      } catch (err) {
                        return callback(err);
                      }
                    }
                  );
                }
              );
            }
          );
        });

        it('should subscribe and get initial values emitted immediately', function(callback) {
          var caughtEmitted = 0;

          dataComponent.set(
            '/initialEmitSpecific/testsubscribe/data/values_emitted_test/1',
            {
              test: 'data'
            },
            function(e) {
              if (e) return callback(e);

              dataComponent.set(
                '/initialEmitSpecific/testsubscribe/data/values_emitted_test/2',
                {
                  test: 'data1'
                },
                function(e) {
                  if (e) return callback(e);

                  dataComponent.on(
                    '/initialEmitSpecific/**',
                    {
                      event_type: 'set',
                      initialEmit: true
                    },
                    function(message) {
                      caughtEmitted++;

                      if (caughtEmitted === 2) {
                        expect(message.test).to.be('data1');
                        callback();
                      }
                    },
                    function(e) {
                      if (e) return callback(e);
                    }
                  );
                }
              );
            }
          );
        });

        it('should subscribe and get initial values on the callback, to the correct depth', async () => {
          this.timeout(10000);

          var caughtEmitted = [];

          dataComponent.onAsync = Promise.promisify(dataComponent.on);

          await dataComponent.set('/initialEmitSpecificCorrectDepth/testsubscribe/1', {
            test: 'data1'
          });

          await dataComponent.set('/initialEmitSpecificCorrectDepth/testsubscribe/2', {
            test: 'data2'
          });

          await dataComponent.set('/initialEmitSpecificCorrectDepth/testsubscribe/3', {
            test: 'data3'
          });

          await dataComponent.set('/initialEmitSpecificCorrectDepth/testsubscribe/3/4', {
            test: 'data4'
          });

          await dataComponent.set('/initialEmitSpecificCorrectDepth/testsubscribe/3/4/5', {
            test: 'data5'
          });

          await dataComponent.set('/initialEmitSpecificCorrectDepth/testsubscribe/3/4/5/6', {
            test: 'data6'
          });

          await dataComponent.onAsync(
            '/initialEmitSpecificCorrectDepth/testsubscribe/**',
            {
              event_type: 'set',
              initialEmit: true,
              depth: 2
            },
            function(data) {
              caughtEmitted.push(data._meta.path);
            }
          );

          expect(caughtEmitted.sort()).to.eql([
            '/_data/data/initialEmitSpecificCorrectDepth/testsubscribe/1',
            '/_data/data/initialEmitSpecificCorrectDepth/testsubscribe/2',
            '/_data/data/initialEmitSpecificCorrectDepth/testsubscribe/3',
            '/_data/data/initialEmitSpecificCorrectDepth/testsubscribe/3/4'
          ]);
        });

        it('should subscribe and get initial values emitted immediately, to the correct depth', async () => {
          this.timeout(10000);

          await dataComponent.set('/initialCallbackCorrectDepth/testsubscribe/1', {
            test: 'data1'
          });

          await dataComponent.set('/initialCallbackCorrectDepth/testsubscribe/2', {
            test: 'data2'
          });

          await dataComponent.set('/initialCallbackCorrectDepth/testsubscribe/3', {
            test: 'data3'
          });

          await dataComponent.set('/initialCallbackCorrectDepth/testsubscribe/3/4', {
            test: 'data4'
          });

          await dataComponent.set('/initialCallbackCorrectDepth/testsubscribe/3/4/5', {
            test: 'data5'
          });

          await dataComponent.set('/initialCallbackCorrectDepth/testsubscribe/3/4/5/6', {
            test: 'data6'
          });

          var results = await new Promise(function(resolve, reject) {
            dataComponent.on(
              '/initialCallbackCorrectDepth/testsubscribe/**',
              {
                event_type: 'set',
                initialCallback: true,
                depth: 2
              },
              function() {},
              function(e, reference, response) {
                if (e) return reject(e);
                resolve(
                  response
                    .map(function(item) {
                      return item._meta.path;
                    })
                    .sort()
                );
              }
            );
          });

          expect(results).to.eql([
            '/_data/data/initialCallbackCorrectDepth/testsubscribe/1',
            '/_data/data/initialCallbackCorrectDepth/testsubscribe/2',
            '/_data/data/initialCallbackCorrectDepth/testsubscribe/3',
            '/_data/data/initialCallbackCorrectDepth/testsubscribe/3/4'
          ]);
        });
      }
    );
  }
);