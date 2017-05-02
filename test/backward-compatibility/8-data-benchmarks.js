describe('8 - does some benchmarks on api calls, data events and events', function (done) {

  // Uses unit test 2 modules
  var should = require('chai').should();
  var Mesh = require('happner');
  var Mesh2 = require('../..');

  this.timeout(120000);

  var maximumPings = 1000;

  var testClient;

  var config = {
    name: "testBenchmark",
    modules: {
      "module1": {
        path: __dirname + "/lib/8-module1",
        create: {
          type: "sync",
          parameters: [
            {value: {maximumPings: maximumPings}}
          ]
        }
      },
      "module2": {
        path: __dirname + "/lib/8-module2",
        create: {
          type: "sync",
          parameters: [
            {value: {maximumPings: maximumPings}}
          ]
        }
      }
    },
    components: {
      "component1": {
        moduleName: "module1",
        accessLevel: "mesh",
        // scope: "component",//either component(mesh aware) or module - default is module
        startMethod: "start",
        schema: {
          "exclusive": false,//means we dont dynamically share anything else
          "methods": {
            "start": {
              type: "sync",
              parameters: [
                {"required": true, "value": {"message": "this is a start parameter"}}
              ]
            }
          }
        }
      },
      "component2": {
        moduleName: "module2",
        accessLevel: "mesh",
        // scope: "component",
        schema: {
          "exclusive": false,
          "methods": {}
        }
      }
    }
  };

  var mesh;

  before(function (done) {

    console.log('starting:::');

    console.time('startup');
    mesh = new Mesh2();
    mesh.initialize(config, function (err) {
      console.timeEnd('startup');

      testClient = new Mesh.MeshClient();

      console.log('logging in:::');

      testClient.login({username:'_ADMIN', password:'happn'})
        .then(done)
        .catch(done);
    });
  });

  after(function (done) {
    mesh.stop({reconnect: false}, done);
  });

  it('listens for the ping pong completed event, that module1 emits', function (done) {

    var onEventRef;

    testClient.event.component1.on('maximum-pings-reached', function (message) {

      console.log(message);

      testClient.event.component1.off(onEventRef, function (err) {
        // if (err)
        //   console.log('Couldnt detach from event maximum-pings-reached');

        // console.log('Detaching from maximum-pings-reached');

        done(err);
      });

    }, function (err, ref) {
      if (err) {
        // console.log('Couldnt attach to event maximum-pings-reached');
        done(err);
      }
      else {
        //we have attached our events, now we start the mesh
        // console.log('attached on ok, ref: ' + ref);
        onEventRef = ref;
        mesh.start(function (err) {
          if (err) {
            // console.log('Failed to start mesh');
            done(err);
          }
        });
      }
    });
  });

  it('listens for an event in module 2 that module 1 set 1000 data points', function (done) {

    testClient.exchange.component2.startData(function () {

      testClient.event.component2.on('data-test-complete', function (message) {
        message.m.should.contain('Hooray');
        console.log(message);
        done();
      }, function (e) {

        testClient.exchange.component1.startData();

      });
    });
  });
});

