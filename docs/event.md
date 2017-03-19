[◀](autoload.md) autoloading and defaulting | local event api [▶](local-event.md)

## Event Api

### Emitting Events

Events are emitted from components. Given the following `Component1` installed into the mesh as `component1`, use the injectable `$happner` api to gain access to the emitter.

```javascript
Component1.prototype.makeSomethingHappen = function ($happner, callback) {
  $happner.emit('something/happened', {data: 1});
  callback();
};
```

These events are transmitted onto the network and reach clients, remote endpoints or other peers if using  `happner-cluster`

### Subscribing and Unsubscribing

Given another `Component2` in the same mesh.

```javascript
Component2.prototype.start = function ($happner, callback) {
  var eventRef;
  
  // subscribe
  $happner.event.component1.on('something/happened', // wildcards are supported
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
  $happner.event.component1.off(eventRef, function (error) {
    if (error) {
      // failed to unsubscribe
      return;
    }
  });
  
  // unsubscribe by path (unsubscribes all subscribers at path)
  $happner.event.component1.offPath('something/happened', function (error) {
    if (error) {
      // failed to unsubscribe
      return;
    }
  });
  
  
  // if component1 is on a remote mesh to which this has an endpoint attached
  $happner.event.endpointName.component1...
  
  callback();
};
```

The same subscription api is available in the [MeshClient](client.md) at `client.event`. The client can only subscribe and not emit. Client emitting can be preformed via calls to the exchange.

The same subscription api is also available in the server as resolved at `create()`.

```javascript
Happner.create(config)
  .then(function (server) {
    server.event...
  });
```