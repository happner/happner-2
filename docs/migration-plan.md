
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
```
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

