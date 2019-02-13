describe(require('../../__fixtures/utils/test_helper').create().testName(__filename, 3), function () {

  var expect = require('expect.js');

  const HappnLayer = require('../../../lib/system/happn');
  const happnLayer = new HappnLayer({});

  it('tests the __initializeAccess function', function () {

    var config = {};

    var initialAccess = happnLayer.__initializeAccess();

    expect(initialAccess.listen != null).to.be(true);
    delete initialAccess.listen;

    //console.log(JSON.stringify(happnLayer.__initializeAccess(), null, 2));
    expect(initialAccess).to.eql({
      "serverReady": false,
      "serverError": null,
      "clientReady": false,
      "clientError": null
    });
  });
});
