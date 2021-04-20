const test = require('../../__fixtures/utils/test_helper').create();
const semver = require('happner-semver');
describe(test.testName(__filename, 3), function() {
  it('tests semver matching on happner-client versions', () => {
    test.expect(semver.coercedSatisfies('11.2.1', '>=11.3.0')).to.be(false);
    test.expect(semver.coercedSatisfies('11.3.0', '>=11.3.0')).to.be(true);
    test.expect(semver.coercedSatisfies('11.3.1-prerelease-1', '>=11.3.0')).to.be(true);
    test.expect(semver.coercedSatisfies('12.0.0', '>=11.3.0')).to.be(true);
  });
});
