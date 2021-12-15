describe(
  require('../../__fixtures/utils/test_helper')
    .create()
    .testName(__filename, 3),
  function() {
    var expect = require('expect.js');
    const promisify = require('../../../lib/system/shared/promisify');

    it('can promisify a basic function', async () => {
      let f = (x, callback) => callback(null, x);
      let fpromise = promisify(f);
      expect(await fpromise(4)).to.eql(4);
    });

    it('can promisify a basic function - error case ', async () => {
      let f = (x, callback) => callback(new Error('test error'));
      let fpromise = promisify(f);
      let errored;
      try {
        await fpromise('whatever');
      } catch (e) {
        errored = true;
        expect(e.toString()).to.eql('Error: test error');
      }
      expect(errored).to.be(true);
    });

    it('can promisify a function that returns more than 1 argument ', async () => {
      let f = (x, y, callback) => callback(null, x, y);
      let fpromise = promisify(f);
      expect(await fpromise(1, 2)).to.eql([1,2]);
    });
  }
);
