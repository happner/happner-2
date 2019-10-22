describe('browsertest_03_events', function() {
  this.timeout(10000);

  var client;

  before('creates a test client', function(done) {
    client = new Happner.MeshClient({ port: 55000 });
    client.on('login/allow', function() {
      done();
    });

    client
      .login({
        username: 'username',
        password: 'password'
      })
      .catch(done);
  });

  after('it disconnects the client', function(done) {
    if (client) client.disconnect(done);
  });

  it('does a variable depth subscribe, default depth', function(done) {
    var emitted = [];

    client.event.testComponent2.on(
      'variable-depth/event/**',
      function(data, meta) {
        emitted.push(meta.path);
      },
      function(e) {
        if (e) return done(e);
        client.exchange.testComponent2.emitEvent(
          'variable-depth/event/1',
          { key: 'value' },
          function(e) {
            if (e) return done(e);
          }
        );
        client.exchange.testComponent2.emitEvent(
          'variable-depth/event/1/2',
          { key: 'value' },
          function(e) {
            if (e) return done(e);
          }
        );
        client.exchange.testComponent2.emitEvent(
          'variable-depth/event/1/2/3',
          { key: 'value' },
          function(e) {
            if (e) return done(e);
          }
        );
        client.exchange.testComponent2.emitEvent(
          'variable-depth/event/1/2/3/4',
          { key: 'value' },
          function(e) {
            if (e) return done(e);
          }
        );
        client.exchange.testComponent2.emitEvent(
          'variable-depth/event/1/2/3/4/5/6',
          { key: 'value' },
          function(e) {
            if (e) return done(e);
          }
        );

        setTimeout(function() {
          var sorted = emitted.sort();

          expect(sorted.length).to.equal(4);
          expect(sorted[0]).to.equal('/_events/Server/testComponent2/variable-depth/event/1');
          expect(sorted[1]).to.equal('/_events/Server/testComponent2/variable-depth/event/1/2');
          expect(sorted[2]).to.equal('/_events/Server/testComponent2/variable-depth/event/1/2/3');
          expect(sorted[3]).to.equal('/_events/Server/testComponent2/variable-depth/event/1/2/3/4');

          done();
        }, 2000);
      }
    );
  });
});
