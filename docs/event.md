[◀](autoload.md) autoloading and defaulting | local event api [▶](local-event.md)

## Event Api

### Emitting Events

Events are emitted from components. Given the following `Component1` installed into the mesh as `component1`, use the injectable `$happner` api to gain access to the emitter.

```javascript
Component1.prototype.makeSomethingHappen = function ($happn, callback) {
  $happn.emit('something/happened', {data: 1});
  callback();
};
```

These events are transmitted onto the network and reach clients, remote endpoints or other peers in a `happner-cluster`

### Subscribing and Unsubscribing

Given another `Component2` in the same mesh.

```javascript
Component2.prototype.start = function ($happn, callback) {
  var eventRef;

  // subscribe
  $happn.event.component1.on('something/happened', // wildcards are supported
    function (data, meta) {
      // handle the event
    },
    function (error, _eventRef) {
      if (error) {
        // failed to subscribe
        return;
      }
      eventRef = _eventRef;
    }
  );

  // unsubscribe by eventRef
  $happn.event.component1.off(eventRef, function (error) {
    if (error) {
      // failed to unsubscribe
      return;
    }
  });

  // unsubscribe by path (unsubscribes all subscribers at path)
  $happn.event.component1.offPath('something/happened', function (error) {
    if (error) {
      // failed to unsubscribe
      return;
    }
  });


  // if component1 is on a remote mesh to which this has an endpoint attached
  $happn.event.endpointName.component1...

  callback();
};
```

The same subscription api is available in the [MeshClient](client.md) at `client.event`. The client can only subscribe and not emit. Client emitting can be performed via calls to the exchange.

The same subscription api is also available in the server as resolved at `create()`.

```javascript
Happner.create(config)
  .then(function (server) {
    server.event...
  });
```

### Variable depth subscriptions and subscribing on \*, with the strict wildcard path format
When subscribing on \* on a components events, it is the same as doing a variable depth subscription 5 levels deep, depth can also be specified for deeper or shallower subscriptions:

```javascript

var testClient = new Happner.MeshClient();

await testClient.login({
  username: '_ADMIN',
  password: 'happn'
});

var handler = function (data, meta) {
  //event is handled here
}

//NB: notice the depth parameter
testClient.event.component1.on('*', {depth:6}, handler, function(e, handle){

  //same as
  //testClient.event.component1.on('*', handler...
  //testClient.event.component1.on('*/*', handler...
  //testClient.event.component1.on('*/*/*', handler...
  //testClient.event.component1.on('*/*/*/*', handler...
  //testClient.event.component1.on('*/*/*/*/*', handler...
  //testClient.event.component1.on('*/*/*/*/*/*', handler...
});

//NB: partial paths can also be subscribed on using the ** notation

//NB: notice the depth parameter
testClient.event.component1.on('test/**', {depth:6}, handler, function(e, handle){

  //same as
  //testClient.event.component1.on('test/*', handler...
  //testClient.event.component1.on('test/*/*', handler...
  //testClient.event.component1.on('test/*/*/*', handler...
  //testClient.event.component1.on('test/*/*/*/*', handler...
  //testClient.event.component1.on('test/*/*/*/*/*', handler...
  //testClient.event.component1.on('test/*/*/*/*/*/*', handler...
});
```

### Usage in happner-cluster

When using a [happner-cluster](https://github.com/happner/happner-cluster), events emitted with `$happn.emit()` are replicated cluster-wide. In order to emit events that remain confined within the current cluster peer and attached clients/endpoints use the special `$happn.emitLocal()` event instead.
