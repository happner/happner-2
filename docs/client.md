[&#9664;](system.md) system components | __back__ to contents [&#9654;](https://github.com/happner/happner-2#documentation)

## Using the Client

### From the browser

The api client script can be accessed from the browser at `/api/client`.

__NB:__ Start the server with `NODE_ENV=production` to enable caching of the `/api/client` script. The script is then cached to disk at `HOME/.happner/api-client-<happner-version>.min.js.gz`. If not cached the server rebuilds the packaged script from all component scripts and minifies and gzips __at each server start__.

See also "constructivist" [happner-client](https://github.com/happner/happner-client)

#### Loading the script.

__something.html__
```html
<html>
  <head>
    <script src=/api/client></script>
    <!-- script src="http://some.other.node.com:55000/api/client"></script -->
  </head>
  ...
```

#### Initialize and Login.

__something.html__
```html
  ...
  <body>
    <script>

      window.LOG_LEVEL = 'trace';

      // Connection options (displaying defaults)
      var options = {
        hostname: window.location.hostname,
        port: window.location.port || 80,
        reconnect:{
          max:180000, //max interval for reconnect attempts - default is 3 minutes
          retries: Infinity //will keep on retrying, forever
        }
      };


      // Create the client instance.

      var client = new MeshClient( /* options */ );


      // Credentials for the login method
      var credentials = {
        // username: 'username', // pending
        // password: 'password', // pending
      }

      // login with callback
      client.login(credentials, function(e) { //...etc

      // or login with promise
      client.login(credentials); // .then(function() { //... etc.


      client.on('login/allow', function() {

      });

      client.on('login/deny', function(err) {

      });

      client.on('login/error', function(err) {

      });


    </script>
  </body>
</html>
```

#### Cookie Events
*when the mesh client connects in the browser, it pushes a cookie containing the auth token retrieved during login, this makes the token available for other tabs utilizing clients*

```javascript
  let cookieEvents = [];
  Happner.MeshClient.clearCookieEventObjects(); // clears all listeners
  const cookieEventHandler1 = (event, cookie) => {
    cookieEvents.push({
      event: `${event}1`,
      cookie
    });
  };
  const cookieEventHandler2 = (event, cookie) => {
    cookieEvents.push({
      event: `${event}2`,
      cookie
    });
  };
  //handlers are added to the MeshClient before login
  let [client, clientCookie] = [
    new Happner.MeshClient({ port: 55000, cookieEventHandler: cookieEventHandler1 }),
    new Happner.MeshClient({ port: 55000, cookieEventHandler: cookieEventHandler2 })
  ];
  const loginOpts = {
    username: 'username',
    password: 'password'
  };
  await client.login(loginOpts);
  await delay(3000);
  await clientCookie.login({
    useCookie: true
  });
  await delay(3000);
  await client.disconnect({ deleteCookie: true });
  await delay(3000);
  await client.login(loginOpts);
  await delay(3000);
  const eventKeys = cookieEvents.map(evt => {
    return evt.event;
  });
  expect(eventKeys).to.eql([
    // no cookie - handler 1 detects
    'cookie-deleted1',
    // handler 1 detects creation of own cookie, client2 connects with useCookie
    'cookie-created1',
    // handler 1 deletes cookie
    'cookie-deleted1',
    // handler 2 detects cookie deletion
    'cookie-deleted2',
    // handler 1 reconnects
    'cookie-created1',
    // handler 2 detects cookie creation
    'cookie-created2'
  ]);
  await clientCookie.disconnect({ deleteCookie: true });
  await client.disconnect();
```

#### Other Events

__something.html__
```html
  ...
  <body>
    <script>

      // got client from above


      // Component notifications to enable the dynamic creation of
      // widgets or menu updates (or similar) into the running app.

      client.on('components/created', function(array) {

        // First emit lists all components.

        // Subsequent emits list only new components
        // inserted into the running mesh node.
        // (see: mesh._createElement())

      });

      client.on('components/destroyed', function(array) {

        // Components being removed from the mesh.

      });

      client.on('connection/ended', function() {

        // server was stopped

      });

      client.on('reconnect/scheduled', function() {

        // client is attempting reconnect after lost connection

      });

      client.on('reconnect/successful', function() {

        // client successfully reconnected

      });

    </script>
  </body>
</html>
```


#### Additional Functionality

The client loads the following additional classes into the browser's runtime:

[Promise](https://github.com/petkaantonov/bluebird/blob/master/API.md) - Bluebird promise implementation.</br>
[Primus](https://github.com/primus/primus) - The websocket client used by the MeshClient.</br>
__EventEmitter__ - Same as node's EventEmitter. (Part of Primus).</br>


#### Reconnection policy
```javascript

var testClient = new Mesh.MeshClient({secure: true, port: 8004,
                                          reconnect:{
                                            max:2000 //we can then wait 10 seconds and should be able to reconnect before the next 10 seconds,
                                          }
                                        });

```

### From a node process

```javascript

const MeshClient = require('happner-2').MeshClient;

const client = new MeshClient(...);

// same as for the browser

```

### Using the special $ methods on event and exchange - obviating the need to wait for the exchange to be constructed
```javascript
const MeshClient = require('happner-2').MeshClient;

const client = new MeshClient(...);

//call a component on the mesh
const result = await client.exchange.$call({
  mesh: 'MESH-NAME', //not required of the component is local
  component: 'component', //component name required
  arguments: ['my', 'test', 'args'] //arguments - optional
});

//listen to an event on a component
const eventId = await client.event.$on({
  mesh: 'MESH-NAME', //not required of the component is local
  component: 'component', //component name required
  path: '/test/*' //the topic you want to listen on
}, data => { // your event handler
  //do something with the data here
});

//stop listening for event
await client.event.$off(eventId);

//listen for a single event
await client.event.$once({
  mesh: 'MESH-NAME', //not required of the component is local
  component: 'component', //component name required
  path: '/test/*' //the topic you want to listen on
}, data => { // your event handler
  //do something with the data here
});

//unsubscribe from all events on path
await client.event.$offPath('/test/*');

//also backward compatible with callbacks, ie:
client.exchange.$call({
  mesh: 'MESH-NAME', //not required of the component is local
  component: 'component', //component name required
  arguments: ['my', 'test', 'args'] //arguments - optional
}, (e, results) => {
  //do something with the response here
});

client.event.$on({
  mesh: 'MESH-NAME', //not required of the component is local
  component: 'component', //component name required
  path: '/test/*' //the topic you want to listen on
}, data => { // your event handler
  //do something with the data here
}, (e, eventId) => {
  //the response of the subscription
  client.event.$off(eventId, e => {
    
  });
});

```

### Disconnection and tokens
*The client can willfully disconnect from the server, with an option for revoking the current session token*
```javascript

var MeshClient = require('happner-2').MeshClient;

var client = new Happner.MeshClient({secure: true, port: 15000});

client.login({username:'_ADMIN', password:'happn'})
.then(function(){
  //we now have a token we could use for web requests:
  var token = client.token;

  //now we can disconnect, and revoke the token so it can never be used again:
  //NB, NB: disconnect is not a promise - use a callback
  client.disconnect({revokeSession:true}, function(e){
    if (!e) console.log('disconnection went fine, we have revoked the token ' + token);
  });
});
```

### testing the browser client
*a browser test via chai can be run from the command line:*
```bash
gulp --gulpfile test/test-browser/gulp-01.js
```
