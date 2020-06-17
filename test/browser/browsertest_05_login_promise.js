describe('browsertest_05_login_promise', function() {
  this.timeout(10000);
  var client;
  it('does a login without catching promise', function(done) {
    client = new Happner.MeshClient({ port: 55000 });
    client.on('login/allow', function() {
      done();
    });
    client.login({
      username: 'username',
      password: 'password'
    });
    setTimeout(done, 2000);
  });
  after('it disconnects the client', function(done) {
    if (client) client.disconnect(done);
  });
});
