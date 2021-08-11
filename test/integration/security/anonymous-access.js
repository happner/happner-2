const test = require('../../__fixtures/utils/test_helper').create();
const testName = test.testName(__filename, 3);
const Mesh = require('../../..');

describe(testName, function() {
  this.timeout(200000);
  const test_id = Date.now() + '_' + require('shortid').generate();
  let mesh = new Mesh();
  let groupName = 'TEST GROUP' + test_id;

  const config = {
    name: test_id,
    happn: {
      secure: true,
      services: {
        security: {
          config: {
            allowAnonymousAccess: true
          }
        }
      }
    },
    modules: {
      module: {
        instance: {
          method1: function($happn, callback) {
            $happn.emit('event1');
            callback(null, 'reply1');
          },
          method2: function($happn, callback) {
            $happn.emit('event2');
            callback(null, 'reply2');
          },
          webmethod1: function(req, res) {
            res.end('ok1');
          },
          webmethod2: function(req, res) {
            res.end('ok2');
          }
        }
      }
    },
    components: {
      component: {
        module: 'module',
        web: {
          routes: {
            webmethod1: 'webmethod1',
            webmethod2: 'webmethod2'
          }
        }
      }
    }
  };

  before(function(done) {
    mesh = new Mesh();
    mesh.initialize(config, function(err) {
      if (err) {
        done(err);
      } else {
        mesh.start(done);
      }
    });
  });

  let adminClient = new Mesh.MeshClient({ secure: true, test: 'adminClient' });
  let anonymousUserClient = new Mesh.MeshClient({ secure: true, test: 'anonymousUserClient' });

  before('logs in with the admin and anonymous users', async () => {
    await adminClient.login({
      username: '_ADMIN', // pending
      password: 'happn'
    });
    await anonymousUserClient.login({
      username: '_ANONYMOUS'
    });
  });

  after('logs out', async () => {
    await adminClient.disconnect();
    await anonymousUserClient.disconnect();
    await mesh.stop({ reconnect: false });
  });

  before('adds test group to the anonymous user', async () => {
    await adminClient.exchange.security.addGroup({
      name: groupName,

      custom_data: {
        customString: 'custom1',
        customNumber: 0
      },

      permissions: {
        methods: {
          '/component/method1': { authorized: true },
          '/component/method2': { authorized: false }
        },
        events: {
          '/component/event1': { authorized: true },
          '/component/event2': { authorized: false }
        },
        web: {
          '/component/webmethod1': {
            authorized: true,
            actions: ['get']
          },
          '/component/webmethod2': {
            authorized: false,
            actions: ['*']
          }
        }
      }
    });
    await adminClient.exchange.security.linkAnonymousGroup(groupName);
  });

  it('fails to update own details with anonymous user', async () => {
    let eMessage;
    try {
      await anonymousUserClient.exchange.security.updateOwnUser({
        username: '_ANONYMOUS',
        custom_data: 'test-data'
      });
    } catch (e) {
      eMessage = e.message;
    }
    test.expect(eMessage).to.be('updates to the _ANONYMOUS user are forbidden');
  });

  it('succeeds and fails with method access', async () => {
    test.expect(await tryMethod(anonymousUserClient, 'component', 'method1')).to.be(true);
    test.expect(await tryMethod(anonymousUserClient, 'component', 'method2')).to.be(false);
  });

  it('succeeds and fails with events access', async () => {
    test.expect(await tryEvent(anonymousUserClient, 'component', 'event1')).to.be(true);
    test.expect(await tryEvent(anonymousUserClient, 'component', 'event2')).to.be(false);
  });

  it('succeeds and fails with web access', async () => {
    test.expect(await tryWeb(anonymousUserClient, 'component', 'webmethod1', 'GET')).to.be(true);
    test
      .expect(await tryWeb(anonymousUserClient, 'component', 'webmethod1', 'POST', {}))
      .to.be(false);
    test.expect(await tryWeb(anonymousUserClient, 'component', 'webmethod2', 'GET')).to.be(false);
  });

  it('unlinks the group - ensures the anonymous user has no access', async () => {
    await adminClient.exchange.security.unlinkAnonymousGroup(groupName);
    await test.delay(2000);
    test.expect(await tryMethod(anonymousUserClient, 'component', 'method1')).to.be(false);
    test.expect(await tryMethod(anonymousUserClient, 'component', 'method2')).to.be(false);
    test.expect(await tryEvent(anonymousUserClient, 'component', 'event1')).to.be(false);
    test.expect(await tryEvent(anonymousUserClient, 'component', 'event2')).to.be(false);
    test.expect(await tryWeb(anonymousUserClient, 'component', 'webmethod1', 'GET')).to.be(false);
    test
      .expect(await tryWeb(anonymousUserClient, 'component', 'webmethod1', 'POST', {}))
      .to.be(false);
    test.expect(await tryWeb(anonymousUserClient, 'component', 'webmethod2', 'GET')).to.be(false);
  });

  async function tryMethod(client, component, method, args) {
    try {
      await client.exchange[component][method].apply(args);
      return true;
    } catch (e) {
      if (e.message === 'unauthorized') {
        return false;
      }
      throw e;
    }
  }

  async function tryWeb(client, component, method, verb, body) {
    try {
      const response = await doRequest(`${component}/${method}`, client.token, verb, body);
      if (response.status === 200) return true;
    } catch (e) {
      if (e.message === 'Request failed with status code 403') return false;
    }
    throw new Error(`unexpected response`);
  }

  async function tryEvent(client, component, event) {
    try {
      await client.event[component].on(event, () => {});
      return true;
    } catch (e) {
      if (e.message === 'unauthorized') {
        return false;
      }
      throw e;
    }
  }

  async function doRequest(path, token, verb, body) {
    const axios = require('axios').create({ baseURL: 'http://127.0.0.1:55000' });

    if (verb === 'POST') {
      return axios.post(path + '?happn_token=' + token, body);
    }

    if (verb === 'GET') {
      return axios.get(path + '?happn_token=' + token);
    }
  }
});
