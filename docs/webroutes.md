[◀](data.md) data api | starting a mesh node [▶](starting.md)

## Web Routes

Web routes allow the serving of web content.

#### Per component web routes

##### Single route

Single route exposing module method by name.

```javascript
config = {
  components: {
    'componentName': {
      web: {
        routes: {
          // this would be listening on: /componentName/routeName
          'routeName': 'methodName1'
        }
      }
    }
  }
}
```

```javascript
// the above config requires the component 'componentName' to define 'methodName1' as below

module.exports = ComponentName;

function ComponentName(){}

ComponentName.prototype.methodName1 = function(req, res, next){
  res.end();
}

// note that $happn and $origin can also be injected into webmethods
// ComponentName.prototype.methodName1 = function($happn, req, res, next) {
```

**Multiple route (array)**

A web route composed of multiple module methods (middleware) by name.

```javascript
config = {
  components: {
    'componentName':{
      web: {
        routes: {
          'routeName': ['methodName1', 'methodName2']
        }
      }
    }
  }
}
```

A web route composed of mixed method names and middleware functions.

```javascript
config = {
  components:{
    'componentName':{
      web:{
        routes:{
          'routeName':[function(req, res, next){next();}, 'methodName2']
        }
      }
    }
  }
}
```

### Global web routes

Web routes can also be configured at "the top level". This allows for listening at `/`.

```javascript
config = {
  web: {
    routes: {
      // To expose specific component route at '/'
      '/': 'componentName/routeName'
    }
  },
  components: {...}
}
```

```javascript
var serveStatic = require('serve-static');
config = {
  web: {
    routes: {
      // To serve static at '/'
      '/': serveStatic(process.env.SERVE_STATIC_PATH)
    }
  },
  components: {...}
}
```
### Secured web routes

When the happner instance is run in secure mode, all web routes are secure against access, and users need to be assigned permissions before they can access them.

Access is handled by the user logging in and getting a token, which must be appended to subsequent requests via the happn_token cookie or querystring argument, please see [the secured routes test](https://github.com/happner/happner-2/blob/master/test/integration/security/permissions-web.js).

The token can also be used as a Bearer authorization header, see [the secured rest component test](https://github.com/happner/happner-2/blob/master/test/integration/rest/rest-component-secure.js#L620) to see how this can be done.

```javascript

//logging in and getting a token, which can be used in 3 ways (querystring arg, cookie or Bearer token)

//assuming we have a standard happner instance up, we can instantiate and login with the client:

var Mesh = require('happner');

var testClient = new Mesh.MeshClient({secure: true});

var credentials = {
  username: '_ADMIN',
  password: 'happner'
};

testClient.login(credentials).then(function () {

  var request = require('request');

  var options = {
    url: 'http://127.0.0.1/componentName/methodName' + testClient.token
  };


  request(options, function (error, response, body) {
    //method call was either successful or not
  });

});

```

### Global Middleware

*it is possible to configure global middleware that is run before any web routes are called, global middleware can be linked to a chain-able array of methods in a happner component or can be passed in as raw connect middleware functions*

```javascript
// set up a server with global middleware:

const middlewareTestFunc = (req, res, next) => {
  //do something like change a header?
  next();
};

const happnerConfig = {
  web: {
    // the below 4 middleware are all valid configuration options
    // they will be chained in the order as it appears in the web.middleware
    // configuration property
    middleware: [
      // pass in a middleware function
      middlewareTestFunc,
      // inline middleware function
      (req, res, next) => {
        // do something like change a header?
        next();
      },
      // middleware being extended by a component on the exchange, note how
      // it is possible to chain methods in an array
      {
        component: 'middlewareTest',
        methods: ['doSomething', 'doSomethingElse']
      }
    ]
  },
  modules: {
    middlewareTest: {
      instance:{
        doSomething:(req, res, next) => {
          //do something like change a header?
          next();
        },
        doSomethingElse:(req, res, next) => {
          //do something like change a header?
          next();
        }
      }
    }
  },
  components:{
    middlewareTest: {}
  }
};
```

### Notes

*web routes can be defined in the happner config, please see [the test for now](https://github.com/happner/happner-2/blob/master/test/integration/web/web-middleware.js)*

*note - routes can be excluded from the token check, [here is where in the config](https://github.com/happner/happner-2/blob/master/test/integration/web/permissions-web.js#L29) [and here is where a an exclusion is tested](https://github.com/happner/happner-2/blob/master/test/integration/web/permissions-web.js#L140)*
