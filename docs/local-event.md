[◀](event.md) event api | exchange api [▶](exchange.md)

## Local Event Api

### Emitting Events

Local events can be emitted only between mesh components in the same node. These events do not reach clients or go over the network.

__These events use the standard node `EventEmitter` and do not support wildcards.__

```javascript
Component1.prototype.makeSomethingHappen = function ($happner, callback) {
  $happner.localEventEmitter.emit('something/happened', {data: 1});
  callback();
};
```

### Subscribing and Unsubscribing

```javascript
Component2.prototype.start = function ($happner, callback) {
  
  // subscribe
  $happner.localEvent.component1.on(
    'something/happened', this.eventHandler = function (data) {
  });
  
  callback();
};

Component2.prototype.stop = function ($happner, callback) {
  
  // unsubscribe
  $happner.localEvent.component1.removeListener('something/happened', this.eventHandler);
  
  callback();
};
```

The same subscription api is also available in the server as resolved at `create()`.

```javascript
Happner.create(config)
  .then(function (server) {
    server.localEvent...
  });
```

