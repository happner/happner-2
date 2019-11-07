const { exec } = require('child_process');

describe(
  require('../../__fixtures/utils/test_helper')
    .create()
    .testName(__filename, 3),
  function() {
    it('test to see that the child process does exit if database filename and compactInterval params have been specified', function(done) {
      this.timeout(10000);

      var procPath = require('path').resolve(
        __dirname,
        '../../__fixtures/test/integration/data/db-compaction.js'
      );

      const ls = exec('node ' + procPath);

      ls.stderr.on('data', data => {
        console.log('stderr:::', data);
        done(data);
      });

      ls.stdout.on('data', (/*data*/) => {
        //do nothing
      });

      ls.on('close', () => {
        done();
      });
    });
  }
);
