var mongoose = require('mongoose');
var config = require('../config');
var async = require('async');

mongoose.connect(config.client.mongo);
var Player = mongoose.model('Player', new mongoose.Schema({ vk_id: Number, first_name: String }));

async.times(1000, function(i, next) {
  Player.create({vk_id: i, first_name: String.fromCharCode(65 + Math.floor(Math.random() * 10))}, next);
}, function(err, docs) {
  console.log(err, docs);
  process.exit();
});
