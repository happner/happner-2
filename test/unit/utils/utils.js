describe(
  require('../../__fixtures/utils/test_helper')
    .create()
    .testName(__filename, 3),
  function() {
    var expect = require('expect.js');

    it('tests getting function parameters', function(done) {
      var utils = require('../../../lib/system/utilities');
      var testFunc = function(
        // eslint-disable-next-line no-unused-vars
        param1 /**param1 comment**/,
        // eslint-disable-next-line no-unused-vars
        param2 /*param2 comment*/,
        // eslint-disable-next-line no-unused-vars
        option1,
        // eslint-disable-next-line no-unused-vars
        option2
      ) {};
      var params = utils.getFunctionParameters(testFunc);
      expect(params.length).to.be(4);
      expect(params[1]).to.be('param2');
      done();
    });

    it('tests stringifying errors', function(done) {
      var utils = require('../../../lib/system/utilities');

      var error = new Error('test error');

      var stringifiedError = utils.stringifyError(error);

      var parsedError = JSON.parse(stringifiedError);

      expect(parsedError.stack).to.not.be(null);
      expect(parsedError.message).to.be('test error');

      done();
    });

    it('tests removing characters from a string', function(done) {
      var str = 'tthis is a test stringh';

      var utils = require('../../../lib/system/utilities');

      var removedLeading = utils.removeLeading('t', str);
      var removedLast = utils.removeLast('h', removedLeading);

      var removedLeadingNull = utils.removeLeading('t', null);
      var removedLastNull = utils.removeLast('t', null);

      var removedLeadingUndefined = utils.removeLeading('t', undefined);
      var removedLastUndefined = utils.removeLast('t', undefined);

      expect(removedLeading).to.be('this is a test stringh');
      expect(removedLast).to.be('this is a test string');
      expect(str).to.be('tthis is a test stringh');

      expect(removedLeadingNull).to.be(null);
      expect(removedLastNull).to.be(null);

      expect(removedLeadingUndefined).to.be(undefined);
      expect(removedLastUndefined).to.be(undefined);

      done();
    });

    it('tests the getNestedVal function', function(done) {
      var nestedObj = {
        test1: {
          test2: {
            test3: 'hooray!'
          }
        }
      };

      var utils = require('../../../lib/system/utilities');

      expect(utils.getNestedVal(nestedObj, 'test1.test2.test3')).to.be('hooray!');

      expect(utils.getNestedVal(nestedObj, 'test1.test2.testblah')).to.be(undefined);

      expect(utils.getNestedVal(nestedObj, 'test1.test2')).to.eql({ test3: 'hooray!' });

      done();
    });
  }
);
