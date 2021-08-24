describe('browsertest_06_cookies', function() {
  this.timeout(15000);
  it('logs in with a cookie, cookie lifecycle events are checked', async () => {
    let [client, clientCookie] = [
      new Happner.MeshClient({ port: 55000 }),
      new Happner.MeshClient({ port: 55000 })
    ];
    let cookieEvents = [];
    const cookieEventHandler1 = (event, cookie) => {
      cookieEvents.push({
        event: `${event}1`,
        cookie
      });
    };
    const cookieEventHandler2 = (event, cookie) => {
      cookieEvents.push({
        event: `${event}2`,
        cookie
      });
    };
    const loginOpts = {
      username: 'username',
      password: 'password',
      cookieEventHandler: cookieEventHandler1
    };
    await client.login(loginOpts);
    await delay(3000);
    await clientCookie.login({
      useCookie: true,
      cookieEventHandler: cookieEventHandler2
    });
    await delay(3000);
    await client.disconnect({ deleteCookie: true });
    await delay(3000);
    await client.login(loginOpts);
    await delay(3000);
    const eventKeys = cookieEvents.map(evt => {
      return evt.event;
    });
    expect(eventKeys).to.eql([
      // client1 connects
      'cookie-write1',
      'cookie-created1',
      //client 2 connects with client1's cookie
      'cookie-write2',
      'cookie-created2',
      //client1 expires cookie on disconnection
      'cookie-expired1',
      'cookie-deleted1',
      //client2 detects missing cookie, disconnects and emits cookie deleted
      'cookie-deleted2',
      //client1 reconnects
      'cookie-write1',
      'cookie-created1',
      //client2 detects cookie - and emits cookie created
      'cookie-created2'
    ]);
    await clientCookie.disconnect({ deleteCookie: true });
    await client.disconnect();
  });

  async function delay(ms) {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }
});
