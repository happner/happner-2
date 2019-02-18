const { exec } = require('child_process');


describe(require('../__fixtures/utils/test_helper').create().testName(__filename, 3), function () {

  it('test to see that the child process does exit if database filename and compactInterval params have been specified', function (done) {
    this.timeout(5000);
    const ls = exec('node ../__fixtures/test/integration/mesh/10-stuck-mesh-process.js');

    ls.stderr.on('data', (data) => {
      done(data);
    });

    ls.on('close', () => {
      done();
    });
  });
});
