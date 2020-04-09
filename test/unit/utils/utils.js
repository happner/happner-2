const tests = require('../../__fixtures/utils/test_helper').create();
describe(tests.testName(__filename, 3), function() {
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
    tests.expect(params.length).to.be(4);
    tests.expect(params[1]).to.be('param2');
    done();
  });

  it('tests getting function parameters for an async function', function(done) {
    var utils = require('../../../lib/system/utilities');
    var testFunc = async function(
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
    tests.expect(params.length).to.be(4);
    tests.expect(params[1]).to.be('param2');
    done();
  });

  it('tests getting function parameters for a class method', function(done) {
    const utils = require('../../../lib/system/utilities');
    class TestClass {
      testFunc(
        // eslint-disable-next-line no-unused-vars
        param1 /**param1 comment**/,
        // eslint-disable-next-line no-unused-vars
        param2 /*param2 comment*/,
        // eslint-disable-next-line no-unused-vars
        option1,
        // eslint-disable-next-line no-unused-vars
        option2
      ) {}

      async testFuncAsync(
        // eslint-disable-next-line no-unused-vars
        param1 /**param1 comment**/,
        // eslint-disable-next-line no-unused-vars
        param2 /*param2 comment*/,
        // eslint-disable-next-line no-unused-vars
        option1,
        // eslint-disable-next-line no-unused-vars
        option2
      ) {}
    }
    const testObj = new TestClass();
    [testObj.testFunc, testObj.testFuncAsync].forEach(fn => {
      const params = utils.getFunctionParameters(fn);
      tests.expect(params).to.eql(['param1', 'param2', 'option1', 'option2']);
    });
    done();
  });

  it('tests stringifying errors', function(done) {
    var utils = require('../../../lib/system/utilities');

    var error = new Error('test error');

    var stringifiedError = utils.stringifyError(error);

    var parsedError = JSON.parse(stringifiedError);

    tests.expect(parsedError.stack).to.not.be(null);
    tests.expect(parsedError.message).to.be('test error');

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

    tests.expect(removedLeading).to.be('this is a test stringh');
    tests.expect(removedLast).to.be('this is a test string');
    tests.expect(str).to.be('tthis is a test stringh');

    tests.expect(removedLeadingNull).to.be(null);
    tests.expect(removedLastNull).to.be(null);

    tests.expect(removedLeadingUndefined).to.be(undefined);
    tests.expect(removedLastUndefined).to.be(undefined);

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

    tests.expect(utils.getNestedVal(nestedObj, 'test1.test2.test3')).to.be('hooray!');
    tests.expect(utils.getNestedVal(nestedObj, 'test1.test2.testblah')).to.be(undefined);
    tests.expect(utils.getNestedVal(nestedObj, 'test1.test2')).to.eql({ test3: 'hooray!' });

    done();
  });

  it('tests the getPackageJson function', function() {
    var utils = require('../../../lib/system/utilities');

    tests.expect(utils.getPackageJson('/non-existent').version).to.be('1.0.0');
    tests.expect(utils.getPackageJson('/non-existent', '2.0.0').version).to.be('2.0.0');
  });

  it('tests the getAllMethodNames function', function() {
    testGetAllMethodNames(getTestClass());
    testGetAllMethodNames(getTestFuncInstance());
  });

  function testGetAllMethodNames(obj) {
    var utils = require('../../../lib/system/utilities');
    tests
      .expect(utils.getAllMethodNames(obj))
      .to.eql([
        '__defineGetter__',
        '__defineSetter__',
        '__lookupGetter__',
        '__lookupSetter__',
        '__testMethod3',
        'constructor',
        'hasOwnProperty',
        'isPrototypeOf',
        'propertyIsEnumerable',
        'testMethod',
        'testMethod1',
        'testMethod2',
        'testMethod4',
        'testMethod__5',
        'toLocaleString',
        'toString',
        'valueOf'
      ]);

    tests
      .expect(utils.getAllMethodNames(obj, true))
      .to.eql([
        '__testMethod3',
        'testMethod',
        'testMethod1',
        'testMethod2',
        'testMethod4',
        'testMethod__5'
      ]);

    tests
      .expect(utils.getAllMethodNames(obj, true, true))
      .to.eql(['__testMethod3', 'testMethod', 'testMethod1', 'testMethod2', 'testMethod__5']);

    tests
      .expect(utils.getAllMethodNames(obj, true, true, /^[__]/))
      .to.eql(['testMethod', 'testMethod1', 'testMethod2', 'testMethod__5']);
  }

  function getTestClass() {
    const Clazz = class {
      constructor() {
        this.testMethod4 = this.testMethod4.bind(this);
        this.property1 = {};
      }

      testMethod() {}
      testMethod1() {}
      testMethod2() {}
      __testMethod3() {}
      testMethod4() {}
      testMethod__5() {}
    };
    return new Clazz();
  }

  function getTestFuncInstance() {
    const FuncClass = function() {
      this.testMethod4 = this.testMethod4.bind(this);
      this.property1 = {};
    };
    FuncClass.prototype.testMethod = function() {};
    FuncClass.prototype.testMethod1 = function() {};
    FuncClass.prototype.testMethod2 = function() {};
    FuncClass.prototype.__testMethod3 = function() {};
    FuncClass.prototype.testMethod4 = function() {};
    FuncClass.prototype.testMethod__5 = function() {};
    return new FuncClass();
  }
});
