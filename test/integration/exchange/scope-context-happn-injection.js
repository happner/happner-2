var path = require('path');

describe(
  require('../../__fixtures/utils/test_helper')
    .create()
    .testName(__filename, 3),
  function() {
    require('chai').should();
    var promise = require('when').promise;
    var request = require('request');
    var Mesh = require('../../..');
    var libFolder =
      path.resolve(__dirname, '../../..') +
      path.sep +
      ['test', '__fixtures', 'test', 'integration', 'exchange'].join(path.sep);
    var async = require('async');
    var parallel = require('when/parallel');
    this.timeout(20000);

    var meshNo = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    var componentNo = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    var meshes = [];

    before(function(done) {
      async.eachSeries(
        meshNo,
        function(meshNoItem, meshNoItemCB) {
          var mesh = new Mesh();
          var COMPONENTS = {};

          componentNo.forEach(function(j) {
            COMPONENTS['component' + j] = {
              moduleName: 'module1',
              startMethod: 'start',
              stopMethod: 'stop',
              configThing: {
                mesh: meshNoItem,
                component: j
              }
            };

            COMPONENTS['webComponent' + j] = {
              moduleName: 'module3',
              web: {
                routes: {
                  methodWithHappn: 'methodWithHappn',
                  methodWithoutHappn: 'methodWithoutHappn',
                  methodWithHappnInFront: 'methodWithHappnInFront',
                  methodWithHappnInMiddle: 'methodWithHappnInMiddle',
                  methodWithHappnInEnd: 'methodWithHappnInEnd'
                }
              }
            };

            COMPONENTS['special-component' + j] = {
              moduleName: 'module2',
              schema: {
                exclusive: true,
                methods: {
                  getThingFromConfig: {},
                  methodNameFront: {
                    type: 'async',
                    parameters: [{ name: 'arg1' }, { name: 'callback' }]
                  },
                  methodNameMiddle: {
                    type: 'async',
                    parameters: [{ name: 'arg1' }, { name: 'callback' }]
                  },
                  methodNameEnd: {
                    type: 'async',
                    parameters: [{ name: 'arg1' }, { name: 'callback' }]
                  },
                  methodWithoutHappn: {
                    type: 'async',
                    parameters: [{ name: 'arg1' }, { name: 'callback' }]
                  },
                  callOnwardWithoutHappn: {},
                  callOnwardWithHappn: {},
                  methodWithHappn: {}
                }
              },
              configThing: {
                mesh: meshNoItem,
                component: j
              }
            };
          });

          mesh.initialize(
            {
              name: 'mesh' + meshNoItem,
              happn: {
                port: 3000 + meshNoItem
              },
              // endpoints: getEndpoints(i),
              modules: {
                module1: {
                  path: libFolder + '/11-module1.js'
                },
                module2: {
                  path: libFolder + '/11-module2.js'
                },
                module3: {
                  path: libFolder + '/11-module3.js'
                }
              },
              components: COMPONENTS
            },
            function(err) {
              if (err) return meshNoItemCB(err);

              mesh.start(function(err) {
                if (err) return meshNoItemCB(err);
                meshes.push(mesh);
                meshNoItemCB();
              });
            }
          );
        },
        done
      );
    });

    after(function(done) {
      async.eachSeries(
        meshes,
        function(mesh, meshCB) {
          mesh.stop({ reconnect: false }, function() {
            meshCB();
          });
        },
        done
      );
    });

    it('calls multiple components on multiple modules on multiple meshes', function() {
      // ensure each module call got $happn correctly
      parallel(
        // parallel each mesh calls every mesh's every component
        meshes.map(function(mesh) {
          return function() {
            // return parallel(  // parallel all meshes
            //   meshNo.map(
            //     function(i) {
            //       return function() {
            return parallel(
              // parallel every component
              componentNo.map(function(j) {
                return function() {
                  return promise(function(resolve, reject) {
                    var results = [];

                    // console.log('mesh'+i, 'component'+j)
                    // mesh.api.exchange['mesh'+i]['component'+j]

                    mesh.exchange['component' + j].getThingFromConfig(function(err, thing) {
                      if (err) return reject(err);
                      results.push(thing);

                      mesh.exchange['special-component' + j].getThingFromConfig(function(
                        err,
                        thing
                      ) {
                        if (err) return reject(err);
                        results.push(thing);
                        resolve([mesh._mesh.config.name + '.component' + j, results]);
                      });
                    });
                  });
                };
              })
            );
          };
        })
      ).then(function(results) {
        var formatted = {};

        results.forEach(function(meshResult) {
          meshResult.forEach(function(componentResults) {
            formatted[componentResults[0]] = componentResults[1];
          });
        });

        formatted.should.eql({
          'mesh1.component1': [
            { mesh: 1, component: 1 },
            { mesh: 1, component: 1 }
          ],
          'mesh1.component2': [
            { mesh: 1, component: 2 },
            { mesh: 1, component: 2 }
          ],
          'mesh1.component3': [
            { mesh: 1, component: 3 },
            { mesh: 1, component: 3 }
          ],
          'mesh1.component4': [
            { mesh: 1, component: 4 },
            { mesh: 1, component: 4 }
          ],
          'mesh1.component5': [
            { mesh: 1, component: 5 },
            { mesh: 1, component: 5 }
          ],
          'mesh1.component6': [
            { mesh: 1, component: 6 },
            { mesh: 1, component: 6 }
          ],
          'mesh1.component7': [
            { mesh: 1, component: 7 },
            { mesh: 1, component: 7 }
          ],
          'mesh1.component8': [
            { mesh: 1, component: 8 },
            { mesh: 1, component: 8 }
          ],
          'mesh1.component9': [
            { mesh: 1, component: 9 },
            { mesh: 1, component: 9 }
          ],
          'mesh2.component1': [
            { mesh: 2, component: 1 },
            { mesh: 2, component: 1 }
          ],
          'mesh2.component2': [
            { mesh: 2, component: 2 },
            { mesh: 2, component: 2 }
          ],
          'mesh2.component3': [
            { mesh: 2, component: 3 },
            { mesh: 2, component: 3 }
          ],
          'mesh2.component4': [
            { mesh: 2, component: 4 },
            { mesh: 2, component: 4 }
          ],
          'mesh2.component5': [
            { mesh: 2, component: 5 },
            { mesh: 2, component: 5 }
          ],
          'mesh2.component6': [
            { mesh: 2, component: 6 },
            { mesh: 2, component: 6 }
          ],
          'mesh2.component7': [
            { mesh: 2, component: 7 },
            { mesh: 2, component: 7 }
          ],
          'mesh2.component8': [
            { mesh: 2, component: 8 },
            { mesh: 2, component: 8 }
          ],
          'mesh2.component9': [
            { mesh: 2, component: 9 },
            { mesh: 2, component: 9 }
          ],
          'mesh3.component1': [
            { mesh: 3, component: 1 },
            { mesh: 3, component: 1 }
          ],
          'mesh3.component2': [
            { mesh: 3, component: 2 },
            { mesh: 3, component: 2 }
          ],
          'mesh3.component3': [
            { mesh: 3, component: 3 },
            { mesh: 3, component: 3 }
          ],
          'mesh3.component4': [
            { mesh: 3, component: 4 },
            { mesh: 3, component: 4 }
          ],
          'mesh3.component5': [
            { mesh: 3, component: 5 },
            { mesh: 3, component: 5 }
          ],
          'mesh3.component6': [
            { mesh: 3, component: 6 },
            { mesh: 3, component: 6 }
          ],
          'mesh3.component7': [
            { mesh: 3, component: 7 },
            { mesh: 3, component: 7 }
          ],
          'mesh3.component8': [
            { mesh: 3, component: 8 },
            { mesh: 3, component: 8 }
          ],
          'mesh3.component9': [
            { mesh: 3, component: 9 },
            { mesh: 3, component: 9 }
          ],
          'mesh4.component1': [
            { mesh: 4, component: 1 },
            { mesh: 4, component: 1 }
          ],
          'mesh4.component2': [
            { mesh: 4, component: 2 },
            { mesh: 4, component: 2 }
          ],
          'mesh4.component3': [
            { mesh: 4, component: 3 },
            { mesh: 4, component: 3 }
          ],
          'mesh4.component4': [
            { mesh: 4, component: 4 },
            { mesh: 4, component: 4 }
          ],
          'mesh4.component5': [
            { mesh: 4, component: 5 },
            { mesh: 4, component: 5 }
          ],
          'mesh4.component6': [
            { mesh: 4, component: 6 },
            { mesh: 4, component: 6 }
          ],
          'mesh4.component7': [
            { mesh: 4, component: 7 },
            { mesh: 4, component: 7 }
          ],
          'mesh4.component8': [
            { mesh: 4, component: 8 },
            { mesh: 4, component: 8 }
          ],
          'mesh4.component9': [
            { mesh: 4, component: 9 },
            { mesh: 4, component: 9 }
          ],
          'mesh5.component1': [
            { mesh: 5, component: 1 },
            { mesh: 5, component: 1 }
          ],
          'mesh5.component2': [
            { mesh: 5, component: 2 },
            { mesh: 5, component: 2 }
          ],
          'mesh5.component3': [
            { mesh: 5, component: 3 },
            { mesh: 5, component: 3 }
          ],
          'mesh5.component4': [
            { mesh: 5, component: 4 },
            { mesh: 5, component: 4 }
          ],
          'mesh5.component5': [
            { mesh: 5, component: 5 },
            { mesh: 5, component: 5 }
          ],
          'mesh5.component6': [
            { mesh: 5, component: 6 },
            { mesh: 5, component: 6 }
          ],
          'mesh5.component7': [
            { mesh: 5, component: 7 },
            { mesh: 5, component: 7 }
          ],
          'mesh5.component8': [
            { mesh: 5, component: 8 },
            { mesh: 5, component: 8 }
          ],
          'mesh5.component9': [
            { mesh: 5, component: 9 },
            { mesh: 5, component: 9 }
          ],
          'mesh6.component1': [
            { mesh: 6, component: 1 },
            { mesh: 6, component: 1 }
          ],
          'mesh6.component2': [
            { mesh: 6, component: 2 },
            { mesh: 6, component: 2 }
          ],
          'mesh6.component3': [
            { mesh: 6, component: 3 },
            { mesh: 6, component: 3 }
          ],
          'mesh6.component4': [
            { mesh: 6, component: 4 },
            { mesh: 6, component: 4 }
          ],
          'mesh6.component5': [
            { mesh: 6, component: 5 },
            { mesh: 6, component: 5 }
          ],
          'mesh6.component6': [
            { mesh: 6, component: 6 },
            { mesh: 6, component: 6 }
          ],
          'mesh6.component7': [
            { mesh: 6, component: 7 },
            { mesh: 6, component: 7 }
          ],
          'mesh6.component8': [
            { mesh: 6, component: 8 },
            { mesh: 6, component: 8 }
          ],
          'mesh6.component9': [
            { mesh: 6, component: 9 },
            { mesh: 6, component: 9 }
          ],
          'mesh7.component1': [
            { mesh: 7, component: 1 },
            { mesh: 7, component: 1 }
          ],
          'mesh7.component2': [
            { mesh: 7, component: 2 },
            { mesh: 7, component: 2 }
          ],
          'mesh7.component3': [
            { mesh: 7, component: 3 },
            { mesh: 7, component: 3 }
          ],
          'mesh7.component4': [
            { mesh: 7, component: 4 },
            { mesh: 7, component: 4 }
          ],
          'mesh7.component5': [
            { mesh: 7, component: 5 },
            { mesh: 7, component: 5 }
          ],
          'mesh7.component6': [
            { mesh: 7, component: 6 },
            { mesh: 7, component: 6 }
          ],
          'mesh7.component7': [
            { mesh: 7, component: 7 },
            { mesh: 7, component: 7 }
          ],
          'mesh7.component8': [
            { mesh: 7, component: 8 },
            { mesh: 7, component: 8 }
          ],
          'mesh7.component9': [
            { mesh: 7, component: 9 },
            { mesh: 7, component: 9 }
          ],
          'mesh8.component1': [
            { mesh: 8, component: 1 },
            { mesh: 8, component: 1 }
          ],
          'mesh8.component2': [
            { mesh: 8, component: 2 },
            { mesh: 8, component: 2 }
          ],
          'mesh8.component3': [
            { mesh: 8, component: 3 },
            { mesh: 8, component: 3 }
          ],
          'mesh8.component4': [
            { mesh: 8, component: 4 },
            { mesh: 8, component: 4 }
          ],
          'mesh8.component5': [
            { mesh: 8, component: 5 },
            { mesh: 8, component: 5 }
          ],
          'mesh8.component6': [
            { mesh: 8, component: 6 },
            { mesh: 8, component: 6 }
          ],
          'mesh8.component7': [
            { mesh: 8, component: 7 },
            { mesh: 8, component: 7 }
          ],
          'mesh8.component8': [
            { mesh: 8, component: 8 },
            { mesh: 8, component: 8 }
          ],
          'mesh8.component9': [
            { mesh: 8, component: 9 },
            { mesh: 8, component: 9 }
          ],
          'mesh9.component1': [
            { mesh: 9, component: 1 },
            { mesh: 9, component: 1 }
          ],
          'mesh9.component2': [
            { mesh: 9, component: 2 },
            { mesh: 9, component: 2 }
          ],
          'mesh9.component3': [
            { mesh: 9, component: 3 },
            { mesh: 9, component: 3 }
          ],
          'mesh9.component4': [
            { mesh: 9, component: 4 },
            { mesh: 9, component: 4 }
          ],
          'mesh9.component5': [
            { mesh: 9, component: 5 },
            { mesh: 9, component: 5 }
          ],
          'mesh9.component6': [
            { mesh: 9, component: 6 },
            { mesh: 9, component: 6 }
          ],
          'mesh9.component7': [
            { mesh: 9, component: 7 },
            { mesh: 9, component: 7 }
          ],
          'mesh9.component8': [
            { mesh: 9, component: 8 },
            { mesh: 9, component: 8 }
          ],
          'mesh9.component9': [
            { mesh: 9, component: 9 },
            { mesh: 9, component: 9 }
          ]
        });
      });
    });

    it('injects happn into first position', function(done) {
      var mesh = meshes[0];

      mesh.exchange['special-component2'].methodNameFront('ARG1', function(err, res) {
        if (err) return done(err);
        res.should.eql(['ARG1', { mesh: 1, component: 2 }]);
        done();
      });
    });

    it('injects happn into last position', function(done) {
      var mesh = meshes[0];

      mesh.exchange['special-component3'].methodNameEnd('ARG1', function(err, res) {
        if (err) return done(err);
        res.should.eql(['ARG1', { mesh: 1, component: 3 }]);
        done();
      });
    });

    it('injects happn into middle position', function(done) {
      var mesh = meshes[0];

      mesh.exchange['special-component4'].methodNameMiddle('ARG1', function(err, res) {
        if (err) return done(err);
        res.should.eql(['ARG1', { mesh: 1, component: 4 }]);
        done();
      });
    });

    it('runs method without happn ok', function(done) {
      var mesh = meshes[0];

      mesh.exchange['special-component5'].methodWithoutHappn('ARG1', function(err, res) {
        if (err) return done(err);
        res.should.eql(['ARG1']);
        done();
      });
    });

    it('injects happn into webmethods', function(done) {
      request('http://localhost:3001/mesh1/webComponent1/methodWithHappn', function(err, res) {
        JSON.parse(res.body).should.eql({
          moduleName: 'module3',
          web: {
            routes: {
              methodWithHappn: 'methodWithHappn',
              methodWithoutHappn: 'methodWithoutHappn',
              methodWithHappnInEnd: 'methodWithHappnInEnd',
              methodWithHappnInFront: 'methodWithHappnInFront',
              methodWithHappnInMiddle: 'methodWithHappnInMiddle'
            }
          }
        });
        done();
      });
    });

    it('injects happn into front of webmethod args', function(done) {
      request('http://localhost:3001/mesh1/webComponent1/methodWithHappnInFront', function(
        err,
        res
      ) {
        var response = JSON.parse(res.body);
        response.config.moduleName.should.equal('module3');
        response.next.slice(0, 8).should.equal('function');
        done();
      });
    });

    it('injects happn into middle of webmethod args', function(done) {
      request('http://localhost:3001/mesh1/webComponent1/methodWithHappnInMiddle', function(
        err,
        res
      ) {
        var response = JSON.parse(res.body);
        response.config.moduleName.should.equal('module3');
        response.next.slice(0, 8).should.equal('function');
        done();
      });
    });

    it('injects happn into middle of webmethod args', function(done) {
      request('http://localhost:3001/mesh1/webComponent1/methodWithHappnInEnd', function(err, res) {
        var response = JSON.parse(res.body);
        response.config.moduleName.should.equal('module3');
        response.next.slice(0, 8).should.equal('function');
        done();
      });
    });

    it('runs webmethod ok without $happn', function(done) {
      request('http://localhost:3001/mesh1/webComponent1/methodWithoutHappn', function(err, res) {
        res.body.should.eql('ok');
        done();
      });
    });
  }
);
