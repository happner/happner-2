
happner-2 migration from happner
--------------------------------


server migration
----------------

###datalayer config is now called happn:
```javascript

//OLD

Mesh.create({
        datalayer:{
          port:55004
        },
        modules: {},
        components: {},
        endpoints:{}
      }, function (err, instance) { 
        //mesh was created ok
      });


//NEW

Mesh.create({
        happn:{
          port:55004
        },
        modules: {},
        components: {},
        endpoints:{}
      }, function (err, instance) { 
        //mesh was created ok
      });


```

###datalayer is now just a [plain happn config](https://github.com/happner/happn-3/blob/master/docs/config.md), so no more configuration translation:
```javascript

//OLD

 Mesh.create({
      name:'e3b-test',
      datalayer:{
        secure:true,
        adminPassword: ADMIN_PASSWORD,
        port: 10000,
        profiles:[
          {
            name:"rest-device",
            session:{
              $and:[{ //filter by the security properties of the session - check if this session user belongs to a specific group
                user:{groups:{
                  REST_DEVICES : { $exists: true }
                }},
                type:{$eq:0} //token stateless
              }]},
            policy: {
              ttl: '2 seconds'//stale after 2 seconds
            }
          }
        ]
      }
    }, function (err, instance) {
      //mesh was created
    });

//NEW

Mesh.create({
        happn:{
        secure:true,
        port:10000,
        adminUser:{
          passwotrd:'blah'
        },
        services:{
          security: {
            config: {
              profiles:[
                {
                  name:"rest-device",
                  session:{
                    $and:[{ //filter by the security properties of the session - check if this session user belongs to a specific group
                      user:{groups:{
                        REST_DEVICES : { $exists: true }
                      }},
                      type:{$eq:0} //token stateless
                    }]},
                  policy: {
                    ttl: '2 seconds'//stale after 2 seconds
                  }
                }
              ]
            }
           }
          }
      }
    }, function (err, instance) {
      //mesh was created
    });


```

##convenience server configuration keys
```javascript
Mesh.create({
  happn:{
    activateSessionManagement:true,//instead of config.happn.services.security.config.activateSessionManagement
    middleware:{//instead of
      security:{
        exclusions:[]
      }
    },
    logSessionActivity:true,//instead of config.happn.services.security.config.logSessionActivity
    profiles:[],//instead of config.happn.services.security.config.profiles
    protocol:'https',//instead of onfig.happn.services.transport.config.protocol
    transport:{config:{}},//instead of onfig.happn.services.transport...
    filename:'test.nedb',//instead of config.happn.services.data.config.datastores...
    inboundLayers:[],//instead of config.happn.services.protocol.config.inboundLayers
    outboundLayers:[],//instead of config.happn.services.protocol.config.outboundLayers
  }
})
```


client migration
----------------

*Only one breaking change, errors are coming back in a slightly different format, this is actually a change in the happn protocol:*

```javascript

//errors come back in the format {name:'[Error name]', message: [Error message]}
//instead of {name: '[Error name]: [Error message]'}, ie:

//old
{
  "name":"AccessDenied: unauthorized"
}
//new
{
  "name":"AccessDenied",
  "message":"unauthorized"
}
```

*this is linked to a change in the [happn protocol](https://github.com/happner/happn-protocol)*

## $happn.info.datalayer

datalayer becomes happn

eg. getting datalayer address

```javascript
$happn.info.datalayer.address // no longer works
$happn.info.happn.address
```

## Web middleware config

### Removed

The keyword `static` is gone.

**If a module wishes to serve static it should run its own server middleware.**

eg. for /componentName/routeName

```javascript
config = {
  components: {
    'componentName': {
      web: {
        routes: {
          routeName: ['server'] 
        }
      }
    }
  }
}
```

```javascript
var serveStatic = require('serve-static');

Component.prototype.server = serveStatic(__dirname + '/directory');
```

The www module no longer serves `/` and no longer has any implied meaning.

**If a module wishes serve on `/` it should use the new web/routes config.**

```javascript
config = {
  web: {
    routes: {
      '/': 'componentName/routeName'
    }
  },
  components: {...}
}
```

### Added

Middleware can be placed directly into the config.

```javascript
config = {
  components: {
    'componentName': {
      web: {
        routes: {
          routeName: serveStatic(__dirname + '/directory'),
          another: ['moduleFn1', function(res, req, next) {next();}, 'moduleFn2']
        }
      }
    }
  }
}
```

Note: **$happn and $origin cannot be injected into inline middleware but will be injected into `moduleFn1` and `moduleFn2`above.**

------

Middleware can be assigned inline at root web routes config.

```javascript
config = {
  web: {
    routes: {
      '/': serveStatic(__dirname + '/directory')
    }
  },
  components: {...}
}
```

 Note: **root web routes do not support arrays of middleware.


## Mesh domain

### Configuration

There is a new property on the config that allows endpoints to attach through a load balancer to uniquely named meshes by using the domain as the endpoint target.

```javascript
CLOUD_config = {
  name: 'UNIQUE_MESH_NAME',
  domain: 'FIELDPOP',	// should correspond the field device's endpoint names
  modules: {
  	...
  },
  components: {
    ...
  }
}
```

* Domain name defaults to mesh name if unspecified.
* Internally all event, RPC and security paths use the domain name

This allows for a standalone mesh to be migrated into a cluster without modifying any field devices endpoint names or changing any already configured permissions by setting the domain name to the original mesh name and then allowing the mesh names to default uniquely.

## directed _responses
This security setting gives us the ability to ensure responses to methods or published only to the origin of the method caller

#####NB NB Directed responses must not be switched on if any happner clients older than 1.29.0 are connecting to the mesh,  without this setting, these connections are still prevented using an [injected layer](https://github.com/happner/happner-2/blob/master/lib/system/happn.js#L222)

## datastores config 

The underlying happn config now requires a datastores subconfig to point to mongo or nedb or both as required

### old

```javascript
config = {
  datalayer: {
    plugin: 'happn-service-mongo',
    config: {
      collection: 'happner',
      url: 'mongodb://127.0.0.1:27017/happner'
    }
  }
}
```

#### new

```javascript
var config = {
  happn: { // was "datalayer"
    services: {
      data: {
        config: {
          datastores: [
            
            // ALREADY defaulted by happn-cluster
            {
              name: 'mongo',
              provider: 'happn-service-mongo-2',
              isDefault: true, // <----------------
              settings: {
                collection: 'happn-cluster',
                database: 'happn-cluster',
                url: 'mongodb://127.0.0.1:27017'
              }
            },
            
            // ALREADY defaulted by happner-cluster to prevent
            // mesh description overwrites in shared db
            {
              name: 'nedb-own-schema',
              settings: {},
              patterns: [
                '/mesh/schema/*' // <--------------- use this only when
              ]
            }
          ]
        }
      }
    }
  }
}
```



