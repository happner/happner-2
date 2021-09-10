describe('browsertest_06_cookies', function() {
  this.timeout(60000);

  //use cases:
  // multiple tabs, one logs out, all log out
  // multiple tabs, one logs out, all log out
  // multiple tabs - all logged out - 1 logs in all others log in

  async function tryLogin(client, fail) {
    try {
      return await client.login({
        useCookie: true
      });
    } catch (e) {
      expect(e.message).to.equal('happn server is secure, please specify a username or token');
      if (fail) return client;
      await client.login({
        username: 'username',
        password: 'password'
      });
      return client;
    }
  }

  async function checkClientsConnected(clients) {
    try {
      for (let client of clients) {
        expect(await client.exchange.test.allowedMethod(1)).to.eql(1);
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  function pushCookieEvent(cookieEvents) {
    return function(event, cookie) {
      // eslint-disable-next-line no-console
      console.log(`pushed ${event}`);
      cookieEvents.push({
        event,
        cookie
      });
    };
  }

  it('tests using the login as an initial cookie check', async () => {
    Happner.MeshClient.clearCookieEventObjects();
    let cookieEvents = [];
    const testPushCookieEvent = pushCookieEvent(cookieEvents);
    const cookieEventHandler1 = async (event, cookie) => {
      if (event === 'cookie-deleted' && client1) {
        testPushCookieEvent(`${event}1`, cookie);
        await client1.disconnect();
      }
      if (event === 'cookie-created' && client1) {
        testPushCookieEvent(`${event}1`, cookie);
        await tryLogin(client1);
      }
    };
    const cookieEventHandler2 = async (event, cookie) => {
      if (event === 'cookie-deleted' && client2) {
        testPushCookieEvent(`${event}2`, cookie);
        await client2.disconnect();
      }
      if (event === 'cookie-created' && client2) {
        testPushCookieEvent(`${event}2`, cookie);
        await tryLogin(client2);
      }
    };
    var [client1, client2] = [
      new Happner.MeshClient({ port: 55000, cookieEventHandler: cookieEventHandler1 }),
      new Happner.MeshClient({ port: 55000, cookieEventHandler: cookieEventHandler2 })
    ];

    testPushCookieEvent('connecting client 1');
    await tryLogin(client1);
    testPushCookieEvent('connected client 1');
    await delay(2000);
    testPushCookieEvent('connecting client 2');
    await tryLogin(client2);
    testPushCookieEvent('connected client 2');
    await delay(2000);
    expect(await checkClientsConnected([client1, client2])).to.equal(true);
    testPushCookieEvent('disconnecting client 1');
    await client1.disconnect({ deleteCookie: true });
    testPushCookieEvent('disconnected client 1');
    await delay(2000);
    testPushCookieEvent('connecting client 2');
    await tryLogin(client2);
    testPushCookieEvent('connected client 2');
    await delay(2000);
    expect(await checkClientsConnected([client1, client2])).to.equal(true);
    testPushCookieEvent('disconnecting client 2');
    await client2.disconnect({ deleteCookie: true });
    testPushCookieEvent('disconnected client 2');
    await delay(2000);
    expect(await checkClientsConnected([client1])).to.equal(false);
    expect(await checkClientsConnected([client2])).to.equal(false);
    testPushCookieEvent('connecting client 1');
    await tryLogin(client1);
    testPushCookieEvent('connected client 1');
    await delay(2000);
    expect(await checkClientsConnected([client1, client2])).to.equal(true);
    const eventKeys = cookieEvents.map(evt => {
      return evt.event;
    });
    expect(eventKeys).to.eql([
      // client 1 connects, fires cookie created
      'connecting client 1',
      'connected client 1',
      'cookie-created1',
      // client 2 connects using cookie
      'connecting client 2',
      'connected client 2',
      // client 1 disconnects, cookie deleted fires for both clients
      'disconnecting client 1',
      'disconnected client 1',
      'cookie-deleted1',
      'cookie-deleted2',
      // client 2 connects, cookie created fires for both clients
      'connecting client 2',
      'connected client 2',
      'cookie-created1',
      'cookie-created2',
      // client 2 disconnects, cookie deleted fires for both clients
      'disconnecting client 2',
      'disconnected client 2',
      'cookie-deleted1',
      'cookie-deleted2',
      // client 1 connects, fires cookie created for both clients
      'connecting client 1',
      'connected client 1',
      'cookie-created1',
      'cookie-created2'
    ]);
    await client2.disconnect({ deleteCookie: true });
  });

  it('tests using the login as an initial cookie check, after unsuccessful cookie login', async () => {
    Happner.MeshClient.clearCookieEventObjects();
    let cookieEvents = [];
    const testPushCookieEvent = pushCookieEvent(cookieEvents);
    const cookieEventHandler1 = async (event, cookie) => {
      if (event === 'cookie-deleted' && client1) {
        testPushCookieEvent(`${event}1`, cookie);
        await client1.disconnect();
      }
      if (event === 'cookie-created' && client1) {
        testPushCookieEvent(`${event}1`, cookie);
        await tryLogin(client1);
      }
    };
    const cookieEventHandler2 = async (event, cookie) => {
      if (event === 'cookie-deleted' && client2) {
        testPushCookieEvent(`${event}2`, cookie);
        await client2.disconnect();
      }
      if (event === 'cookie-created' && client2) {
        testPushCookieEvent(`${event}2`, cookie);
        await tryLogin(client2);
      }
    };
    var [client1, client2] = [
      new Happner.MeshClient({ port: 55000, cookieEventHandler: cookieEventHandler1 }),
      new Happner.MeshClient({ port: 55000, cookieEventHandler: cookieEventHandler2 })
    ];

    testPushCookieEvent('connecting client 1');
    await tryLogin(client1, true);
    testPushCookieEvent('failed connecting client 1');
    await delay(2000);
    testPushCookieEvent('connecting client 2');
    await tryLogin(client2);
    testPushCookieEvent('connected client 2');
    await delay(2000);
    expect(await checkClientsConnected([client1, client2])).to.equal(true);
    testPushCookieEvent('disconnecting client 1');
    await client1.disconnect({ deleteCookie: true });
    testPushCookieEvent('disconnected client 1');
    await delay(2000);
    testPushCookieEvent('connecting client 2');
    await tryLogin(client2);
    testPushCookieEvent('connected client 2');
    await delay(2000);
    expect(await checkClientsConnected([client1, client2])).to.equal(true);
    testPushCookieEvent('disconnecting client 2');
    await client2.disconnect({ deleteCookie: true });
    testPushCookieEvent('disconnected client 2');
    await delay(2000);
    expect(await checkClientsConnected([client1])).to.equal(false);
    expect(await checkClientsConnected([client2])).to.equal(false);
    testPushCookieEvent('connecting client 1');
    await tryLogin(client1);
    testPushCookieEvent('connected client 1');
    await delay(2000);
    expect(await checkClientsConnected([client1, client2])).to.equal(true);
    const eventKeys = cookieEvents.map(evt => {
      return evt.event;
    });
    expect(eventKeys).to.eql([
      //failed connection - client 1
      'connecting client 1',
      'failed connecting client 1',
      //successful connection client 2 with username and password
      'connecting client 2',
      'connected client 2',
      // client 1 and client 2 get cookie created
      'cookie-created1',
      'cookie-created2',
      // diconnecting client 1, client 1 and client 2 get cookie deleted
      'disconnecting client 1',
      'disconnected client 1',
      'cookie-deleted1',
      'cookie-deleted2',
      // connecting client 2, both see cookie created
      'connecting client 2',
      'connected client 2',
      'cookie-created1',
      'cookie-created2',
      // disconnecting client 2, client 1 and client 2 get cookie deleted
      'disconnecting client 2',
      'disconnected client 2',
      'cookie-deleted1',
      'cookie-deleted2',
      //connecting client 1, client 1 and client 2 get cookie created
      'connecting client 1',
      'connected client 1',
      'cookie-created1',
      'cookie-created2'
    ]);
    await client2.disconnect({ deleteCookie: true });
  });

  async function delay(ms) {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }
});
