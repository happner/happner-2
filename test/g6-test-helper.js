describe(require('path').basename(__filename), function () {

  this.timeout(30000);

  var expect = require('expect.js');

  var TestHelper = require('./helpers/test_helper');

  var helper = new TestHelper();

  before('should initialize the helper with services', function (done) {

    helper.startUp([
      // NB: to append the test component and test the service with the component events and methods
      // you can set __testOptions.skipComponentTests to false
      {happn:{port:55001, name:'test_service1', secure:true}, __testOptions:{skipComponentTests:false}},

      {happn:{port:55002, name:'test_service2', secure:true}},

      {happn:{port:55003, name:'test_service3'}}

    ], done);
  });

  after('tears down all services and clients', function (done) {

    helper.tearDown(done);
  });

  it('gets a client', function (done) {

    helper.getClient({name:'test_service1'}, function(e, client){

      if (e) return done(e);

      expect(client.instance.data.session.id).to.not.be(null);

      done();
    });
  });

  it('tests a secure service', function (done) {

    helper.testService('test_service2', done);
  });

  it('tests an insecure service', function (done) {

    helper.testService('test_service3', done);

  });

  it('tests a service with the test component', function (done) {

    helper.testService('test_service1', done);

  });

  it('creates a test file', function (done) {

    var testFile = helper.newTestFile();

    expect(testFile).to.not.be(null);

    done();

  });

  it('restarts a service', function (done) {

    helper.restartService({id:'test_service3'}, done);

  });
});
