var util = require('util');
var app = require('express')();
var logger = require('../logger')(__filename);
var config = require('../config');

var limit_per_second = config.vk_api.max_requests_per_second;
var requests = {};

/* Limit requests from a machine */
var limitMiddleware = function (req, res, next) {
  var ip = req.ip;

  setTimeout(function() {
    requests[ip] = 0;
  }, 1000);
  
  if(!requests[ip])
    requests[ip] = 0;

  requests[ip]++;

  if(requests[req.ip] > limit_per_second){
    var msg = util.format('Too many requests from %s', ip);
    logger.info(msg);
    res.send({code: 1, description: msg});
  }
  else
    next();
};


app.post('/sendNotification', limitMiddleware, function (req, res) {

  var fatal = (new Date()).getSeconds() % 10 == 0;

  if(fatal)
    res.send({ code: 2, description: 'Fatal error!' });
  else
    res.send({ code: 0 });

});

var server = app.listen(config.vk_api.port, function(){
  logger.info('Listening on %d port', server.address().port);
});
