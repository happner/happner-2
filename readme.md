[![npm](https://img.shields.io/npm/v/happner-2.svg)](https://www.npmjs.com/package/happner-2) [![Build Status](https://travis-ci.org/happner/happner-2.svg?branch=master)](https://travis-ci.org/happner/happner-2) [![Build status](https://ci.appveyor.com/api/projects/status/e5yrnt4fca59hksc/branch/master?svg=true)](https://ci.appveyor.com/project/happner/happner-2/branch/master) [![Coverage Status](https://coveralls.io/repos/happner/happner-2/badge.svg?branch=develop&service=github)](https://coveralls.io/github/happner/happner-2?branch=master) [![David](https://img.shields.io/david/happner/happner-2.svg)](https://img.shields.io/david/happner/happner-2.svg)

<img src="https://raw.githubusercontent.com/happner/happner-website/master/images/HAPPNER%20Logo.png" width="300"></img>

Happner-2 is a cloud application framework ideal for integrating multiple micro services into a unified offering. It enables the creation of an interconnected mesh of local and remote components. The mesh components can easily call upon each other's methods or listen to each other's events in a manner uncomplicated by remoteness.

## Changes from v1

* using [happn-3](https://github.com/happner/happn-3) for data transfers
* has happn configuration instead of datalayer, the cofiguration can take any happn-3 config in, and has a few convenience settings

please check the [migration plan](https://github.com/happner/happner-2/blob/master/docs/migration-plan.md)
---------------------------------------------

## ROADMAP

* not 100% defined, but we have a [recommendations document](https://docs.google.com/document/d/1IQc-VBdun8gQTaJ6CSPD0-5BArc0AS6gIkFh-Dx59yE/edit?usp=sharing).

## installation

`npm install happner-2 --save`

## demonstration

#####these walkthroughs use *happner* to create a rudimentary monitoring service:

* [The Basics](https://github.com/happner/happner-2/blob/master/docs/walkthrough/the-basics.md)


## documentation

* [Configuation](https://github.com/happner/happner-2/blob/master/docs/configuration.md)
* [Happn](https://github.com/happner/happner-2/blob/master/docs/happn.md)
* [Modules and Components](https://github.com/happner/happner-2/blob/master/docs/modules.md)
* [Autoloading and Defaulting](https://github.com/happner/happner-2/blob/master/docs/autoload.md)
* [Security](https://github.com/happner/happner-2/blob/master/docs/security.md)

###

* [Event Api](https://github.com/happner/happner-2/blob/master/docs/event.md)
* [Exchange Api](https://github.com/happner/happner-2/blob/master/docs/exchange.md)
* [Data Api](https://github.com/happner/happner-2/blob/master/docs/data.md)
* [Web Routes](https://github.com/happner/happner-2/blob/master/docs/webroutes.md)
* [REST component](https://github.com/happner/happner-2/blob/master/docs/restcomponent.md)

###

* [Starting and Stopping Mesh Node](https://github.com/happner/happner-2/blob/master/docs/starting.md)
* [Mesh events](https://github.com/happner/happner-2/blob/master/docs/mesh-events.md)
* [Using the loader to start a mesh](https://github.com/happner/happner-2/blob/master/docs/loader.md)
* [System Components](https://github.com/happner/happner-2/blob/master/docs/system.md)
* [Using the Client](https://github.com/happner/happner-2/blob/master/docs/client.md)


* [utility scripts](https://github.com/happner/happner-2/blob/master/docs/utility-scripts.md)
