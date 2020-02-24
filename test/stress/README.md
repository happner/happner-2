# start the stress test server
```javascript
node test/stress/server.js
```

# start a mesh client, method call and emit every 5 seconds
node test/stress/client.js --activity 5000 

# start a happner-client, method call and emit every 5 seconds
node test/stress/happner-client.js --activity 5000

# start a happner-endpoint client
node test/stress/happner-endpoint-client.js
