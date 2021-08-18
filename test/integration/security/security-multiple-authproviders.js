describe(
  require('../../__fixtures/utils/test_helper')
    .create()
    .testName(__filename, 3),
  function() {
    const path = require('path');
    const Happner = require('../../..');
    const fs = require('fs');
    require('chai').should();
    const expect = require('expect.js');

    let server;
    const test_id = Date.now() + '_' + require('shortid').generate();
    const dbFileName = './temp/' + test_id + '.nedb';

    this.timeout(60000);
    let testUser = {
      username: 'happnTestuser@somewhere.com',
      password: 'password'
    };

    let testUser2 = {
      username: 'secondTestuser@somewhere.com',
      password: 'secondPass'
    };

    before('start server', async function() {
      try {
        fs.unlinkSync(dbFileName);
      } catch (e) {
        // do nothing
      }
      server = await Happner.create({
        name: 'Server',
        happn: {
          secure: true,
          filename: dbFileName,
          services: {
            security: {
              config: {
                authProviders: {
                  happn3: 'happn3-provider',
                  second: path.resolve(
                    __dirname,
                    '../../__fixtures/test/integration/security/authentication/workingAuth.js'
                  )
                },
                defaultAuthProvider: 'second'
              }
            }
          }
        }
      });
    });

    before('adds happn-3 authProvider testUser', done => {
      server.exchange.security.addUser(testUser, done);
    });

    after('stop server', async function() {
      try {
        fs.unlinkSync(dbFileName);
      } catch (e) {
        // do nothing
      }
      if (server) await server.stop({ reconnect: false });
    });

    it('rejects login promise on bad credentials', function(done) {
      const client = new Happner.MeshClient();
      client
        .login({
          ...testUser,
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

    it.only('logs in correctly using happn3 auth provider', function(done) {
      const client = new Happner.MeshClient();
      client
        .login({
          ...testUser,
          authType: 'happn3'
        })
        .then(() => {
          done();
        })
        .catch(function(error) {
          done(error);
        });
    });

    it.only('logs in correctly using second auth provider', function(done) {
      const client = new Happner.MeshClient();
      client
        .login({
          ...testUser2
        })
        .then(() => {
          done();
        })
        .catch(function(error) {
          done(error);
        });
    });

    it.only('fails to log in when using happn3 auth provider for second type user', function(done) {
      const client = new Happner.MeshClient();
      client
        .login({
          ...testUser
        })
        .then(() => {
          done(new Error('SHOULD HAVE THROWN'));
        })
        .catch(function(error) {
          expect(error.toString()).to.eql('AccessDenied: Invalid credentials');
          done();
        });
    });

    it.only('fails to log in when using second auth provider for happn3 type user', function(done) {
      const client = new Happner.MeshClient();
      client
        .login({
          ...testUser2,
          authType: 'happn3'
        })
        .then(() => {
          done(new Error('SHOULD HAVE THROWN'));
        })
        .catch(function(error) {
          expect(error.toString()).to.eql('AccessDenied: Invalid credentials');
          done();
        });
    });
  }
);
