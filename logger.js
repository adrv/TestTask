var path = require('path');
var util = require('util');
var winston = require('winston');

var logger = function(_filename) {
  var filename = _filename.slice(_filename.lastIndexOf(path.sep)+1, _filename.length-3);

  return new (winston.Logger)({
    transports: [
      new (winston.transports.File)({
        filename: 'app.log',
        levels: ['info', 'warn', 'error'],
        json: false,
        formatter: function(opts) {
          var message  = (opts.message instanceof Object) ? JSON.stringify(opts.message, null, null, 2) : opts.message;
          return util.format('[%s][%s][%s] %s', new Date(), filename, opts.level, message);
        }
      })
    ]
  });
}

module.exports = logger;
