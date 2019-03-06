const { exec } = require('child_process');


describe(require('../../__fixtures/utils/test_helper').create().testName(__filename, 3), function () {

  xit('test to see that the child process does exit if database filename and compactInterval params have been specified', function (done) {
    this.timeout(5000);

    var procPath = require('path').resolve(__dirname, '../../__fixtures/test/integration/data/db-compaction.js');

    const ls = exec('node ' + procPath);

    ls.stderr.on('data', (data) => {
      done(data);
    });

    ls.on('close', () => {
      done();
    });
  });
});