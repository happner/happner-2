describe('browsertest_01_happner_client', function () {

  // test new happner-client

  expect = window.expect;

  it('can connect a new client', function (done) {

    var client = new Happner.HappnerClient();

    client.connect(null, {
        username: 'username',
        password: 'password'
    })

    .then(function () {
      done();
    })

    .catch(function (error) {
      console.log(error);
      done(error);
    });

  });

  it('can call exchange method', function (done) {

    var client = new Happner.HappnerClient();

    var api = client.construct({
      testComponent2: {
        version: '^2.0.0',
        methods: {
          method1: {}
        }
      }
    });

    client.connect(null, {
      username: 'username',
      password: 'password'
    })

      .then(function () {
        return api.exchange.testComponent2.method1();
      })

      .then(function (result) {
        expect(result).to.eql('OK:method1');
      })

      .then(done).catch(done);

  });

  it('can receive events', function (done) {

    var count = 0;

    var client = new Happner.HappnerClient();

    var api = client.construct({
      testComponent2: {
        version: '^2.0.0',
        methods: {
          method1: {}
        }
      }
    });

    client.connect(null, {
      username: 'username',
      password: 'password'
    })

      .then(function () {
        return new Promise(function (resolve, reject) {
          api.event.testComponent2.on('test/event', function (data, meta) {
            count++;
          }, function (e) {
            if (e) return reject(e);
            resolve(e);
          });
        });
      })

      .then(function () {
        return Promise.delay(200);
      })

      .then(function () {
        expect(count > 0).to.equal(true);
      })

      .then(done).catch(done);
  });
});
