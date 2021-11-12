/* eslint-disable no-console */
describe('browsertest_01_happner_client', function() {
  let client;

  after(async () => {
    if (client) await client.disconnect({ deleteCookie: true });
  });

  expect = window.expect;
  this.timeout(100000);

  it('can set the socket options', function(done) {
    client = new MeshClient({ port: 55000, socket: { pingTimeout: 120000 } });
    client
      .login({
        username: 'username',
        password: 'password'
      })

      .then(function() {
        expect(client.data.socket.options.pingTimeout).to.eql(120000);
        client.disconnect(done);
      })

      .catch(function(error) {
        console.log(error);
        done(error);
      });
  });

  it('can connect a new client', function(done) {
    client = new Happner.HappnerClient();

    client
      .connect(null, {
        username: 'username',
        password: 'password'
      })

      .then(function() {
        done();
      })

      .catch(function(error) {
        console.log(error);
        done(error);
      });
  });

  it('can call exchange method', function(done) {
    client = new Happner.HappnerClient();

    var api = client.construct({
      testComponent2: {
        version: '^2.0.0',
        methods: {
          method1: {}
        }
      }
    });

    client
      .connect(null, {
        username: 'username',
        password: 'password'
      })

      .then(function() {
        return api.exchange.testComponent2.method1();
      })

      .then(function(result) {
        expect(result).to.eql('OK:method1');
      })

      .then(done)
      .catch(done);
  });

  it('can receive events', function(done) {
    var count = 0;

    client = new Happner.HappnerClient();

    var api = client.construct({
      testComponent2: {
        version: '^2.0.0',
        methods: {
          method1: {}
        }
      }
    });

    client
      .connect(null, {
        username: 'username',
        password: 'password'
      })

      .then(function() {
        return new Promise(function(resolve, reject) {
          api.event.testComponent2.on(
            'test/event',
            function() {
              count++;
            },
            function(e) {
              if (e) return reject(e);
              resolve(e);
            }
          );
        });
      })

      .then(function() {
        return new Promise(resolve => setTimeout(resolve, 200));
      })

      .then(function() {
        expect(count > 0).to.equal(true);
      })

      .then(done)
      .catch(done);
  });

  it('can call exchange method, via $', async () => {
    client = new MeshClient({ port: 55000 });
    await client.login({
      username: 'username',
      password: 'password'
    });

    const result = await client.exchange.$call({
      component: 'testComponent2',
      method: 'method1'
    });

    expect(result).to.eql('OK:method1');
  });

  it('can receive events, via $', async () => {
    let emittedCount = 0,
      lastData,
      emittedCountNo$ = 0,
      lastDataNo$;
    client = new MeshClient({ port: 55000 });

    await client.login({
      username: 'username',
      password: 'password'
    });

    await client.event.testComponent3.on('test/event', data => {
      emittedCountNo$++;
      lastDataNo$ = data;
    });

    await client.event.$on(
      { mesh: 'Server', component: 'testComponent3', path: 'test/event' },
      data => {
        emittedCount++;
        lastData = data;
      }
    );

    await delay(2000);

    expect(emittedCountNo$ > 0).to.equal(true);
    expect(lastDataNo$).to.eql({ some: 'data' });

    expect(emittedCount > 0).to.equal(true);
    expect(lastData).to.eql({ some: 'data' });
  });

  it('can call disconnect() even if the login failed', function(done) {
    new MeshClient({ port: 1 }).disconnect(done);
  });

  function delay(ms) {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }
});
/* eslint-enable no-console */
