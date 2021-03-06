const happner = require('../../..');

class HappnerTestHelper {
  constructor(serverConfig) {
    this.serverConfig = serverConfig;
  }

  static create(serverConfig) {
    return new HappnerTestHelper(serverConfig);
  }

  createService() {
    return new Promise((resolve, reject) => {
      happner.create(this.serverConfig, (e, happnInst) => {
        if (e) return reject(e);
        resolve(happnInst);
      });
    });
  }

  createClient() {
    return new Promise((resolve, reject) => {
      var adminClient = new happner.MeshClient({});
      adminClient.login({username:'_ADMIN', password:'happn'}).then((e) => {
        if (e) return reject(e);
        resolve(adminClient);
      });
    });
  }

  async initialize() {
    this.service = await this.createService();
    this.listenerclient = await this.createClient();
    this.publisherclient = await this.createClient();
  }

  async tearDown() {
    await this.listenerclient.disconnect();
    await this.publisherclient.disconnect();
    return new Promise((resolve, reject) => {
      this.service.stop(function(e) {
        if (e) return reject(e);
        resolve();
      });
    });
  }
}

module.exports = HappnerTestHelper;
