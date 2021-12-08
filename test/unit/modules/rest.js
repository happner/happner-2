const test = require('../../__fixtures/utils/test_helper').create();
describe(test.testName(__filename, 3), function() {
  const RestModule = require('../../../lib/modules/rest/index');
  describe('login', function() {
    it('calls __respond with no password', function() {
      const body = { parameters: { username: 'user' } };
      const restModule = new RestModule();
      const loginMethod = restModule.login;
      const mock = {
        __parseBody: (req, res, $happn, callback) => callback(body),
        __respond: test.sinon.stub(restModule, '__respond')
      };
      loginMethod.call(mock);
      test.sinon.assert.calledWith(
        mock.__respond,
        test.sinon.match.any,
        test.sinon.match.any,
        null,
        test.sinon.match.instanceOf(Error).and(test.sinon.match.has('message', 'no password')),
        undefined,
        401
      );
    });

    it('calls __respond with no username', function() {
      const body = { parameters: { password: 'password' } };
      const restModule = new RestModule();
      const loginMethod = restModule.login;
      const mock = {
        __parseBody: (req, res, $happn, callback) => callback(body),
        __respond: test.sinon.stub(restModule, '__respond')
      };
      loginMethod.call(mock);
      test.sinon.assert.calledWith(
        mock.__respond,
        test.sinon.match.any,
        test.sinon.match.any,
        null,
        test.sinon.match.instanceOf(Error).and(test.sinon.match.has('message', 'no username')),
        undefined,
        401
      );
    });

    it('calls login', function() {
      const body = { parameters: { password: 'password', username: 'username' } };
      const restModule = new RestModule();
      const loginMethod = restModule.login;
      const mock = {
        __parseBody: (req, res, $happn, callback) => callback(body),
        __securityService: { login: test.sinon.fake() }
      };
      loginMethod.call(mock);
      test.sinon.assert.calledWith(
        mock.__securityService.login,
        { username: 'username', password: 'password' },
        test.sinon.match.any
      );
    });

    it('calls __respond after __securityService.login', function() {
      const body = { parameters: { password: 'password', username: 'username' } };
      const restModule = new RestModule();
      const loginMethod = restModule.login;
      const mock = {
        __parseBody: (req, res, $happn, callback) => callback(body),
        __securityService: {
          login: test.sinon.stub().callsArgWith(1, 'not what is test.expected')
        },
        __respond: test.sinon.stub()
      };
      loginMethod.call(mock);
      test.sinon.assert.calledWith(
        mock.__respond,
        undefined,
        'Failure logging in',
        null,
        'not what is test.expected',
        undefined
      );
    });
  });

  describe('describe', function() {
    it('calls accessPointCB if error in __authorizeAccessPoint', function() {
      const restModule = new RestModule();
      const describeMethod = restModule.describe;
      const error = new Error('error');
      const mock = {
        __exchangeDescription: { callMenu: 'callMenu' },
        __authorizeAccessPoint: test.sinon
          .stub(restModule, '__authorizeAccessPoint')
          .callsArgWith(3, error),
        __respond: test.sinon.stub(restModule, '__respond')
      };
      describeMethod.call(
        mock,
        { _mesh: { description: { name: 'name' } } },
        undefined,
        undefined,
        { username: 'usernames' }
      );
      test.sinon.assert.calledWith(
        mock.__respond,
        test.sinon.match.any,
        'call failed',
        test.sinon.match.any,
        error,
        test.sinon.match.any
      );
    });
  });
  describe('__authorize', function() {
    it('calls __respond if !$origin', function() {
      const restModule = new RestModule();
      const __authorizeMethod = restModule.__authorize;
      const $happn = { _mesh: { config: { happn: { secure: 'secure' } } } };
      const successful = test.sinon.fake();

      const mock = {
        __respond: test.sinon.stub(restModule, '__respond'),
        __authorizeAccessPoint: test.sinon.stub(restModule, '__authorizeAccessPoint')
      };
      __authorizeMethod.call(mock, undefined, $happn, undefined, undefined, successful);
      test.sinon.assert.calledWith(
        mock.__respond,
        $happn,
        'Bad origin',
        null,
        test.sinon.match.any,
        undefined,
        403
      );
    });

    it('calls __respond if __respond errors', function() {
      const restModule = new RestModule();
      const __authorizeMethod = restModule.__authorize;
      const $happn = { _mesh: { config: { happn: { secure: 'secure' } } } };
      const $origin = { origin: 'origin' };
      const successful = test.sinon.fake();

      const mock = {
        __authorizeAccessPoint: test.sinon
          .stub(restModule, '__authorizeAccessPoint')
          .callsArgWith(3, 'error', true, 'reason'),
        __respond: test.sinon.stub(restModule, '__respond')
      };
      __authorizeMethod.call(mock, undefined, $happn, $origin, undefined, successful);
      test.sinon.assert.calledWith(
        mock.__respond,
        $happn,
        'Authorization failed',
        null,
        test.sinon.match.any,
        undefined,
        403
      );
    });
  });

  describe('__parseBody', function() {
    it('calls __respond in jsonBody', function() {
      const restModule = new RestModule();
      const req = { method: 'PUT' };
      const res = 'res';
      const $happn = '$happn';
      const callback = test.sinon.fake();
      restModule.jsonBody = test.sinon.stub().callsArgWith(2, 'error', {});
      restModule.__respond = test.sinon.stub(restModule, '__respond');
      restModule.__parseBody(req, res, $happn, callback);
      test.sinon.assert.calledWith(
        restModule.__respond,
        $happn,
        'Failure parsing request body',
        null,
        'error'
      );
    });

    it('calls __respond if error in try catch', function() {
      const restModule = new RestModule();
      const __parseBodyMethod = restModule.__parseBody;
      const req = { methodd: 'PUT' };
      const res = 'res';
      const $happn = '$happn';
      const callback = test.sinon.fake();

      const mock = {
        jsonBody: test.sinon.stub().callsArgWith(2, 'error', {}),
        __respond: test.sinon.stub(restModule, '__respond')
      };
      __parseBodyMethod.call(mock, req, res, $happn, callback);
      test.sinon.assert.calledWith(
        mock.__respond,
        $happn,
        'Failure parsing request body',
        null,
        test.sinon.match.any
      );
    });
  });

  describe('handleRequest', function() {
    it('can __mapMethodArguments', function() {
      const restModule = new RestModule();
      let mockReq = {
        test: 'mockReq.test'
      };
      let mockRes = {};
      let mockMethodDescription = {
        parameters: []
      };
      let mockBody = {};
      let mock$happn = {};
      let mock$origin = {};
      const args = restModule.__mapMethodArguments(
        mockReq,
        mockRes,
        mockMethodDescription,
        mockBody,
        mock$happn,
        mock$origin
      );
      test.expect(args.length).to.be(1);
      test.expect(typeof args[0]).to.be('function');

      mockBody.parameters = {
        found: {}
      };

      mockMethodDescription.parameters.push({
        name: 'callback'
      });
      mockMethodDescription.parameters.push({
        name: '$restParams'
      });
      mockMethodDescription.parameters.push({
        name: '$userSession'
      });
      mockMethodDescription.parameters.push({
        name: '$req_test'
      });
      mockMethodDescription.parameters.push({
        name: 'unfound'
      });
      mockMethodDescription.parameters.push({
        name: 'found'
      });
      const args1 = restModule.__mapMethodArguments(
        mockReq,
        mockRes,
        mockMethodDescription,
        mockBody,
        mock$happn,
        mock$origin
      );

      test.expect(args1.length).to.be(6);
      test.expect(typeof args1[0]).to.be('function');
      test.expect(args1.slice(1)).to.eql([{ found: {} }, {}, 'mockReq.test', null, {}]);
    });

    it('calls __respond if errors', function() {
      const restModule = new RestModule();
      const handleRequestMethod = restModule.handleRequest;
      const req = { method: 'PUT' };
      const res = 'res';
      const $happn = '$happn';
      const $origin = '$origin';

      const mock = {
        __respond: test.sinon.stub()
      };
      handleRequestMethod.call(mock, req, res, $happn, $origin);
      test.sinon.assert.calledWith(
        mock.__respond,
        $happn,
        'Call failed',
        null,
        test.sinon.match.any,
        res,
        500
      );
    });

    describe('__buildCallMenu', function() {
      it('callmenu should be menu', function() {
        const restModule = new RestModule();
        const __buildCallMenuMethod = restModule.__buildCallMenu;
        const exchangeDescription = 'exchangeDescription';
        const endpoint = 'endpoint';
        const menu = 'menu';
        const mock = {};
        __buildCallMenuMethod.call(mock, exchangeDescription, endpoint, menu);
        test.sinon.assert.match(menu, 'menu');
        test.sinon.assert.match(endpoint, 'endpoint');
      });

      it('callmenu should have been comprised of some test uris', function() {
        const restModule = new RestModule();
        const __buildCallMenuMethod = restModule.__buildCallMenu;
        const exchangeDescription = {
          components: {
            security: {
              methods: {
                doSomethingNaughty: {
                  parameters: [{ name: 'testParam' }]
                }
              }
            },
            rest: {
              methods: {
                doSomethingNaughty: {
                  parameters: [{ name: 'testParam' }]
                }
              }
            },
            test: {
              methods: {
                doSomethingGood: {
                  parameters: [{ name: 'testParam' }]
                }
              }
            }
          }
        };
        test
          .expect(__buildCallMenuMethod.call({}, exchangeDescription, 'testEndpoint', {}))
          .to.eql({
            '/testEndpoint/test/doSomethingGood': {
              uri: '/testEndpoint/test/doSomethingGood',
              parameters: { testParam: '{{testParam}}' }
            }
          });
        test.expect(__buildCallMenuMethod.call({}, exchangeDescription)).to.eql({
          '/test/doSomethingGood': {
            uri: '/test/doSomethingGood',
            parameters: { testParam: '{{testParam}}' }
          }
        });
      });
    });
  });

  function mock$happn(options) {
    if (!options) options = {};

    var $happn = {};

    options._mesh = options._mesh || {};

    options._mesh.happn = options._mesh.happn || {};

    options._mesh.happn.server = options._mesh.happn.server || {};

    options._mesh.happn.server.services = options._mesh.happn.server.services || {};

    options._mesh.happn.server.services.stats = options._mesh.happn.server.services.stats || {
      on: function() {}
    };

    $happn._mesh = options._mesh;

    $happn.emitLocal = options.emitLocal || function() {};

    $happn.log = options.log || {
      info: function() {},
      error: function() {}
    };

    return $happn;
  }

  function mockRestModule(options, callback) {
    if (!options) options = {};
    const RestModule = require('../../../lib/modules/rest/index');
    const restModule = new RestModule();
    const Events = require('events');
    const _mesh = new Events.EventEmitter();
    _mesh.description = {
      initializing: true,
      setOptions: {},
      _meta: {}
    };
    options.$happn =
      options.$happn ||
      mock$happn({
        _mesh,
        emitLocal: function(path, data, callback) {
          callback();
        },
        log: {
          info: function() {},
          error: function() {},
          trace: function() {},
          warn: function() {}
        }
      });

    restModule.initialize(options.$happn, function(e) {
      if (e) return callback(e);
      return callback(null, restModule, _mesh);
    });
  }

  it('tests the initialize and __updateDescription functions', function(done) {
    mockRestModule(null, function(e, restModule, _mesh) {
      if (e) return done(e);
      //removed unwanted fields from original description
      test.expect(restModule.__exchangeDescription).to.eql({ callMenu: {} });
      _mesh.emit('description-updated', { extraField: true });
      test.expect(restModule.__exchangeDescription).to.eql({ callMenu: {}, extraField: true });
      done();
    });
  });
});
