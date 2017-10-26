describe(require('path').basename(__filename), function () {

  var expect = require('expect.js');
  var Happner = require('../../..');
  var server;

  var Module1 = {
    causeEmit: function ($happn, callback) {
      $happn.emit('test/event1', {some: 'thing'});
      callback();
    },
    causeEmitLocal: function ($happn, callback) {
      $happn.emitLocal('test/event2', {some: 'thing'});
      callback();
    }
  };

  before(function (done) {
    Happner.create({
      name: 'MESH_NAME',
      modules: {
        'component1': {
          instance: Module1
        }
      },
      components: {
        'component1': {}
      }
    })
      .then(function (_server) {
        server = _server;
        done();
      })
      .catch(done);
  });

  beforeEach(function () {
    this.originalSet = server._mesh.data.set;
  });

  afterEach(function () {
    server._mesh.data.set = this.originalSet;
  });

  after(function (done) {
    if (!server) return done();
    server.stop({reconnect: false}, done);
  });

  it('components can emit events', function (done) {

    server.event.component1.on('test/event1', function (data, meta) {
      expect(data).to.eql({some: 'thing'});
      done();
    });

    server.exchange.component1.causeEmit().catch(done);

  });

  it('components can emit events with noCluster', function (done) {

    server._mesh.data.set = function (path, data, options) {
      expect(options.noCluster).to.be(true);
      done();
    };

    server.exchange.component1.causeEmitLocal().catch(done);

  });

});

