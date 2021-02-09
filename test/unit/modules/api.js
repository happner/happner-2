const ApiModule = require('../../../lib/modules/api/index');
const sinon = require('sinon');
describe('ApiModule', function() {
  describe('test', function() {
    it('calls done with args', function() {
      const done = sinon.fake();
      const apiModule = new ApiModule();
      apiModule.test('message', done);

      sinon.assert.calledWith(done, null, 'message tested ok');
    });
  });

  describe('client', function() {
    it('calls $happen.log.$$TRACE with args and res.end', function() {
      const $happen = {
        tools: {
          packages: {
            api: { md5: 'testMatch' }
          }
        },
        log: { $$TRACE: sinon.fake() }
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
        end: sinon.fake(),
        writeHead: sinon.fake()
      };
      const apiModule = new ApiModule();
      apiModule.client($happen, req, res);

      sinon.assert.calledWith($happen.log.$$TRACE, 'client already has latest version testUrl');
      sinon.assert.called(res.end);
    });
  });
});
