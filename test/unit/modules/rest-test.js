const RestModule = require('../../../lib/modules/rest/index');
const sinon = require('sinon');

describe('RestModule', function() {
  describe('login', function() {
    it('calls __respond with no password', function() {
      const body = { parameters: { username: 'user' } };
      const restModule = new RestModule();
      const loginMethod = restModule.login;
      const mock = {
        __parseBody: (req, res, $happn, callback) => callback(body),
        __respond: sinon.stub(restModule, '__respond')
      };
      loginMethod.call(mock);
      sinon.assert.calledWith(
        mock.__respond,
        sinon.match.any,
        sinon.match.any,
        null,
        sinon.match.instanceOf(Error).and(sinon.match.has('message', 'no password')),
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
        __respond: sinon.stub(restModule, '__respond')
      };
      loginMethod.call(mock);
      sinon.assert.calledWith(
        mock.__respond,
        sinon.match.any,
        sinon.match.any,
        null,
        sinon.match.instanceOf(Error).and(sinon.match.has('message', 'no username')),
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
        __securityService: { login: sinon.fake() }
      };
      loginMethod.call(mock);
      sinon.assert.calledWith(
        mock.__securityService.login,
        { username: 'username', password: 'password' },
        sinon.match.any
      );
    });

    it('calls __respond after __securityService.login', function() {
      const body = { parameters: { password: 'password', username: 'username' } };
      const restModule = new RestModule();
      const loginMethod = restModule.login;
      const mock = {
        __parseBody: (req, res, $happn, callback) => callback(body),
        __securityService: {
          login: sinon.stub().callsArgWith(1, 'not what is expected')
        },
        __respond: sinon.stub()
      };
      loginMethod.call(mock);
      sinon.assert.calledWith(
        mock.__respond,
        undefined,
        'Failure logging in',
        null,
        'not what is expected',
        undefined
      );
    });
  });

  describe('describe', function() {
    it('calls accessPointCB if error in __authorizeAccessPoint', function() {
      const restModule = new RestModule();
      const describeMethod = restModule.describe;
      const accessPoint = sinon.fake();
      const accessPointCB = sinon.fake();
      const mock = {
        __exchangeDescription: { callMenu: 'callMenu' },
        async: sinon.stub().callsArgWith(1, accessPoint, accessPointCB),
        __authorizeAccessPoint: sinon
          .stub(restModule, '__authorizeAccessPoint')
          .callsArgWith(3, 'error')
      };
      describeMethod.call(
        mock,
        { _mesh: { description: { name: 'name' } } },
        undefined,
        undefined,
        { username: 'usernames' }
      );
      sinon.assert.calledWith(accessPointCB, 'error');
    });

    it('calls __respond if error', function() {
      const restModule = new RestModule();
      const describeMethod = restModule.describe;
      const mock = {
        __exchangeDescription: { callMenu: 'callMenu' },
        async: sinon.stub().callsArgWith(2, 'error'),
        __respond: sinon.stub(restModule, '__respond')
      };
      describeMethod.call(
        mock,
        { _mesh: { description: { name: 'name' } } },
        undefined,
        undefined,
        { username: 'usernames' }
      );
      sinon.assert.calledWith(
        mock.__respond,
        { _mesh: { description: { name: 'name' } } },
        'call failed',
        null,
        'error',
        undefined
      );
    });
  });

  describe('__authorize', function() {
    it('calls __respond if !$origin', function() {
      const restModule = new RestModule();
      const __authorizeMethod = restModule.__authorize;
      const $happn = { _mesh: { config: { happn: { secure: 'secure' } } } };
      const successful = sinon.fake();

      const mock = {
        __respond: sinon.stub(restModule, '__respond'),
        __authorizeAccessPoint: sinon.stub(restModule, '__authorizeAccessPoint')
      };
      __authorizeMethod.call(mock, undefined, undefined, $happn, undefined, undefined, successful);
      sinon.assert.calledWith(
        mock.__respond,
        $happn,
        'Bad origin',
        null,
        sinon.match.any,
        undefined,
        403
      );
    });

    it('calls __respond if __respond errors', function() {
      const restModule = new RestModule();
      const __authorizeMethod = restModule.__authorize;
      const $happn = { _mesh: { config: { happn: { secure: 'secure' } } } };
      const $origin = { origin: 'origin' };
      const successful = sinon.fake();

      const mock = {
        __authorizeAccessPoint: sinon
          .stub(restModule, '__authorizeAccessPoint')
          .callsArgWith(3, 'error', true, 'reason'),
        __respond: sinon.stub(restModule, '__respond')
      };
      __authorizeMethod.call(mock, undefined, undefined, $happn, $origin, undefined, successful);
      sinon.assert.calledWith(
        mock.__respond,
        $happn,
        'Authorization failed',
        null,
        sinon.match.any,
        undefined,
        403
      );
    });
  });

  describe('__parseBody', function() {
    it('calls __respond in jsonBody', function() {
      const restModule = new RestModule();
      const __parseBodyMethod = restModule.__parseBody;
      const req = { method: 'PUT' };
      const res = 'res';
      const $happn = '$happn';
      const callback = sinon.fake();

      const mock = {
        jsonBody: sinon.stub().callsArgWith(2, 'error', {}),
        __respond: sinon.stub(restModule, '__respond')
      };
      __parseBodyMethod.call(mock, req, res, $happn, callback);
      sinon.assert.calledWith(
        mock.__respond,
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
      const callback = sinon.fake();

      const mock = {
        jsonBody: sinon.stub().callsArgWith(2, 'error', {}),
        __respond: sinon.stub(restModule, '__respond')
      };
      __parseBodyMethod.call(mock, req, res, $happn, callback);
      sinon.assert.calledWith(
        mock.__respond,
        $happn,
        'Failure parsing request body',
        null,
        sinon.match.any
      );
    });
  });
});
