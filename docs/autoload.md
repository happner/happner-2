[&#9664;](modules.md) modules and components | event api [&#9654;](event.md)

## Autoloading and Defaulting

* [happner.js file format](#happnerjs-file-format)
* [Startup Autoloader](#startup-autoloader)
* [Autoloading Alternative Configs](#autoloading-alternative-configs)
* [Config Loader Semantics](#config-loader-semantics)
* [Component Specified Configs](#component-specified-configs)
* [Component Specified Config Passthrough Function](#component-specified-config-passthrough-function)


Modules can be packaged with a configuration file (`happner.js`) that is used by the loading MeshNode to default or autoload elements into the mesh.

The `happner.js` file should be placed into the module's configured main entry point directory.

eg. (typical node_module with happner.js file)

```
lib/*
node_modules/*
index.js
package.json
happner.js
```

NB: If package.json specifies the module's main entrypoint as `lib/something.js` then the `happner.js` file will need to go into `lib/` instead.

### happner.js file format

[&#9650;](#)

The `happner.js` can define an assortment of configs. Each config should define an element, or suite of elements, or function that returns the promise of an element or suite of elements to be loaded into the mesh.

An element is defined as the combination of a __named module__ and a __named component__.

Note: The module part of the element config can be omitted if `require()` can resolve the component name and the module requires no special construction parameters.

#### A config defining a single mesh element

```javascript
module.exports = {
  configs: {

    'configName1': {
      module: {
        name: 'module-name',
        config: {
          // module's config
        }
      },
      component: {
        name: 'module-name',
        config: {
          // component's config
        }
      }
    }

  }
}
```

#### A config defining a suite of mesh elements

```javascript
module.exports = {
  configs: {

    // array of elements (suite)

    'configName2': [
      {
        module: {/* with name: and config: (as above) */},
        component: {/* as above */},
      }, 
      {
        module: {},
        component: {},
      }
    ]
  }
}
```


#### A config defining a config factory function.

The function should return the promise of an element config or suite of element configs.

```javascript
var Promise = require('bluebird');

module.exports = {
  configs: {

    'configName3': function(config) {
      return new Promise(function(resolve, reject) {

        // dynamically determine elements to run in the mesh
        // eg. by os.hostname()...

        resolve(/* element or suite of elements */);

      });
    }

  }
}
```

### Startup Autoloader

[&#9650;](#)

The elements specified in the special config called __'autoload'__ in the `happner.js` file will be automatically loaded into the mesh.

eg. (autoload in happner.js)
```javascript
module.exports = {
  configs: {
    'autoload': [/* elements */]
    // 'autoload': element
  }
}
```

This enables building a near-zero-config mesh simply by installing the component node_modules.

The entire `module.paths` array is recursed for modules that contain a `happner.js` file. This includes nested node_modules. 

#### Caveats

If more than one module by the same name is found during recursion, no attempt is made to resolve the situation other than to apply only from the shallowest path.

And if completely different modules have a `happner.js` with an autoload whose suite defines elements with exactly the same name then when the only peculiar mixture of elephant footprints on the moon has no sky either.


#### Disabling the Autoloader

If this behaviour is undesirable the autoloader can be disabled by defining the environment variable SKIP_AUTO_LOAD, or by setting `autoload: false,` in the meshConfig

eg. 
```javascript
var meshConfig = {
  name: 'meshname',
  autoload: false,
  endpoints: {},
    // ...etc
}
```

### Autoloading Alternative Configs

[&#9650;](#)

The mesh config can specify an alternative config name to autoload.

eg.
```javascript
meshConfig = {
  name: 'meshname',
  autoload: 'my-config-name'
  endpoints: {},
}
```

This will recurse all node_modules in the path for `happner.js` files and autoload from only the configs called 'my-config-name'.

eg. (happner.js)
```javascript
module.exports = {
  configs: {
    'my-config-name': [/* suite */]
  }
}
```

### Config Loader Semantics

[&#9650;](#)

Configs from the `happner.js` being applied to the mesh config supplement modules and components already defined in the mesh config. Config keys from the suite are added to the relevant module or component config only if not already present. Keys already present remain unmodified. No deep merge is performed.

### Component Specified Configs

[&#9650;](#)

Mesh components can directly specify a `$config` name (suite) to load.

eg.
```javascript
meshConfig = {
  name: 'house',
  autoload: false,
  component: {
    'irrigation-controller': {
      $config: 'spray-mate-v2.0',
      schema: {
        // schema will not be loaded from 'spray-mate-v2.0'
        // because it's already defined here
      },
      // events: {},
      // data: {},
      // web: {},
    }
  }
}
```

The above mesh resolves where the 'irrigation-controller' module is defined and then loads the config suite called 'spray-mate-v2.0' from the `happner.js` file contained there.


### Component Specified Config Passthrough Function

[&#9650;](#)

This allows for using a specified config suite with more elaborate or focussed amendments. A `$configure` function can be defined in the component, it will be called with a specific config suite from the module's `happner.js` file injected according to the first argument's name.

eg.
```javascript
meshConfig = {
  components: {
    'some-thing-complicated': {
      kept: 'this remains',
      $configure: function(suiteName) {
        // suiteName contains a deep copy of the content of the config called 'suite-name'
        // from require.resolve('some-thing-complicated')/happner.js[.configs['suite-name']]

        // lock down schema
        suiteName.component.config.schema.exclusive = true;
        delete suiteName.component.config.schema.methods.undesiredMethod;

        // swing one of the data-routes to persist
        suiteName.component.config.data.routes['favourites/*'] = 'presist';
 
        // return is important (also supports promise)
        return suiteName;
      }
    }
  }
}
```

