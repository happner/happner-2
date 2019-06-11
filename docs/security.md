
HAPPNER SECURITY
----------------


users groups and permissions
----------------------------
*happner meshes can run in secure mode, a scheme comprising of users, groups and permissions allows for this, we have yet to complete the documentation for this, but to get a comprehensive picture of how this works, please look at [the test for now](https://github.com/happner/happner-2/blob/master/test/integration/security/advanced-security.js)*


payload encryption
------------------
*happners messaging payload can be encrypted, the mesh must be running in secure mode, to see how this works client to mesh, please look at [the test](https://github.com/happner/happner-2/blob/master/test/integration/security/payload-encryption-client-to-mesh.js) - there is also a test demonstrating how this works [mesh to mesh](https://github.com/happner/happner-2/blob/master/test/integration/security/payload-encryption-mesh-to-mesh.js)*


security directory events
--------------------------
*the happner security module emits the following events pertaining to changes on the security directory:*
- upsert-group - when a group is upserted
- upsert-user - when a user is upserted
- link-group - when a user is linked to a group
- unlink-group - when a user is unlinked from a group
- delete-group - when a group is deleted
- delete-user when a user is deleted

```javascript
//you need to switch this on by first calling attachToSecurityChanges method

adminClient.exchange.security.attachToSecurityChanges(function(e){
	 adminClient.event.security.on('upsert-user', function(data){
        ...
      });

```
please look at [the test](https://github.com/happner/happner-2/blob/master/test/integration/security/permission-changes-events.js)


security session events
-----------------------
*the security module emits an event for every time a client connects or disconnects from the system*

```javascript
	//you need to switch this on by first calling attachToSessionChanges method
	adminClient.exchange.security.attachToSessionChanges(function(e){
		adminClient.event.security.on('connect', function(data){
	      ...
	    });

	    adminClient.event.security.on('disconnect', function(data){
	      ...
	    });
```
please look at [the test](https://github.com/happner/happner-2/blob/master/test/integration/security/session-changes-events.js)

## security service functions

#### exchange.security.addGroupPermissions(groupName, permissions)

Adds new permissions to existing permissions for groupName.

```javascript
var addPermissions = {
  methods: {
    '/meshname/component/method': {authorized: true}
  },
  events: {
    '/meshname/component/event': {}
  },
  web: {
    '/component/webmethod': {authorized: true, actions: ['get']}
  }
};

$happn.exchange.security.addGroupPermissions('groupName', addPermissions)
  .then(function (updatedPermissions) {})
  .catch();
```

* `authorized: true` will be assumed if unspecified.
* If the webmethod actions already had `['post', 'put']` then get will be added.

#### exchange.security.removeGroupPermissions(groupName, permissions)

Removes permissions from an existing group.

```javascript
var removePermissions = {
  methods: {
    '/meshname/component/method': {} // empty means delete entire permission
  },
  web: {
    '/component/webmethod': {actions: ['post']} // delete only specified action
  }
}
```

* Pass an empty object for the permission to be deleted.
* Only the specified webmethod actions are removed. The permission is left otherwise unchanged.

upserting groups:
-----------------
*a security group can be upserted, if the group does not exist, it is created, if it does its properties and permissions are merged with the passed group argument by default. The permissions of the group can be overwritten by setting the overwrite option to true*

```javascript

var testUpsertGroup = {
         name: 'TEST_UPSERT_EXISTING',

         custom_data: 'TEST UPSERT EXISTING',

         permissions: {
           methods: {
             //in a /Mesh name/component name/method name - with possible wildcards
             '/meshname/component/method1': {authorized: true}
           },
           events: {
             //in a /Mesh name/component name/event key - with possible wildcards
             '/meshname/component/event1': {authorized: true}
           }
         }
       };

   adminClient.exchange.security.upsertGroup(testUpsertGroup, function(e, upserted){
     //group was upserted, permissions were merged with existing group if it existed
   });

   var testUpsertGroupOverwrite = {
         name: 'TEST_UPSERT_EXISTING',

         custom_data: 'TEST UPSERT EXISTING',

         permissions: {
           methods: {
             //in a /Mesh name/component name/method name - with possible wildcards
             '/meshname/component/method1': {authorized: true}
           },
           events: {
             //in a /Mesh name/component name/event key - with possible wildcards
             '/meshname/component/event1': {authorized: true}
           }
         }
       };

   adminClient.exchange.security.upsertGroup(testUpsertGroupOverwrite, {overwritePermissions:true}, function(e, upserted){
     //group was upserted, permissions were overwritten with existing group if it existed
   });

```

upserting users:
-----------------
*a user can be upserted, if the user does not exist, it is created, if it does its properties and group subscriptions are merged with the passed user argument by default. The subscriptions of the user can be overwritten by setting the overwriteSubscriptions option to true*

```javascript

 var testUpsertUser = {
    username: 'TEST_UPSERT_EXISTING_6',
    password: 'TEST PWD',
    custom_data: {
      something: 'useful'
    },
		application_data: {
			something: 'untouchable by the user'
		}
    groups:{}
  };

 testUpsertUser.groups['TEST_UPSERT_EXISTING_6_1'] = true;

 adminClient.exchange.security.upsertUser(testUpsertUser, function(e, result){
  //user was added and subscribed to group TEST_UPSERT_EXISTING_6_1
 });

 var testUpsertUserOverwrite = {
    username: 'TEST_UPSERT_EXISTING_6',
    password: 'TEST PWD',
    custom_data: {
      something: 'useful'
    },
    groups:{}
  };

 testUpsertUserOverwrite.groups['TEST_UPSERT_EXISTING_6_1'] = true;

 adminClient.exchange.security.upsertUser(testUpsertUserOverwrite, {overwriteMemberships:true}, function(e, result){
  //user was added and subscribed to group TEST_UPSERT_EXISTING_6_1 and unsibscribed from all other groups
 });

```

updateOwnUser
-------------

*all users are afforded the right to update their own passwords and custom_data, the application_data property is not editable by the user, and can only be updated by the administrator*

```javascript

//Assuming testUserClient is logged in as myUsername, with password myOldPassword

var myUser = {
	username:'myUsername',
	password:'myNewPassword',
	oldPassword:'myOldPassword',//don't forget the old password
	custom_data:{
		field:'profane'
	},
	application_data:{//NB: this will be ignored - and can only be changed by an administrator
		field:'sacred'
	}
}

testUserClient.exchange.security.updateOwnUser(myUser, function (e, result) {
	//you have now updated your own user
});

```

listing users
-------------

*users can be listed by username (partial match possible) or group name (exact match only)*

```javascript

	//assuming we have a happner-2 client that is logged in with admin rights:
	//list all users with a username starting with "test"
	adminClient.exchange.security.listUsers('test*').then(function(users){
		//returns:
		// [
		// 	{username:'test1', custom_data:{test:1}},
		// 	{username:'test2', custom_data:{test:2}}
		// ]
		//list all users that belong to the 'test' group (with name 'test')
		// NOTE: optional criteria
		return adminClient.exchange.security.listUsersByGroup('test', {criteria:{'custom_data.extra':8}});
	})
	.then(function(users){
		//returns:
		// [
		// 	{username:'test1', custom_data:{extra:8}},
		// 	{username:'test3', custom_data:{extra:8}}
		// ]

		//much faster - just list usernames for users belonging to the 'test' group (with name 'test')
		return adminClient.exchange.security.listUserNamesByGroup('test');
	})
	.then(function(usernames){
		//returns:
		// [
		// 'test1',
		// 'test3',
		// 'test4'
		// ]
	})

```

authority delegation:
--------------------

By default inter mesh calls are done via the endpoint's user, and component to component calls are done using the _ADMIN user, this means security is enforced only between the external mesh/client and the edge node of the mesh. To ensure that the originator of a call is checked against the security directory regardless of how deep the exchange call stack execution goes, the authorityDelegationOn config option should be set to true on a secure mesh:

```javascript
var meshConfig = {secure:true, authorityDelegationOn:true}

var myMesh = new Mesh.create(meshConfig, function(e, created){
  ...
});

//this can be configured per component as well, here is an example that excludes a specific component
var meshConfig = {
	secure:true,
	authorityDelegationOn:true,
	modules:{
		"test-module":{
			instance:{
				testMethod:function($happn, callback){

				}
			}
		},
		"test-module-1":{
			instance:{
				testMethod:function($happn, callback){

				}
			}
		}
	},
	components:{
		"test-module":{
			authorityDelegationOn:false//this component will call all consecutive methods using _ADMIN or the configured endpoint user
		},
		"test-module-1":{
			//this component will call all consecutive methods using the origin user
		}
	}
}

var myMesh = new Mesh.create(meshConfig, function(e, created){
  ...
});

//here is an example that includes a specific component
var meshConfig = {
	secure:true,
	//authorityDelegationOn:true, - by default for all components authority delegation is off
	modules:{
		"test-module":{
			instance:{
				testMethod:function($happn, callback){

				}
			}
		},
		"test-module-1":{
			instance:{
				testMethod:function($happn, callback){

				}
			}
		}
	},
	components:{
		"test-module":{
			authorityDelegationOn:true//this component will call all consecutive methods using _ADMIN or the configured endpoint user
		},
		"test-module-1":{
			//this component will call all consecutive methods using the origin user
		}
	}
}

var myMesh = new Mesh.create(meshConfig, function(e, created){
  ...
});
```

hardening responses:
--------------------

Currently happn clients are prevented from accessing the /_exchange/responses/[mesh name]/[component name]/[method name]/\* path using a regular expression check - injected into the underlying happn service by way of a [custom layer](https://github.com/happner/happner-2/blob/master/test/integration/mesh/happn-layer-middleware.js), [over here](https://github.com/happner/happner-2/blob/master/lib/system/happn.js#L222), a better solution to this, is to use the [targetClients functionality](https://github.com/happner/happn-3/blob/master/test/integration/api/targetclients.js) of happn-3, to push _response messages only to the origin of the _request. This is made possible by passing the directResponses:true option in the mesh config, as follows:

```javascript

//this can be done by adding targetResponses:true to the mesh configuration
//the custom layer is now not initialized so there is a small performance gain
//and this is a less wasteful security measure
var meshConfig = {secure:true, directResponses:true}

var myMesh = new Mesh.create(meshConfig, function(e, created){
  ...
})

```
####NB: this is not backwards compatible with any happner clients older than 1.29.0
