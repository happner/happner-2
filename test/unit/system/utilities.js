const test = require('../../__fixtures/utils/test_helper').create();
describe(test.testName(__filename), function() {
  const utilities = require('../../../lib/system/utilities');

  it('can findInModules', async () => {
    const found = await new Promise((resolve, reject) => {
      utilities.findInModules(
        'mocha.js',
        [test.path.resolve(__dirname, '../../../node_modules'), '../../../node_modules'],
        (e, found) => {
          if (e) return reject(e);
          resolve(found);
        }
      );
    });
    test.expect(found.length).to.be.greaterThan(0);
  });
});
