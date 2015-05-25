/*
  В программе используется Redis для хранения списка уже обработанных id.
  Список id дополняется после обработки каждого "банча" из 100 документов.
  При завершении обработки всех документов список обнуляется.
*/

var util = require('util');
var request = require('requestretry');
var app = require('express')();
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var _ = require('lodash');
var async = require('async');
var redisClient = require('redis').createClient();
var config = require('../config');
var logger = require('../logger')(__filename);
app.use(bodyParser.urlencoded({ extended: false }));


/* Mongo*/
mongoose.connect(config.client.mongo);
var Player = mongoose.model('Player', new mongoose.Schema({ vk_id: Number, first_name: String }));


/* Bunch processing job */
var docsCargo = async.cargo(function (docs, cb) {
  var ids = _.pluck(docs, 'vk_id'),
      idsWithScores = _.flatten(_.zip(ids, _.map(ids, function(id){ return id.toString(); })));

  var requestOptions = {
    method: 'post',
    url: util.format("%s:%d%s", config.vk_api.host, config.vk_api.port, '/sendNotification'),
    json: true,
    retryDelay: 3000,
    retryStrategy: function(err, res){
      if(res.body.code == 1) {
        logger.warn('Requests are too frequent. Delaying.')
        return true;
      }
    },
    form: {
      ids: ids,
      message: docs[0].message 
    }
  }

  logger.info('Sending ids: ' + JSON.stringify(ids));

  request(requestOptions, function(err, res, body) {
    redisClient.zadd(['processed_ids'].concat(idsWithScores), function(a,b) {
      if(err || body.code == 2) {
        err = err || body.description
        logger.error('Exiting: %s \nSaving processing ids bunch to Redis: %s', err, ids.toString());
        process.exit();
      } else {
        cb();
      }
    });
  });

}, 10);

docsCargo.drain = function(){
  redisClient.del('processed_ids', function(){
    logger.info('Finished');
  });
};


app.post('/send', function (req, res) {
  var template = req.body.template,
      name     = template.match(/%(.*)%/) && template.match(/%(.*)%/)[1],
      message  = name ? template.replace(/%.*%/, name) : template;

  logger.info('Message to send: %s', message);

  /* Запрос ранее обработанных id */
  redisClient.zrange('processed_ids', 0, -1,  function(err, ids){
    ids = ids || [];
    ids = _.map(ids, function(id) { return parseInt(id); });

    if(err){
      logger.error(err);
      process.exit();
    }

    var aggregateQuery = [
      { 
        $project: {
          first_name: '$first_name',
          vk_id: '$vk_id'
        }
      },
      {
        $match: {
          vk_id: { $nin: ids }
        }
      }
    ];

    /* Сортировка результатов выборки по %first_name% */
    if(name) {
      aggregateQuery[0]['$project']['priority'] = { $eq: [ "$first_name", name ] };
      aggregateQuery[2] = {}
      aggregateQuery[2]['$sort'] = { priority: -1 };
    }

    /* Использование stream, с целью предотвращения загрузки миллионов записей в ОЗУ за раз */
    var stream = Player.aggregate(aggregateQuery).cursor({batchSize: 10}).exec()
    stream.on('data', docsCargo.push);

    res.status(200).send("Ok");

  });

});

var server = app.listen(config.client.port, function() {
  logger.info('Listening on ' + server.address().port + ' port');
});
