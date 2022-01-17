var async = require('async');

module.exports.add = async function(server, username, password, permissions) {
  var user = {
    username: username,
    password: password
  };

  var group = {
    name: username + '_group',
    permissions: permissions || {}
  };

  const addedGroup = await server.exchange.security.addGroup(group);
  const addedUser = await server.exchange.security.addUser(user);
  await server.exchange.security.linkGroup(addedGroup, addedUser);
};

module.exports.generatePermissions = function(user) {
  var component, event, method, path;
  var allowedEvents = user.allowedEvents;
  var allowedMethods = user.allowedMethods;

  var permissions = {
    methods: {},
    events: {}
  };
  for (component in allowedMethods) {
    for (method in allowedMethods[component]) {
      path = '/DOMAIN_NAME/' + component + '/' + method;
      permissions.methods[path] = { authorized: true };
    }
  }
  for (component in allowedEvents) {
    for (event in allowedEvents[component]) {
      path = '/DOMAIN_NAME/' + component + '/' + event;
      permissions.events[path] = { authorized: true };
    }
  }
  return permissions;
};

// can only process one permission change at a time
var queue = async.queue(function(task, callback) {
  var server = task.server;
  var group = task.group;
  var permissions = task.permissions;
  var method = task.method;
  server.exchange.security[method](group, permissions, callback);
}, 1);

module.exports.allowMethod = function(server, username, component, method) {
  var group = username + '_group';
  var path = '/DOMAIN_NAME/' + component + '/' + method;
  var permissions = { methods: {} };
  permissions.methods[path] = { authorized: true };

  return new Promise(function(resolve, reject) {
    queue.push(
      {
        server: server,
        group: group,
        permissions: permissions,
        method: 'addGroupPermissions'
      },
      function(err) {
        if (err) return reject(err);
        resolve();
      }
    );
  });
};

module.exports.denyMethod = function(server, username, component, method) {
  var group = username + '_group';
  var path = '/DOMAIN_NAME/' + component + '/' + method;
  var permissions = { methods: {} };
  permissions.methods[path] = {};

  return new Promise(function(resolve, reject) {
    queue.push(
      {
        server: server,
        group: group,
        permissions: permissions,
        method: 'removeGroupPermissions'
      },
      function(err) {
        if (err) return reject(err);
        resolve();
      }
    );
  });
};

module.exports.allowWebMethod = function(server, username, path) {
  var group = username + '_group';
  var permissions = { web: {} };
  permissions.web[path] = {
    actions: ['get', 'put', 'post'],
    description: 'a test web permission'
  };
  return new Promise(function(resolve, reject) {
    queue.push(
      {
        server: server,
        group: group,
        permissions: permissions,
        method: 'addGroupPermissions'
      },
      function(err) {
        if (err) return reject(err);
        resolve();
      }
    );
  });
};

module.exports.denyWebMethod = function(server, username, path) {
  var group = username + '_group';
  var permissions = { web: {} };
  permissions.web[path] = {};

  return new Promise(function(resolve, reject) {
    queue.push(
      {
        server: server,
        group: group,
        permissions: permissions,
        method: 'removeGroupPermissions'
      },
      function(err) {
        if (err) return reject(err);
        resolve();
      }
    );
  });
};

module.exports.allowEvent = function(server, username, component, event) {
  var group = username + '_group';
  var path = '/DOMAIN_NAME/' + component + '/' + event;
  var permissions = { events: {} };
  permissions.events[path] = { authorized: true };

  return new Promise(function(resolve, reject) {
    queue.push(
      {
        server: server,
        group: group,
        permissions: permissions,
        method: 'addGroupPermissions'
      },
      function(err) {
        if (err) return reject(err);
        resolve();
      }
    );
  });
};

module.exports.denyEvent = function(server, username, component, event) {
  var group = username + '_group';
  var path = '/DOMAIN_NAME/' + component + '/' + event;
  var permissions = { events: {} };
  permissions.events[path] = {};

  return new Promise(function(resolve, reject) {
    queue.push(
      {
        server: server,
        group: group,
        permissions: permissions,
        method: 'removeGroupPermissions'
      },
      function(err) {
        if (err) return reject(err);
        resolve();
      }
    );
  });
};

module.exports.allowDataPath = function(server, username, path) {
  var group = username + '_group';
  var permissions = { data: {} };
  permissions.data[path] = { actions: ['*'] };

  return new Promise(function(resolve, reject) {
    queue.push(
      {
        server: server,
        group: group,
        permissions: permissions,
        method: 'addGroupPermissions'
      },
      function(err) {
        if (err) return reject(err);
        resolve();
      }
    );
  });
};

module.exports.denyDataPath = function(server, username, path) {
  var group = username + '_group';
  var permissions = { data: {} };
  permissions.data[path] = { authorized: false };

  return new Promise(function(resolve, reject) {
    queue.push(
      {
        server: server,
        group: group,
        permissions: permissions,
        method: 'removeGroupPermissions'
      },
      function(err) {
        if (err) return reject(err);
        resolve();
      }
    );
  });
};
