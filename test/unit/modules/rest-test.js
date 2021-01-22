const RestModule = require('../../../lib/modules/rest/index');
const sinon = require('sinon');
const async = require('async');
describe('RestModule', function() {
  describe('login', function() {
    it('calls __respond with no password', function() {
      const body = { parameters: { username: 'user' } };
      const restModule = new RestModule();
      const loginMethod = restModule.login;
      const mock = {
        name: 'anti-name',
        __parseBody: (req, res, $happn, callback) => callback(body),
        __respond: sinon.stub(restModule, '__respond')
      };
      loginMethod.call(mock);
      console.log('HERE:', mock.__respond.getCall(0).args[3].message);
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
        name: 'anti-name',
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

    it('calls __respond with no username', function() {
      const body = { parameters: { password: 'password', username: 'username' } };
      const restModule = new RestModule();
      const loginMethod = restModule.login;
      const mock = {
        name: 'anti-name',
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
  });

  describe('describe', function() {
    it('calls...', function() {
      const $happn = {
        _mesh: { description: { name: 'name' } }
      };
      const req = {};
      const res = { writeHead: sinon.fake(), end: sinon.fake() };
      const $origin = { username: 'username' };
      const restModule = new RestModule();
      restModule.__exchangeDescription = { callMenu: {}, extraField: true };
      const eachSeriesSpy = sinon.spy(async, 'eachSeries');

      restModule.describe($happn, req, res, $origin);

      sinon.assert.calledOnce(eachSeriesSpy);
      //       sinon.assert.calledOnce(__authorizeAccessPointSpy);
    });
  });
});
