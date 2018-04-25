
based on happner 1.28.1

1.0.0 2016-11-20
----------------
 - still have intermittent issue, being logged on e5 test
 - missing some happn functionality (incoming and outgoing plugins)
 - ready for testing on the brain

1.1.0 2016-11-21
----------------
 - happn layer middleware tested

1.2.0 2016-11-25
----------------

 - happn upgraded to 0.6.2
 - endpoint service
 - found race condition in f1 test

1.2.1 2016-11-27
----------------

 - connection attempts upped to 10 by default

1.2.2 2016-11-27
----------------

 - happn upgraded to 0.6.3

1.2.3 2016-11-27
----------------

 - happn upgraded to 0.6.5

1.2.4 2016-11-27
----------------

  - happn upgraded to 0.6.6

1.2.5 2016-11-27
----------------

  - happn upgraded to 0.6.7


1.2.6 2016-12-02
----------------

  - happn upgraded to 0.7.0
  - fix to browser client

1.3.0 2016-12-03
----------------
 - happn upgraded to 0.8.0

1.4.0 2016-12-06
----------------
 - happn upgraded to 0.9.0

1.4.1 2016-12-12
----------------
 - happn upgraded to 0.9.1
 - upgraded migration plan
 - fixed docs

1.5.0 2016-12-13
----------------
 - happner 1 compatability
 - updated package.json

1.6.0 2016-12-13
----------------
 - upgraded to happn 1.0.0
 - fixed HappnClient living in global scope

1.6.1 2016-12-13
----------------
 - upgraded to happn 1.0.2

1.6.2 2016-12-15
----------------
 - upgraded to happn 1.0.4

1.7.0 2016-12-21
----------------
 - upgraded to happn 1.1.0, happn protocol 1.2.0
 - REST fixes, empty body parameters


1.7.1 2016-12-22
----------------
 - upgraded to happn 1.1.1, happn protocol 1.2.0
 - mesh client disconnect

1.7.2 2017-01-12
----------------
 - fixed $happn.info.happn.address property

1.7.3 2012-01-13
----------------
 - removed benchmarket

2.0.0 2017-01-18
----------------
 - updated web routes, removed static and refactored
 - add root web routes for serving /

2.1.0 2017-01-20
----------------
 - security patch
 - happn-3 version 1.2.1

2.2.0 2017-01-25
----------------
 - added config.domain

2.2.1 2017-01-26
----------------
 - updated to have the directResponses config option
 - removed superfuous functions that crept in on release 2.1.2

2.2.2 2017-01-30
----------------
  - added description.component.version

2.3.0 2017-02-06
----------------
  - added meta.componentVersion to $happn.emit()

2.4.0 2017-02-15
----------------
  - updated happn-3 version

2.5.0 2017-03-03
----------------
  - added externally assignable datalayer for happnercluster
  - added plugin-able functions to externally adjust _mesh just before clients start using it
  - exposed modules package.json at elements.name.module.package
  - added $happn.exchage.componentName.__version
  - added cluster awareness for componentInstance reply to set at message.callbackPeer
  - expanded plugins to have start and stop methods
  - serve happner-client
  - cached packager's /api/client script in production mode
  - integrate new happn browserClient packeger

2.5.1 2017-03-09
----------------
  - upgraded happn-3 to v 1.7.2

2.5.2 2017-03-10
----------------
  - upgraded happn-3 to v 1.7.4

2.5.4 2017-03-13
----------------
  - fix insecure endpoints not resuming after reconnect

2.5.5 2017-03-15
----------------
  - bump happner-client version

2.6.0 2017-03-19
----------------

  - added localEvent api
  - duplicated exchange into each component so that cluster can overwrite dependency into one component's exchange without overwriting all

2.6.1 2017-03-20
----------------
  - removed convenience $happn.localEmit() - it may be used for other purposes

2.6.2 2017-03-21
----------------
  - onward release of happner-client

2.6.3 2017-03-21
----------------
  - updated happn-3

2.6.4 2017-03-21
----------------
  - onward release of happner-client

2.7.0 2017-03-22
----------------
  - happn v1.8.0 update
  - updated happn layer to use preconfigured buckets
  - the new _optimised bucket

2.7.1 2017-03-23
----------------
  - happn v 1.8.1
  - additional buckets happn.js

2.7.2 2017-03-24
----------------
  - happn v 1.8.2

2.7.3 2017-03-24
----------------
  - happner-client v 1.2.0

2.7.4 2017-03-27
----------------
  - happn v 1.8.3

2.7.5 2017-03-28
----------------
  - happn v 1.8.5
  - fixed $happn.exchange missing endpoints

2.7.6 2017-03-29
----------------
  - fix __getWebOrigin

2.7.8 2017-03-29
-----------------
  - happn v 1.8.7

2.8.0 2017-03-31
-----------------
  - happn v 1.9.0 (account lockout)

2.9.0 2017-04-03
-----------------
  - happn v 1.10.1 (client revoke session, service manager fix)

2.10.0 2017-04-05
-----------------
  - added $happn.emitLocal() to no emit events into cluster

2.10.1 2017-04-07
-----------------
  - update happner-client

2.11.0 2017-04-11
-----------------
  - fixed db compaction
  - fixed long-running tests
  - upgraded happn to 1.11.0

2.11.1 2017-04-18
-----------------
  - onward release of happn-3

2.11.2 2017-04-18
-----------------
  - onward release of happner-client

2.11.3 2017-04-19
-----------------
  - issue-43 - Fix rest for mesh with domain

2.12.0 2017-04-20
-----------------
  - login with tokens

2.12.1 2017-04-21
-----------------
  - bumped happn-3 to 1.12.1

2.13.0 2017-04-26
-----------------
  - reincorporated happner-1 updates
  - fixed persit and mem datastores

3.0.0 2017-05-20
----------------
  - defer happn listen to final step in mesh start, after components are started, this means that `mesh.start()` MUST BE CALLED after `mesh.initialize()`, `Happner.create()` still does both.
  - added config.listenFirst to disable this behaviour.

3.0.1 2017-05-30
----------------
  - update happn-3 to version 1.12.2

3.1.0 2017-06-08
----------------
  - update happn-3 to version 1.13.0
  - update happner to version 2.1.0 and up
    - password-hash-update
  - updated travis for node 8

3.1.1 2017-06-15
----------------
  - updated happn 1.13.1 (protocol 1.1.0 fix)

3.1.2 2017-06-15
----------------
  - updated happn 1.13.2 (protocol general fix)

4.0.0 2017-07-27
----------------
  - updated happn to 2.0.1

4.0.1 2017-07-29
----------------
  - issue with release 4.0.0

5.0.0 2017-07-31
----------------
  - happn-3 upgraded to v 3.0.0

5.1.0 2017-08-19
----------------
  - allowed for the pulling of the $origin from an authorization header
  - fixed non-dry code for getting the session from the req object, now happens only in one place

5.1.1 2017-08-19
----------------
  - fix to the _registerSchema function, have try/catch and deepcopy of the filtered config

5.2.0 2017-08-29
----------------
  - improved repl

6.0.0 2017-10-27
----------------
  - large test refactor
  - happn-3 v5 dependancy updated
  - breaking: off and offPath changes, due to happn-3 v5 release

6.0.1 2017-01-27
----------------
  - update happner-client

6.0.2 2017-01-27
----------------
  - update happn-3

6.1.0 2017-02-06
----------------
  - integrated happn stats into existing happner stats
  - deprecated system.activateStatistics & deactivateStatistics (always on)

6.1.1 2017-02-26
----------------
  - happn: fixed 401 issue with auth invalid credentials failure

7.0.0 2017-04-12
----------------
  - happn: upgraded to 6.0.0, security changes
  - fix #303 - make shared datalayer respect the noPublish set option

7.1.0 2017-04-13
----------------
  - happn: upgraded to 6.1.0
  - happn: merge only subscriptions
  - REST component correct 401 error
  - init and start methods
  
7.1.1 2017-04-18
----------------
  - happn: upgraded to 6.2.0
  - admin password now saves ok
  - happner-client: upgraded to 4.0.0
  
7.1.2 2017-04-20
----------------
  - happn: upgraded to 6.2.1
  
7.1.3 2017-04-24
----------------
 - happn: upgraded to 6.2.2
 
7.1.4 2017-04-25
----------------
 - generated package-lock
  
