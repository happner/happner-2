describe('functional/test/test_helper', function () {

  var expect = require('expect.js');

  it('tests getting the test filename', function(done){

    var helper = require('../../__fixtures/utils/test_helper').create();

    var testName = helper.testName(__filename, 3);

    expect(testName).to.be('functional/test/test_helper');
    done();
  });
});
