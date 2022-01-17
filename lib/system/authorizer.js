const utilities = require('./utilities');

module.exports = class Authorizer {
  constructor(securityService, sessionService) {
    this.securityService = securityService;
    this.sessionService = sessionService;
  }
  static create(securityService, sessionService) {
    return new Authorizer(securityService, sessionService);
  }
  getPathsAndActions(permissions) {
    const results = [];
    if (permissions.methods) {
      for (let methodPath of permissions.methods) {
        results.push({
          path: '/_exchange/requests/' + utilities.removeLeading('/', methodPath),
          action: 'set'
        });
      }
    }
    if (permissions.data) {
      for (let path in permissions.data) {
        for (let action of permissions.data[path].actions) {
          results.push({
            path,
            action
          });
        }
      }
    }
    if (permissions.events) {
      for (let eventPath of permissions.events) {
        results.push({
          path: '/_events/' + utilities.removeLeading('/', eventPath),
          action: 'on'
        });
      }
    }
    return results;
  }
  async getAdminSession() {
    if (!this.adminSession) {
      this.adminClient = await this.sessionService.localAdminClient();
      this.adminSession = this.sessionService.getSession(this.adminClient.session.id);
    }
    return this.adminSession;
  }
  async checkAuthorizations(username, permissions) {
    if (typeof username !== 'string') {
      throw new Error(`failed authorization check, username null or not a string`);
    }
    if (permissions == null || typeof permissions !== 'object') {
      throw new Error(`failed authorization check, permissions query is null or not an object`);
    }
    const pathsAndActions = this.getPathsAndActions(permissions);
    if (pathsAndActions.length === 0) {
      throw new Error(
        `unable to find paths and actions for authorization check, username: ${username}`
      );
    }
    const adminSession = await this.getAdminSession();
    const results = [];
    for (let pathAction of pathsAndActions) {
      const result = await this.checkAuthorization(
        adminSession,
        username,
        pathAction.path,
        pathAction.action
      );
      results.push(result);
    }
    return results.reduce(
      (reducedResults, result) => {
        if (result.authorized === false) {
          reducedResults.authorized = false;
          reducedResults.forbidden.push(result);
        }
        return reducedResults;
      },
      { forbidden: [], authorized: true }
    );
  }
  checkAuthorization(adminSession, username, path, action) {
    return new Promise((resolve, reject) => {
      this.securityService.authorizeOnBehalfOf(adminSession, path, action, username, function(
        e,
        authorized,
        reason
      ) {
        if (e) return reject(e);
        resolve({ authorized, reason, path, action });
      });
    });
  }
};
