var redis = require('redis').createClient(process.env.REDIS_PORT, process.env.REDIS_HOST);

module.exports = redis;

