[&#9664;](configuration.md) configuration | modules and components [&#9654;](modules.md)

## HAPPN

### What is the happn layer?

The HAPPN layer is the underlying messaging and storage infrastructure in the mesh. It uses [happn](https://github.com/happner/happn-3)'s evented storage and pubsub websocket stack.

Configured in the happn layer is the host and port upon which __this__ MeshNode listens for connections from other MeshNodes or clients.

##### The data layer allows for:

* key/value storage, see [Data Api](data.md)
* subscription to storage events by key (and wildcards)


### Datalayer Events

Components with `accessLevel: 'mesh'` in their config have direct access to happn event emitter.

Note: Data content of these events is in flux. 

##### Event: attach

Another MeshNode has attached to this one.

```javascript
$happn._mesh.happn.events.on('attach', function(ev) {
  ev == {
    info: {
      mesh: {
        name: "remote_mesh_name"
      },
      _browser: false,
      _local: false
    }
  };
});
```

##### Event: detatch

An attached MeshNode has disconnected.

```javascript
$happn._mesh.happn.events.on('detatch', function(ev) {
  ev == {
    info: {
      mesh: {
        name: "remote_mesh_name"
      },
      _browser: false,
      _local: false
    }
  }
});

```

### Datalayer Compaction

The happn can be set to compact at an interval, or can also be compacted by a call:

*the following code demonstrates an interval compaction configuration:*
```javascript
var config = {
  happn: {
    port: 55007,
    filename:test_file_interval,
    compactInterval:10000//compact every 10 seconds
  },
  components: {
    "data": {}
  }
};

var Happner = require('happner-2');

Happner.create(config, function(err, mesh) {
  /* _ */
});
```

*the following code demonstrates how to kick of a compaction job:*

```javascript
var config = {
  happn: {
    port: 55006,
    filename:test_file_call
  },
  components: {
    "data": {}
  }
};

var Happner = require('happner-2');

Happner.create(config, function(err, mesh) {
  mesh.exchange.system.compactDBFile(function(e){
    //your file was successfully compacted
  });
});


```

### Exchange method callback timeout

The happn can be configured to allow the maximum amount of time any method on the exchange will wait before timing out:
```javascript
var config = {
   name:'d9-client-timeout-timeoutConfig',
   happn: {
     setOptions:{
       timeout:15000 //15 SECONDS, THIS IS THE MAXIMUM AMOUNT OF TIME IN 
                    // MILLISECONDS, ANY METHOD WILL WAIT BEFORE RAISING A TIMEOUT ERROR
     }
   },
   modules: {
     'TestMesh': {
       path:'TestMesh'
     }
   },
   components: {
     'TestMesh': {
       moduleName: 'TestMesh',
       schema: {
         exclusive: false
       }
     }
   }
 };

var Happner = require('happner-2');

Happner.create(config, function(err, mesh) {
  
   mesh.exchange.TestMesh.method1(function(e, result){

    //e = "Request timed out" if the method took longer than 15 seconds to process

   });
  
});

```

### HAPPN subscription service configuration
*The subscription service in happn is configured to use buckets to hold and search for subscriptions, the happn layer is preconfigured to use 6 buckets:*

1. the _exchange bucket - where exchange method calls are stored and searched for
2. the _events bucket - where events subscriptions happen
3. the _optimised bucket - deeply nested subscriptions that you know the segment size for happen here, as long as the data is stored in the format /_optimised/[rest of key] - for more info please check out the [happn documentation](https://github.com/happner/happn-3#buckets-and-optimisation)
4. all sets
5. all removes
6. default anything else that isn't fielded above

The first matching bucket found is used to store a matching subscription, all the buckets are checked against sets and removes that happen.

The subscription service is [configured in the lib/system/happn.js module as follows](https://github.com/happner/happner-2/blob/master/lib/system/happn.js#L265):
```javascript
 //happn subscription service
  if (!config.happn.services.subscription) {
    config.happn.services.subscription = {
      config: {
        buckets: [
          {
            name: 'exchange',
            channel: 'ALL@/_exchange/*'//requests and responses, separate from data
          },
          {
            name: 'events',
            channel: 'ALL@/_events/*'//inter-component events
          },
          {
            name: 'optimised',//for very busy nested type subscriptions, uses strict bucket
            channel: 'ALL@/_optimised/*',
            implementation: Happn.bucketStrict
          }
        ]
      }
    };
  }

  happnServer.create(config.happn,

    function (e, happnInstance) {
      //ok cool happn instance has been initialised
    }
  );
```
It is possible to configure things with your own setup, like so:
```javascript

var MyCustomBucket = require('my-custom-bucket');

var happnerConfig = {
  happn:{
    services:{
      subscription:{
        config:{
          buckets:[
            {
              name: 'custom',
              channel: 'ALL@/_custom/*'//requests and responses, separate from data
              implementation:MyCustomBucket
            }
          ]
        }
      }
    }
  }
}

//NB the SET, REMOVE and ANY buckets are ALWAYS appended in happn, so it is not necessary to add them

```
