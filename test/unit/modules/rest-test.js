const RestModule = require('../../../lib/modules/rest/index');
const sinon = require('sinon');
// const async = require('async');

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
    //     it.only('calls..', function() {
    //       const restModule = new RestModule();
    //       const describeMethod = restModule.describe(
    //         { _mesh: { description: { name: 'name' } } },
    //         undefined,
    //         undefined,
    //         { username: 'username' }
    //       );
    //       const mock = {
    //         __exchangeDescription: { callMenu: 'callMenu' }
    //         //         async: sinon.spy(async, 'eachSeries'),
    //         //         __authorizeAccessPoint: sinon.spy(restModule, '__authorizeAccessPoint')
    //       };
    //       describeMethod.call(mock);
    //       sinon.assert.called(mock);
    //     });
  });
});
