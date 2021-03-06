var path = require('path');

describe(
  require('../../__fixtures/utils/test_helper')
    .create()
    .testName(__filename, 3),
  function() {
    this.timeout(120000);

    var expect = require('expect.js');
    var libFolder =
      path.resolve(__dirname, '../../..') +
      path.sep +
      ['test', '__fixtures', 'utils'].join(path.sep);
    var TestHelper = require(libFolder + '/test_helper');
    var test_helper = new TestHelper();
    var test_id = Date.now() + '_' + require('shortid').generate();
    var meshInstance;

    before(function(done) {
      test_helper.startHappnerInstance(
        'shared-data-metadata',
        {
          name: 'shared-data-metadata',
          happn: {
            secure: true,
            adminPassword: test_id,
            port: 8004
          },
          components: {
            data: {}
          }
        },
        function(e, mesh) {
          if (e) return done(e);

          meshInstance = mesh;
          done();
        }
      );
    });

    it('tests the meta of a new set', function(done) {
      meshInstance.exchange.data.set('/some/new/test/data', { test: 'new' }, function(e, response) {
        if (e) return done(e);

        expect(response._meta.created).to.not.be(undefined);
        expect(response._meta.modified).to.not.be(undefined);
        expect(response._meta.path).to.not.be(undefined);

        done();
      });
    });

    it('tests the meta of an update set', function(done) {
      meshInstance.exchange.data.set('/some/updated/test/data', { test: 'new' }, function(
        e,
        response
      ) {
        if (e) return done(e);

        expect(response._meta.created).to.not.be(undefined);
        expect(response._meta.modified).to.not.be(undefined);
        expect(response._meta.path).to.not.be(undefined);

        meshInstance.exchange.data.set('/some/updated/test/data', { test: 'updated' }, function(
          e,
          update_response
        ) {
          if (e) return done(e);

          expect(update_response._meta.created).to.not.be(undefined);
          expect(update_response._meta.modified).to.not.be(undefined);
          expect(update_response._meta.path).to.not.be(undefined);

          done();
        });
      });
    });

    it('tests the meta of a get', function(done) {
      meshInstance.exchange.data.set('/some/test/data/to/get', { test: 'get' }, function(
        e,
        response
      ) {
        if (e) return done(e);

        expect(response._meta.created).to.not.be(undefined);
        expect(response._meta.modified).to.not.be(undefined);
        expect(response._meta.path).to.not.be(undefined);

        meshInstance.exchange.data.get('/some/test/data/to/get', function(e, response) {
          if (e) return done(e);

          expect(response._meta.created).to.not.be(undefined);
          expect(response._meta.modified).to.not.be(undefined);
          expect(response._meta.path).to.not.be(undefined);

          done();
        });
      });
    });

    it('tests the meta of an on', function(done) {
      var onScore = 0;
      var doneAlready = false;

      meshInstance.exchange.data.on(
        '/some/test/data/to/listen/on',
        function(data, meta) {
          try {
            if (!data.removed) {
              expect(meta.created).to.not.be(undefined);
              expect(meta.modified).to.not.be(undefined);
            }
            onScore++;
            if (onScore === 3) done();
          } catch (e) {
            if (!doneAlready) {
              doneAlready = true;
              done(e);
            }
          }
        },
        function(e) {
          if (e) return done(e);

          meshInstance.exchange.data.set('/some/test/data/to/listen/on', { test: 'on' }, function(
            e
          ) {
            if (e) return done(e);
            meshInstance.exchange.data.set(
              '/some/test/data/to/listen/on',
              { test: 'on-update' },
              function(e) {
                if (e) return done(e);
                meshInstance.exchange.data.remove('/some/test/data/to/listen/on', function(e) {
                  if (e) return done(e);
                });
              }
            );
          });
        }
      );
    });

    after('it shuts down happner', function(done) {
      test_helper.stopHappnerInstances('shared-data-metadata', done);
    });
  }
);
