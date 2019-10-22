/**
 * Created by C Calitz on 8/25/2015.
 */
describe(
  require('../../__fixtures/utils/test_helper')
    .create()
    .testName(__filename, 3),
  function() {
    this.timeout(10000);
    var mesh;
    var Mesh = require('../../..');
    var should = require('chai').should();
    var path = require('path');

    var config = {
      happn: {
        port: 8080
      },
      modules: {},
      components: {
        data: {}
      }
    };

    before(function(done) {
      mesh = new Mesh();
      mesh.initialize(config, function(initErr) {
        mesh.start(function(startErr) {
          done(initErr || startErr);
        });
      });
    });

    after(function(done) {
      mesh.stop();
      done();
    });

    it('01 - should subscribe to an event then unsubscribe by path', function(done) {
      var event_count = 0;
      var path = 'test1/path';

      mesh.event.data.on(path, event_handler, function(err) {
        should.not.exist(err);

        mesh.exchange.data.set(path, 10);
      });

      function event_handler(message, _meta) {
        event_count++;

        mesh.event.data.offPath(path, function(err) {
          should.not.exist(err);
          mesh.exchange.data.set(path, 20, function() {
            setTimeout(checkCount, 500);
          });
        });
      }

      function checkCount() {
        event_count.should.be.eql(1);
        done();
      }
    });

    it('02 - should subscribe to an event then unsubscribe by handle', function(done) {
      var event_count = 0;
      var path = 'test2/path';
      var handle = null;
      mesh.event.data.on(path, event_handler, function(err, _handle) {
        should.not.exist(err);
        handle = _handle;

        mesh.exchange.data.set(path, 10);
      });

      function event_handler(message, _meta) {
        event_count++;

        mesh.event.data.off(handle, function(err) {
          should.not.exist(err);
          mesh.exchange.data.set(path, event_count, function() {
            setTimeout(checkCount, 500);
          });
        });
      }

      function checkCount() {
        event_count.should.be.eql(1);
        done();
      }
    });

    it('02 - should subscribe to an event then unsubscribe by path', function(done) {
      var event_count = 0;
      var path = 'test2/path';
      var handle = null;

      mesh.event.data.on(path, event_handler, function(err, _handle) {
        should.not.exist(err);
        handle = _handle;
        mesh.exchange.data.set(path, 10);
      });

      function event_handler(message, _meta) {
        event_count++;

        mesh.event.data.offPath(path, function(err) {
          should.not.exist(err);
          mesh.exchange.data.set(path, event_count, function() {
            setTimeout(checkCount, 500);
          });
        });
      }

      function checkCount() {
        event_count.should.be.eql(1);
        done();
      }
    });
  }
);
