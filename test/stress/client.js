/**
 Simon: run up an old school mesh client, for emulating reconnection logic and some activity
 */
const commander = require('commander');
commander.option('--activity [number]', 'activity interval').parse(process.argv);

const Happner = require('../../lib/mesh');
var adminClient = new Happner.MeshClient({ secure: true, test: 'adminClient' });

adminClient.login({ username: '_ADMIN', password: 'happn' })
.then(() => {
  adminClient.on('reconnect/scheduled', reconnectScheduled);
  adminClient.on('reconnect/successful', reconnectSuccessful);
  if (commander.activity) {
    adminClient.event.localComponent.on('emit: 1', () => {
      console.log('emit: 1 done');
    }, (e) => {
      doClientActivity();
    });
  }
});

function doClientActivity() {

  adminClient.exchange.localComponent.testFireEvent('1', (e) => {
    if (e){
      console.log('activity issue: ', e);
    }
    setTimeout(doClientActivity, commander.activity);
  });  
}

function reconnectScheduled() {
  console.log('reconnect scheduled...');
}

function reconnectSuccessful() {
  console.log('reconnect successful...');
}
