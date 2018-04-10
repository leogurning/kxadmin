var config = require('./config');
var redis = require('redis');

var rediscli= redis.createClient(config.redis_port, config.redis_server);

rediscli.auth(config.redis_pass, function (err) {
    if (err) throw err;
});

rediscli.on('connect', function() {
    console.log('Connected to Redis...');
})

module.exports = rediscli;