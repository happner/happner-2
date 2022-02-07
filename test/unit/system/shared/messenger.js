const test = require('../../../__fixtures/utils/test_helper').create();

describe(test.testName(__filename, 3), function() {
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
    test.expect(testMessenger.responseHandlers).to.eql({});
    test.expect(handlerEvents).to.eql(['connection-ended', 'connection-ended']);
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
    await test.delay(2500);
    test.expect(testMessenger.responseHandlers).to.eql({
      'test/path/1': { handler }
    });
    test.expect(handlerEvents).to.eql(['Request timed out']);
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
    await test.delay(500);
    test.expect(testMessenger.responseHandlers).to.eql({
      'test/path/1': { handler }
    });
    test.expect(handlerEvents).to.eql([]);
  });

  it('test various failure states', async () => {
    const Messenger = require('../../../../lib/system/shared/messenger');
    const endpoint = mockEndpoint();
    const mesh = mockMesh();
    const testMessenger = new Messenger(endpoint, mesh);

    const errorMessages = [];
    try {
      await test.util.promisify(testMessenger.__createMessage)(
        'test/callback/address',
        {
          parameters: [
            { name: '$happn' },
            { name: '$origin' },
            { name: 'callback', type: 'callback' }
          ]
        },
        []
      );
    } catch (e) {
      errorMessages.push(e.message);
    }
    try {
      await test.util.promisify(testMessenger.__createMessage)(
        'test/callback/address',
        {
          parameters: [
            { name: '$happn' },
            { name: '$origin' },
            { name: 'callback', type: 'callback' }
          ]
        },
        [{}]
      );
    } catch (e) {
      errorMessages.push(e.message);
    }
    test
      .expect(errorMessages)
      .to.eql([
        `Callback for test/callback/address was not defined`,
        `Invalid callback for test/callback/address, callback must be a function`
      ]);
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
