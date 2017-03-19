/**
 * Created by nomilous on 2016/07/28.
 */

var path = require('path');
var filename = path.basename(__filename);
var should = require('chai').should();
var Happner = require('../');
var Promise = require('bluebird');
var request = Promise.promisify(require('request'));

describe(filename, function () {

  //require('benchmarket').start();
  //after(//require('benchmarket').store());

  var mesh;

  before(function (done) {

    this.timeout(5000);

    Happner.create({
      name: 'MESH_NAME',
      modules: {
        'factory': { // component that adds another component via _mesh
          instance: {
            createComponent: function ($happn, name, callback) {
              $happn._mesh._createElement({
                module: {
                  name: name,
                  config: {
                    instance: {
                      method: function (callback) {
                        callback(null, name + ' OK');
                      }
                    }
                  }
                },
                component: {
                  name: name,
                  config: {}
                }
              }, callback);
            }
          }
        },
        'remove1': {
          instance: {}
        },
        'remove2': {
          instance: {}
        }
      },
      components: {
        'factory': {
          accessLevel: 'mesh'
        },
        'remove1': {
        },
        'remove2': {
        }
      }
    })
      .then(function (_mesh) {
        mesh = _mesh;
        done();
      })
      .catch(done);
  });

  after(function (done) {
    if (!mesh) return done();
    mesh.stop({reconnect: false}, done);
  });


  it('each component has access to all other components', function (done) {

    var exchange = mesh.exchange;
    var event = mesh.event;
    var localEvent = mesh.localEvent;

    Object.keys(mesh._mesh.elements).forEach(function (componentName) {

      var componentInstance = mesh._mesh.elements[componentName].component.instance;

      componentInstance.exchange.should.eql(exchange);
      componentInstance.event.should.eql(event);
      componentInstance.localEvent.should.eql(localEvent);

    });

    done();

  });


  it('can add a component to the mesh', function (done) {

    mesh._createElement({
      module: {
        name: 'newComponent1',
        config: {
          instance: {
            method: function (callback) {
              callback(null, 'newComponent1 OK');
            },
            page: function (req, res) {
              res.end('WEB PAGE');
            }
          }
        }
      },
      component: {
        name: 'newComponent1',
        config: {
          web: {
            routes: {
              page: 'page'
            }
          }
        }
      }
    })

      .then(function () {
        // use the new component's method
        return mesh.exchange.newComponent1.method();
      })

      .then(function (result) {
        result.should.equal('newComponent1 OK');
      })

      .then(function () {
        // use new component's web method
        return request('http://localhost:55000/newComponent1/page');
      })

      .then(function (result) {
        result[1].should.equal('WEB PAGE');
      })

      .then(function () {
        return mesh._destroyElement('newComponent1')
      })

      .then(function () {
        done();
      })

      .catch(done);
  });


  it('can add a new component to the mesh (from another component using _mesh)', function (done) {

    mesh.exchange.factory.createComponent('componentName2')

      .then(function () {
        // use the new component
        return mesh.exchange.componentName2.method();
      })

      .then(function (result) {
        result.should.equal('componentName2 OK');
      })

      .then(function () {
        return mesh._destroyElement('componentName2')
      })

      .then(function () {
        done();
      })

      .catch(done);
  });


  it('adds new component to all exchanges', function (done) {
    // Each component now has own exchange to allow for cluster
    // to change it when component depends on another version
    // from elsewhere in cluster.

    mesh._createElement({
      module: {
        name: 'newComponent2',
        config: {
          instance: {
            method: function (callback) {
              callback(null, 'newComponent2 OK');
            }
          }
        }
      },
      component: {
        name: 'newComponent2',
        config: {}
      }
    })

      .then(function () {
        return mesh.exchange.newComponent2.method();
      })

      .then(function (result) {
        result.should.equal('newComponent2 OK');
      })

      .then(function () {
        return mesh._mesh.elements['factory'].component.instance.exchange.newComponent2.method();
      })

      .then(function (result) {
        result.should.equal('newComponent2 OK');
      })

      .then(function () {
        return mesh._mesh.elements['factory'].component.instance.exchange.MESH_NAME.newComponent2.method();
      })

      .then(function (result) {
        result.should.equal('newComponent2 OK');
      })

      .then(done).catch(done);

  });


  it('does not add to per component exchange if it is marked as custom', function (done) {
    // cluster may have replaced component exchange entry (will be marked as custom),
    // adding a new element should not overwrite in that component's exchange entry

    var componentInstance = mesh._mesh.elements['factory'].component.instance;

    // fake the cluster having added 'clusterComponent' to 'factory's exchange

    componentInstance.exchange.clusterComponent = {
      __custom: true
    };

    // add new component, should not overwrite where custom

    mesh._createElement({
      module: {
        name: 'clusterComponent',
        config: {
          instance: {}
        }
      },
      component: {
        name: 'clusterComponent',
        config: {}
      }
    })

      .then(function () {
        componentInstance.exchange.clusterComponent.should.eql({
          __custom: true // still the same
        })
      })

      .then(done).catch(done);

  });


  it('can remove components from the mesh including web methods', function (done) {

    mesh._createElement({
      module: {
        name: 'anotherComponent',
        config: {
          instance: {
            method: function (callback) {
              callback(null, 'anotherComponent OK');
            },
            page: function (req, res) {
              res.end('WEB PAGE');
            }
          }
        }
      },
      component: {
        name: 'anotherComponent',
        config: {
          web: {
            routes: {
              page: 'page'
            }
          }
        }
      }
    })

      .then(function () {
        return mesh.exchange.anotherComponent.method()
      })

      .then(function (result) {
        result.should.equal('anotherComponent OK');
      })

      .then(function () {
        return request('http://localhost:55000/anotherComponent/page')
      })

      .then(function (result) {
        result[1].should.equal('WEB PAGE');
      })

      // now remove the component
      .then(function () {
        return mesh._destroyElement('anotherComponent')
      })

      // exchange reference is gone
      .then(function (result) {
        should.not.exist(mesh.exchange.anotherComponent);
      })

      // web route is gone
      .then(function () {
        return request('http://localhost:55000/anotherComponent/page');
      })

      .then(function (result) {
        result[1].should.equal('Cannot GET /anotherComponent/page\n');
      })

      .then(done)
      .catch(done)
  });


  it('removes component from all exchanges', function (done) {

    mesh._destroyElement('remove1')

      .then(function () {

        should.not.exist(mesh.exchange.remove1);
        should.not.exist(mesh.event.remove1);
        should.not.exist(mesh.localEvent.remove1);

      })

      .then(function () {

        var componentInstance = mesh._mesh.elements['factory'].component.instance;
        var exchange = componentInstance.exchange;
        var event = componentInstance.event;
        var localEvent = componentInstance.localEvent;

        should.not.exist(exchange.remove1);
        should.not.exist(event.remove1);
        should.not.exist(localEvent.remove1);

      })

      .then(done).catch(done);

  });


  it('does not remove per component exchange if it is marked as custom', function (done) {

    var componentInstance = mesh._mesh.elements['factory'].component.instance;

    // fake factory using using remote instance of 'remove2' via cluster
    componentInstance.exchange.remove2.__custom = true;

    mesh._destroyElement('remove2')

      .then(function () {

        should.not.exist(mesh.exchange.remove2);
        should.not.exist(mesh.event.remove2);
        should.not.exist(mesh.localEvent.remove2);

      })

      .then(function () {

        var componentInstance = mesh._mesh.elements['factory'].component.instance;
        var exchange = componentInstance.exchange;
        var event = componentInstance.event;
        var localEvent = componentInstance.localEvent;

        // should still have custom components on 'factory's exchange
        should.exist(exchange.remove2);
        should.exist(event.remove2);

        should.not.exist(localEvent.remove2);

      })

      .then(done).catch(done);


  });


  it('emits description change on adding component', function (done) {

    mesh._mesh.data.on('/mesh/schema/description', {count: 1}, function (data, meta) {
      try {
        data.components.component1.methods.should.eql({
          method: {
            parameters: [
              {name: 'callback'}
            ]
          }
        });
        done();
      } catch (e) {
        done(e);
      }
    }, function (e) {

      if (e) return done(e);

      mesh._createElement({
        module: {
          name: 'component1',
          config: {
            instance: {
              method: function (callback) {
                callback();
              }
            }
          }
        },
        component: {
          name: 'component1',
          config: {}
        }
      }).catch(done);

    });
  });


  it('emits description change on destroying component', function (done) {

    mesh._createElement({
      module: {
        name: 'component2',
        config: {
          instance: {
            method: function (callback) {
              callback();
            }
          }
        }
      },
      component: {
        name: 'component2',
        config: {}
      }
    })

      .then(function () {
        return mesh._mesh.data.on('/mesh/schema/description', {count: 1}, function (data, meta) {
          should.not.exist(data.components.component2);
          done();
        }, function (e) {
          if (e) return done(e);
        });
      })

      .then(function () {
        return mesh._destroyElement('component2');
      })

      .catch(done);
  });


  it('informs mesh client on create component', function (done) {

    var client = new Happner.MeshClient();

    client.login()

      .then(function () {
        return client.once('components/created', function (array) {
          try {
            array[0].description.name.should.equal('component3');
            done();
          } catch (e) {
            done(e);
          }
        });
      })

      .then(function () {
        return mesh._createElement({
          module: {
            name: 'component3',
            config: {
              instance: {
                method: function (callback) {
                  callback();
                }
              }
            }
          },
          component: {
            name: 'component3',
            config: {}
          }
        })
      })

      .catch(function (e) {

        console.log('login error:::');
        done(e);
      });
  });


  var meshClientInformed = false;

  it('informs mesh client on destroy component', function (done) {

    var client = new Happner.MeshClient();

    return mesh._createElement({
      module: {
        name: 'component4',
        config: {
          instance: {
            method: function (callback) {
              callback();
            }
          }
        }
      },
      component: {
        name: 'component4',
        config: {}
      }
    })

      .then(function () {

        if (meshClientInformed) console.log('MESH CLIENT DESTROYED NOTIFY HAPPENED ALREADY 0:::');

        return client.login();
      })

      .then(function () {

        if (meshClientInformed) console.log('MESH CLIENT DESTROYED NOTIFY HAPPENED ALREADY 1:::');

        return client.once('components/destroyed', function (array) {

          try {
            array[0].description.name.should.equal('component4');
            meshClientInformed = true;
            done();
          } catch (e) {
            done(e);
          }
        });
      })

      .then(function () {

        if (meshClientInformed) console.log('MESH CLIENT DESTROYED NOTIFY HAPPENED ALREADY 2:::');

        return mesh._destroyElement('component4');
      })

      .catch(function (e) {

        if (!meshClientInformed) return done(e);

        console.log('MESH CLIENT DESTROYED NOTIFY HAPPENED ALREADY 3:::');
        //done(e);
      });
  });


  xit('what happens to reference still held', function (done) {
    var keepRefToDeletedComponent;
    return mesh._createElement({
      module: {
        name: 'component5',
        config: {
          instance: {
            method: function (callback) {
              callback();
            }
          }
        }
      },
      component: {
        name: 'component5',
        config: {}
      }
    })

      .then(function () {
        keepRefToDeletedComponent = mesh.exchange.component5;
      })

      .then(function () {
        return mesh._destroyElement('component5');
      })

      .then(function () {
        console.log(keepRefToDeletedComponent);
        return keepRefToDeletedComponent.method();
      })

      .then(function (result) {
        console.log(result);
      })

      .then(done)
      .catch(done);
  });

  //require('benchmarket').stop();

});
