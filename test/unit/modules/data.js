const DataModule = require('../../../lib/modules/data/index');
const sinon = require('sinon');
describe('DataModule', function() {
  describe('count', function() {
    it('calls $happen.asAdmin.data.count after setting opts to {}', function() {
      const $happen = {
        asAdmin: { data: { count: sinon.fake() } }
      };
      const path = 'path';
      const opts = sinon.fake();
      const callback = sinon.fake();
      const dataModule = new DataModule();
      dataModule.count($happen, path, opts, callback);

      sinon.assert.calledWith($happen.asAdmin.data.count, 'path', {});
    });
  });
});
