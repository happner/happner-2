describe(require('path').basename(__filename), function () {

  //require('benchmarket').start();
  //
  //after(//require('benchmarket').store());

  var expect = require('expect.js');
  var Mesh = require('../');

  var serviceInstance;
  var clientInstance = new Mesh.MeshClient({secure: true});

  var disconnectClient = function(client, cb){

    if (typeof client === 'function'){
      cb = client;
      client = null;
    }

    if (!client) client = clientInstance;

    if (client) {
      client.disconnect(cb);
    } else cb();
  };

  var stopService = function(callback){
    if (serviceInstance)
      serviceInstance.stop(callback);
    else
      callback();
  };

  after('disconnects the client and stops the server', function(callback){

    this.timeout(3000);

    disconnectClient();
    setTimeout(function(){
      stopService(callback);
    }, 1000);

  });

  var getService = function(inboundLayers, outboundLayers, callback){

    disconnectClient();

    setTimeout(function(){

      stopService(function(e){

        if (e) return callback(e);

        var config = {
          secure:true,
          happn:{
            adminPassword:'happn',
            inboundLayers:inboundLayers,
            outboundLayers:outboundLayers
          }
        };

        Mesh.create(config, function (err, instance) {

          serviceInstance = instance;

          if (err) return callback(err);

          clientInstance = new Mesh.MeshClient({secure: true});

          clientInstance
            .login({username: '_ADMIN', password: 'happn'})
            .then(function(){
              setTimeout(callback, 1000)
            })
            .catch(callback);

        });
      });

    }, 1000);
  };

  it('tests inserting inbound and outbound layers', function (callback) {

    this.timeout(10000);

    var layerLog1 = [];
    var layerLog2 = [];
    var layerLog3 = [];
    var layerLog4 = [];

    var inboundLayers = [
      function(message, cb){
        layerLog3.push(message);
        return cb(null, message);
      },
      function(message, cb){
        layerLog4.push(message);
        return cb(null, message);
      }
    ];

    var outboundLayers = [
      function(message, cb){
        layerLog1.push(message);
        return cb(null, message);
      },
      function(message, cb){
        layerLog2.push(message);
        return cb(null, message);
      }
    ];

    getService(inboundLayers, outboundLayers, function(e){

      if (e) return callback(e);

      clientInstance.data.on('/did/both',  function(data){

        expect(layerLog1.length > 0).to.be(true);
        expect(layerLog2.length > 0).to.be(true);
        expect(layerLog3.length > 0).to.be(true);
        expect(layerLog4.length > 0).to.be(true);

        setTimeout(callback, 5000);

      }, function(e){

        if (e) return callback(e);

        clientInstance.data.set('/did/both', {'test':'data'}, function(e){

          if (e) return callback(e);
        });
      });
    });
  });

  //require('benchmarket').stop();

});
