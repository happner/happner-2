const HappnerClient = require('happner-client');
client = new HappnerClient();

var model = {
  localComponent: {
    version: '*',
    methods: {
      testMethod: {},
      testFireEvent: {}
    }
  }
};

api = client.construct(model);
client.connect(null, { username: '_ADMIN', password: 'happn' }, e => {
  if (e) {
    console.log('happner-client connection failed!!!', e);
    process.exit(1);
  }
  console.log('HAPPNER CLIENT CONNECTED:::');
  client.on('disconnected', reconnectScheduled);
  client.on('reconnected', reconnectSuccessful);
});

function reconnectScheduled(clientInstance) {
  console.log('happner-client: reconnect scheduled:::');
}

function reconnectSuccessful(clientInstance) {
  console.log('happner-client: reconnect successful:::');
}
