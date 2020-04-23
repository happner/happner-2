describe('browsertest_02_security', function() {
  this.timeout(10000);

  it('rejects login promise on bad credentials', function(done) {
    var client = new Happner.MeshClient({ port: 55000 });
    client
      .login({
        username: 'username',
        password: 'bad password'
      })
      .then(function() {
        client.disconnect();
        done(new Error('should not allow'));
      })
      .catch(function(error) {
        error.toString().should.equal('AccessDenied: Invalid credentials');
        done();
      })
      .catch(done);
  });

  it('emits login/deny on bad credentials', function(done) {
    var client = new Happner.MeshClient({ port: 55000 });
    client.on('login/deny', function(error) {
      try {
        error.toString().should.equal('AccessDenied: Invalid credentials');
        done();
      } catch (e) {
        done(e);
      }
    });
    client
      .login({
        username: 'username',
        password: 'bad password'
      })
      .then(function() {
        client.disconnect();
        done(new Error('should not allow'));
      });
  });

  it('emits login/allow on good credentials', function(done) {
    var client = new Happner.MeshClient({ port: 55000 });
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

  it('can login with the token', async function() {
    var client = new Happner.MeshClient({ port: 55000 });

    await client.login({
      username: 'username',
      password: 'password'
    });

    await client.disconnect();

    await client.login({ useCookie: true });
    await client.disconnect();
  });

  it('disconnect can remove the cookie', async function() {
    var client = new Happner.MeshClient({ port: 55000 });

    await client.login({
      username: 'username',
      password: 'password'
    });

    await client.disconnect();

    await client.login({ useCookie: true });
    await client.disconnect({ deleteCookie: true });

    try {
      await client.login({ useCookie: true });
      throw new Error('should not login');
    } catch (e) {
      expect(e.message).to.eql('happn server is secure, please specify a username or token');
    }
  });

  context('events', function() {
    // publish allowed/denied
    // subscribe allowed/denied
  });

  context('data', function() {
    // ?
  });

  context('exchange', function() {
    var client;

    before('start client', function(done) {
      client = new Happner.MeshClient({ port: 55000 });
      client
        .login({
          username: 'username',
          password: 'password'
        })
        .then(function() {
          done();
        })
        .catch(done);
    });

    after('stop client', function(done) {
      client.disconnect(done);
    });

    it('allows access to allowed methods', function(done) {
      client.exchange.test
        .allowedMethod({ key: 'value' })
        .then(function(result) {
          // result.should.eql({}); // ???
          ({
            key: 'value',
            meshName: 'Server',
            originUser: 'username'
          }.should.eql(result));
          done();
        })
        .catch(done);
    });

    it('denies access to denied methods cb', function(done) {
      client.exchange.test.deniedMethod({ key: 'value' }, function(e) {
        if (!e) done(new Error('should not allow'));
        done();
      });
    });

    it('denies access to denied methods', function(done) {
      client.exchange.test
        .deniedMethod({ key: 'value' })
        .then(function() {
          done(new Error('should not allow'));
        })
        .catch(function(error) {
          error.toString().should.equal('AccessDenied: unauthorized');
          done();
        });
    });
  });
});
