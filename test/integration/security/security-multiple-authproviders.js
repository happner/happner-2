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

    before('adds happn authProvider testUser', done => {
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

    it('rejects login promise on bad credentials', async () => {
      let client = new Happner.MeshClient();
      try {
        await client.login({
          ...testUser,
          password: 'bad password'
        });
      } catch (e) {
        expect(e.toString()).to.be('AccessDenied: Invalid credentials');
      }
    });

    it('logs in correctly using happn3 auth provider', async () => {
      let client = new Happner.MeshClient();
      await client.login({
        ...testUser,
        authType: 'happn'
      });
    });

    it('logs in correctly using second auth provider', async () => {
      let client = new Happner.MeshClient();
      await client.login({
        ...testUser2 //uses default, i.e. 'second' authProvider
      });
    });

    it('fails to log in when using second auth provider for happn3 type user', async () => {
      let client = new Happner.MeshClient();
      try {
        await client.login({
          ...testUser //uses default, i.e. 'second' authProvider
        });
        throw new Error('SHOULD HAVE THROWN');
      } catch (error) {
        expect(error.toString()).to.eql('AccessDenied: Invalid credentials');
      }
    });

    it('fails to log in when using happn3 auth provider for second type user', async () => {
      let client = new Happner.MeshClient();
      try {
        await client.login({
          ...testUser2,
          authType: 'happn'
        });
        throw new Error('Should have thrown');
      } catch (error) {
        expect(error.toString()).to.eql('AccessDenied: Invalid credentials');
      }
    });
  }
);
