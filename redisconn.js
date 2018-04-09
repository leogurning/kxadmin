var config = require('./config');
var redis = require('redis');

var rediscli= redis.createClient(config.redis_port, config.redis_server);
rediscli.on('connect', function() {
    console.log('Connected to Redis...');
})

module.exports = rediscli;