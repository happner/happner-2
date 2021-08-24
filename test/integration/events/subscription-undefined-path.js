const test = require('../../__fixtures/utils/test_helper').create();

describe(test.testName(__filename, 3), function() {
  this.timeout(120000);

  var path = require('path');
  var Mesh = require('../../..');
  var spawn = require('child_process').spawn;
  var libFolder =
    path.resolve(__dirname, '../../..') +
    path.sep +
    ['test', '__fixtures', 'test', 'integration', 'client'].join(path.sep);

  after(function(done) {
    remote.kill();
    done();
  });

  var adminClient, testClient;

  before(function(done) {
    // spawn remote mesh in another process
    remote = spawn('node', [path.join(libFolder, 'websocket-client-mesh')]);

    remote.stdout.on('data', function(data) {
      if (data.toString().match(/READY/)) {
        adminClient = new Mesh.MeshClient({ port: 3111 });

        adminClient
          .login({
            username: '_ADMIN',
            password: 'password'
          })
          .then(function() {
            var testUser = {
              username: 'test',
              password: 'password',
              custom_data: {
                something: 'useful'
              }
            };

            adminClient.exchange.security.addUser(testUser, function(e) {
              if (e) return done(e);
              testClient = new Mesh.MeshClient({ port: 3111 });
              testClient.login(
                {
                  username: 'test',
                  password: 'password'
                },
                done
              );
            });
          })
          .catch(e => {
            done(e);
          });
      }
    });
  });

  it('does an on with an undefined path', function(done) {
    adminClient.data.on(
      undefined,
      function call1() {},
      function(e) {
        test.expect(e.message).to.be('Bad path [undefined], must be a string');
        done();
      }
    );
  });

  it('does a set with an undefined path', function(done) {
    adminClient.data.set(undefined, { test: 'data' }, function(e) {
      test.expect(e.message).to.be('Bad path [undefined], must be a string');
      done();
    });
  });

  it('does an on through a subscription', function(done) {
    adminClient.event.component.on(
      undefined,
      function call1() {},
      function(err) {
        done(err);
      }
    );
  });

  it('does an on through a subscription', async () => {
    let eMessage;
    try {
      await testClient.event.component.on(undefined, function call1() {});
    } catch (e) {
      eMessage = e.message;
    }
    test.expect(eMessage).to.be('unauthorized');
  });

  after(async () => {
    await testClient.disconnect();
    await adminClient.disconnect();
  });
});
