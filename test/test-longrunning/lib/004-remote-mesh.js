var Mesh = require('../../../lib/mesh');

var __respond = function (res, message, code) {

  var responseString = '{"message":"' + message + '", "data":{{DATA}}, "error":{{ERROR}}}';

  //doing the replacements to the response string, allows us to stringify errors without issues.

  if (!code) code = 200;

  responseString = responseString.replace("{{ERROR}}", "null");

  responseString = responseString.replace("{{DATA}}", "null");

  var header = {
    'Content-Type': 'application/json'
    /*'Content-Length':responseString.length*/
  };

  res.writeHead(code, header);

  console.log('writing:::', responseString);

  res.write(responseString);

  res.end();
};


var config = {
  name: 'remoteMesh',
  happn: {
    port: 55010
  },
  modules: {},
  components: {},
  web: {
    routes: {
      '/test': function(req, res) {
        console.log('responding:::');
          return __respond(res, 'ok', 200);
      }
    }
  }
};

var http = require('http');
http.globalAgent.maxSockets = 5000;

(new Mesh()).initialize(config, function (err) {

  if (err) {
    console.log(err);
    process.exit(err.code || 1);
    return;
  }

  console.log('READY');
});
