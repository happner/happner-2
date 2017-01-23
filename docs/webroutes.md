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

## Notes

*web routes can be defined in the happner config, please see [the test for now](https://github.com/happner/happner/blob/master/test/9-web-middleware.js)*

*when the happner instance is run in secure mode, all web routes need to be assigned permissions before users can access them via a token, please see [the secured routes test](https://github.com/happner/happner/blob/master/test/c7-permissions-web.js)*

*note - routes can be excluded from the token check, [here is where in the config](https://github.com/happner/happner/blob/master/test/c7-permissions-web.js#L29) [and here is where a an exclusion is tested](https://github.com/happner/happner/blob/master/test/c7-permissions-web.js#L140)*

index.html default in static

array of mware funcs