var security = process.argv[2];
var Happner = require('../../../..');

Happner.create({
  name: 'SERVER',
  happn: {
    secure: security == 'secure',
    services: {
      security: {
        config: {
          adminUser: {
            username: '_ADMIN',
            password: 'happn'
          }
        }
      }
    }
  },
  modules: {
    'component': {
      instance: {
        method: function ($happn, callback) {
          return callback(null, 'OK');
        }
      }
    }
  },
  components: {
    'component': {}
  }
})

  .then(function () {
    process.send('READY');
  })

  .catch(function (error) {
    console.log(error);
    process.send('ERROR');
  });
