const commander = require('commander');

commander.option('--activity [boolean]', 'generate activity').parse(process.argv);

const Happner = require('../../lib/mesh');
var adminClient = new Happner.MeshClient({ secure: true, test: 'adminClient' });

adminClient.login({ username: '_ADMIN', password: 'happn' }).then(clientInstance => {
  if (commander.activity) doClientActivity(clientInstance);

  adminClient.on('reconnect/scheduled', reconnectScheduled);
  adminClient.on('reconnect/successful', reconnectSuccessful);
});

function doClientActivity(clientInstance) {
  setInterval(() => {}, 1000);
}

function reconnectScheduled(clientInstance) {
  console.log('reconnect scheduled:::');
}

function reconnectSuccessful(clientInstance) {
  console.log('reconnect successful:::');
}
