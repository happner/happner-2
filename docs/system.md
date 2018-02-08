[&#9664;](starting.md) starting a mesh node | using the client [&#9654;](client.md)

## System Components

The mesh starts with a default set of system components running.

### Api

This component serves the MeshClient script for use in the browser.

[http://localhost:55000/api/client](http://localhost:55000/api/client)

eg.

```html
<script type='text/javascript' src='/api/client'></script>
```

### Data


### Proxy


### Security


### System

####Stats

The system emits statistics at a configurable interval. To configure, set interval in milliseconds in the happn subconfig.

```javascript
config = {
  happn: {
    services: {
      stats: {
        config: {
          interval: 10 * 1000 // the default
        }
      }
    }
  }
}
```

A custom component (installed at each happner node) can subscribe to the local stats and inject the data into a 3rd party metrics service.

```javascript
$happn.event.system.on('stats/system', function (stats) {
  
  // ... push a selection of the stats to 3rd party metrics service
  
});
```

#### useful stats properties

##### stats.component[componentName].calls

total count of exchange calls made to componentName

##### stats.component[componentName].emits

total count of event emits from componentName

##### stats.component[componentName].callsPerSec

average exchange calls per second made since last stats measurement

##### stats.component[componentName].emitsPerSec

average emits per second made since last measurement

##### stats.system

host system details

##### stats.timestamp

time of this measurement

##### stats.totalCalls

total count of exchange calls to all components

##### stats.totalEmits

total count of emits from all components

##### stats.callsPerSec

average exchange calls per second to all components since last measurement

##### stats.emitsPerSec

average emits per second from all components since last measurement

##### stats.logs

array of recent log messages

##### stats.usage

process statistics, mem, %cpu

##### stats.happn.queue[queueName].length

count of items awaiting processing in happn queue

##### stats.happn.queue[queueName].running

count of items busy processing in happn queue

##### stats.happn.queue[queueName].rate

average number of items per second been added to queue since last measure