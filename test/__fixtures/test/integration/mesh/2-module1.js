/**
 * Created by Johan on 4/14/2015.
 * Updated by S.Bishop 6/1/2015.
 */

module.exports = function (options) {
  return new Component1(options);
};

function Component1(options) {

  if (!options) options = {};

  if (!options.maximumPings) options.maximumPings = 1000;

  this.moduleMethod = function () {
    //console.log('ran the module method from the component level scope');
  };

  this.exposedMethod = function (message, $happn, callback) {

    try {

      this.moduleMethod();

      ////console.log(options);
      message.pingCount++;
      message.message = "Component1";

      //_this.scope.api.events.component2.exposedMethod(function(e, response)
      if (message.pingCount < options.maximumPings)
        $happn.exchange.component2.exposedMethod(message, function (e, response) {

        });
      else {
        var timeDiff = Date.now() - message.timestamp;

        var message = 'Hooray, component ping pong test is over!! ' + message.pingCount + ' pings, elapsed time:' + timeDiff + 'ms';
        $happn.emit('maximum-pings-reached', {m: message}, function (e, response) {

        });
      }

      callback(null, message);

    } catch (e) {
      callback(e);
    }
  };

  this.start = function (arg, $happn) {

    //console.log('starting module1 component');

    if (!$happn)
      throw new Error('This module needs component level scope');

    $happn.exchange.component2.exposedMethod({
      message: "Component1",
      "timestamp": Date.now(),
      "pingCount": 0
    }, function (e, response) {
      if (e) return; //console.log('call to component2 broke...' + e);

    });
  };

  this.stop = function () {

  };
}
