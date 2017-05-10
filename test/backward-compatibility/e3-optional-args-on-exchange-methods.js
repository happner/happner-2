/**
 * Created by nomilous on 2016/07/28.
 */

var path = require('path');
var filename = path.basename(__filename);

var Happner2 = require('../..');

var Happner = require('happner');

var meshClient = new Happner.MeshClient({});

var expect = require('expect.js');

describe(filename, function() {

  var mesh;

  before('start mesh', function(done) {

    Happner2.create({
      modules: {
        'testComponent': {
          instance: {
            unconfiguredMethod: function(optional, callback) {
              if (typeof optional === 'function') {
                callback = optional;
                optional = {
                  some: 'default option'
                }
              }
              callback(null, optional);
            },
            configuredmethod: function(optional, callback) {
              if (typeof optional === 'function') {
                callback = optional;
                optional = {
                  some: 'default option'
                }
              }
              callback(null, optional);
            }
          }
        }
      },
      components: {
        'testComponent': {
          schema: {
            methods: {
              // 'unconfiguredMethod': {},
              'configuredmethod': {
                type: 'async',
                parameters: [
                  {name: 'optional', required: false}, // <-------------- optional argument
                  {name: 'callback', required: true, type: 'callback'}
                ],
                callback: {
                  parameters: [
                    {name: 'error', type: 'error'},
                    {name: 'echoOptional'}
                  ]
                }
              }
            }
          }
        }
      }
    })
      .then(function(_mesh) {

        mesh = _mesh;
        meshClient.login()
          .then(done)
          .catch(done);
      })
      .catch(done);
  });

  after('stop mesh', function(done) {

    if (!mesh) return done();
    mesh.stop({reconnect: false}, done);
  });


  context('using callback', function() {

    //
    // failing test! remove "x"
    //

    xit('supports call to configuredMethod WITHOUT optional argument', function(done) {
      // this times out...
      this.timeout(300);
      mesh.exchange.testComponent.configuredmethod(function(error, echoOptional) {
        try {

          expect(echoOptional).to.eql({some: 'default option'});

          done();
        } catch (e) {
          done(e);
        }
      });
    });

    it('supports call to configuredMethod WITH optional argument', function(done) {
      this.timeout(300);
      meshClient.exchange.testComponent.configuredmethod({some: 'option'}, function(error, echoOptional) {
        try {

          expect(echoOptional).to.eql({some: 'option'});
          done();
        } catch (e) {
          done(e);
        }
      });
    });

    it('supports call to unconfiguredMethod WITHOUT optional argument', function(done) {
      this.timeout(300);
      meshClient.exchange.testComponent.unconfiguredMethod(function(error, echoOptional) {
        try {
          expect(echoOptional).to.eql({some: 'default option'});
          done();
        } catch (e) {
          done(e);
        }
      });
    });

    it('supports call to unconfiguredMethod WITH optional argument', function(done) {
      this.timeout(300);
      meshClient.exchange.testComponent.unconfiguredMethod({some: 'option'}, function(error, echoOptional) {
        try {
          expect(echoOptional).to.eql({some: 'option'});
          done();
        } catch (e) {
          done(e);
        }
      });
    });

  });

  context('using promise', function() {

    //
    // failing test! remove "x"
    //

    xit('supports call to configuredMethod WITHOUT optional argument', function(done) {
      this.timeout(300);
      mesh.exchange.testComponent.configuredmethod()
        .then(function(echoOptional) {
          expect(echoOptional).to.eql({some: 'default option'});
        })
        .then(done)
        .catch(done);
    });

    it('supports call to configuredMethod WITH optional argument', function(done) {
      this.timeout(300);
      meshClient.exchange.testComponent.configuredmethod({some: 'option'})
        .then(function(echoOptional) {
          expect(echoOptional).to.eql({some: 'option'});
        })
        .then(done)
        .catch(done);
    });

    it('supports call to unconfiguredMethod WITHOUT optional argument', function(done) {
      this.timeout(300);
      meshClient.exchange.testComponent.unconfiguredMethod()
        .then(function(echoOptional) {
          expect(echoOptional).to.eql({some: 'default option'});
        })
        .then(done)
        .catch(done);
    });

    it('supports call to unconfiguredMethod WITH optional argument', function(done) {
      this.timeout(300);
      meshClient.exchange.testComponent.unconfiguredMethod({some: 'option'})
        .then(function(echoOptional) {
          expect(echoOptional).to.eql({some: 'option'});
        })
        .then(done)
        .catch(done);
    });

  });

});
