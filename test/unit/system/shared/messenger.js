const tests = require('../../../__fixtures/utils/test_helper').create();

describe(tests.testName(__filename, 3), function() {
  this.timeout(10000);

  it('ensure the handler is removed from responseHandlers on connection-ended', function() {
    const Messenger = require('../../../../lib/system/shared/messenger');
    const endpoint = mockEndpoint();
    const mesh = mockMesh();
    const testMessenger = new Messenger(endpoint, mesh);
    const handlerEvents = [];
    const handler = e => {
      handlerEvents.push(e.message || e);
    };
    testMessenger.responseHandlers = {
      'test/path/1': { handler },
      'test/path/2': { handler }
    };
    endpoint.data.emit('connection-ended');
    tests.expect(testMessenger.responseHandlers).to.eql({});
    tests.expect(handlerEvents).to.eql(['connection-ended', 'connection-ended']);
  });

  it('ensure the handler is removed from responseHandlers on api request timeout', async () => {
    const Messenger = require('../../../../lib/system/shared/messenger');
    const endpoint = mockEndpoint();
    const mesh = mockMesh();
    const testMessenger = new Messenger(endpoint, mesh);
    const handlerEvents = [];
    const handler = e => {
      handlerEvents.push(e.message || e);
    };
    testMessenger.responseHandlers = {
      'test/path/1': { handler },
      'test/path/2': { handler }
    };
    testMessenger.__createCallbackHandler(handler, {
      callbackAddress: 'test/path/2'
    });
    await tests.delay(2500);
    tests.expect(testMessenger.responseHandlers).to.eql({
      'test/path/1': { handler }
    });
    tests.expect(handlerEvents).to.eql(['Request timed out']);
  });

  it('ensure the handler is removed from responseHandlers on api request timeout, on conclusion of an exchange request', async () => {
    const Messenger = require('../../../../lib/system/shared/messenger');
    const endpoint = mockEndpoint();
    const mesh = mockMesh();
    const testMessenger = new Messenger(endpoint, mesh);
    const handlerEvents = [];
    const handler = mockHandler(handlerEvents);
    testMessenger.responseHandlers = {
      'test/path/1': { handler }
    };
    const callbackHandler = testMessenger.__createCallbackHandler(handler, {
      callbackAddress: 'test/path/2'
    });
    testMessenger.responseHandlers['test/path/2'] = callbackHandler;
    callbackHandler.handleResponse([null, 1]);
    await tests.delay(500);
    tests.expect(testMessenger.responseHandlers).to.eql({
      'test/path/1': { handler }
    });
    tests.expect(handlerEvents).to.eql([]);
  });

  function mockHandler(handlerEvents) {
    return e => {
      if (e == null) return;
      handlerEvents.push(e.message || e);
    };
  }

  function mockMesh() {
    return {
      config: {
        happn: {}
      }
    };
  }

  function mockEndpoint() {
    const handlers = {};
    return {
      description: {
        setOptions: {
          timeout: 2000
        }
      },
      data: {
        session: { id: 1 },
        emit: evt => {
          if (!handlers[evt]) return;
          handlers[evt].forEach(handler => {
            handler(evt);
          });
        },
        onEvent: (evt, handler) => {
          if (!handlers[evt]) handlers[evt] = [];
          handlers[evt].push(handler);
        }
      }
    };
  }
});
