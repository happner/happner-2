const test = require('../../__fixtures/utils/test_helper').create();
const ApiModule = require('../../../lib/modules/api/index');
describe(test.testName(__filename, 4), function() {
  it('calls done with args', function() {
    const done = test.sinon.fake();
    const apiModule = new ApiModule();
    apiModule.test('message', done);

    test.sinon.assert.calledWith(done, null, 'message tested ok');
  });

  it('tests start and stop', async () => {
    const apiModule = new ApiModule();
    const mock$happn = mockhappn();
    await apiModule.start(mock$happn);
    test.sinon.assert.calledOnce(mock$happn._mesh.data.on);
    test.expect(apiModule.exchangeRequestsEventId).to.be(1);
    await apiModule.stop(mock$happn);
    test.sinon.assert.calledOnce(mock$happn._mesh.data.off);
  });

  it('tests component exists', async () => {
    const apiModule = new ApiModule();
    const mock$happn = mockhappn();
    await apiModule.start(mock$happn);
    test.expect(apiModule.__componentExists(mock$happn, 'existing', 'method')).to.be(true);
    await apiModule.stop(mock$happn);
  });

  it('tests component exists, without exact endpoint match', async () => {
    const apiModule = new ApiModule();
    const mock$happn = mockhappn();
    await apiModule.start(mock$happn);
    test
      .expect(apiModule.__componentExists(mock$happn, 'component-no-method', 'method'))
      .to.be(true);
    await apiModule.stop(mock$happn);
  });

  it('tests component does not exist', async () => {
    const apiModule = new ApiModule();
    const mock$happn = mockhappn();
    await apiModule.start(mock$happn);
    test.expect(apiModule.__componentExists(mock$happn, 'no-component', 'method')).to.be(false);
    await apiModule.stop(mock$happn);
  });

  it('tests getComponentAndMethodFromPath', async () => {
    const apiModule = new ApiModule();
    const mock$happn = mockhappn();
    await apiModule.start(mock$happn);
    test
      .expect(apiModule.getComponentAndMethodFromPath('/a/very/long/path/component/method'))
      .to.eql(['component', 'method']);
    test
      .expect(apiModule.__componentAndMethodCache['/a/very/long/path/component/method'])
      .to.eql(['component', 'method']);
    await apiModule.stop(mock$happn);
  });

  it('tests createAllExchangeRequestsHandler', async () => {
    const apiModule = new ApiModule();
    const mock$happn = mockhappn();
    await apiModule.start(mock$happn);
    const requestsHandler = apiModule.createAllExchangeRequestsHandler(mock$happn);
    const __componentExistsSpy = test.sinon.spy(apiModule, '__componentExists');

    requestsHandler(
      {
        callbackAddress: '/test/callback'
      },
      {
        path: '/test-domain/existing/method'
      }
    );
    test.expect(__componentExistsSpy.firstCall.returnValue).to.be(true);
    test.sinon.assert.notCalled(mock$happn._mesh.data.publish);

    requestsHandler(
      {
        callbackAddress: '/test/callback'
      },
      {
        path: '/test-domain/non-existing/method'
      }
    );
    test.expect(__componentExistsSpy.secondCall.returnValue).to.be(false);
    test
      .expect(
        mock$happn._mesh.data.publish.calledWith('/test/callback', {
          args: [
            {
              name: 'bad endpoint',
              message: `Call to unconfigured component: [non-existing.method]`
            }
          ]
        })
      )
      .to.be(true);

    mock$happn._mesh.data.publish = (path, msg, cb) => {
      cb(new Error('test error'));
    };

    requestsHandler(
      {
        callbackAddress: '/test/callback'
      },
      {
        path: '/test-domain/non-existing/method'
      }
    );
    test
      .expect(
        mock$happn.log.warn.calledWith(
          'unable to respond on unconfigured component: [non-existing.method], error: test error'
        )
      )
      .to.be(true);

    requestsHandler(
      {
        callbackAddress: '/test/callback'
      },
      {
        path: '/test-domain/non-existing/method',
        eventOrigin: {
          id: 1,
          username: 'test-user'
        }
      }
    );
    test
      .expect(
        mock$happn.log.warn.calledWith(
          'unable to respond on unconfigured component: [non-existing.method], origin session: 1, origin user: test-user, error: test error'
        )
      )
      .to.be(true);
    await apiModule.stop(mock$happn);
  });

  context('client', function() {
    it('calls $happn.log.$$TRACE with args and res.end', function() {
      const $happen = {
        tools: {
          packages: {
            api: { md5: 'testMatch' }
          }
        },
        log: { $$TRACE: test.sinon.fake() }
      };
      const req = {
        headers: {
          'if-none-match': 'testMatch',
          match: 'two'
        },
        url: 'testUrl'
      };

      const res = {
        statusCode: 200,
        end: test.sinon.fake(),
        writeHead: test.sinon.fake()
      };
      const apiModule = new ApiModule();
      apiModule.client($happen, req, res);

      test.sinon.assert.calledWith(
        $happen.log.$$TRACE,
        'client already has latest version testUrl'
      );
      test.sinon.assert.called(res.end);
    });
  });
});

function mockhappn() {
  return {
    log: {
      warn: test.sinon.stub()
    },
    _mesh: {
      exchange: {
        '/existing/method': {},
        '/component-no-method/noMethod': {}
      },
      config: {
        domain: 'test-domain',
        name: 'test-name'
      },
      data: {
        on: test.sinon.stub().returns(1),
        off: test.sinon.stub(),
        publish: test.sinon.stub()
      }
    }
  };
}
