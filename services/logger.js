var winston = require('winston');

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.json(),
  defaultMeta: { service: 'chat-socket' },
  transports: [
    new winston.transports.File({ filename: '/var/log/chat-socket/app/error.log', level: 'error' }),
    new winston.transports.File({ filename: '/var/log/chat-socket/app/debug.log', level: 'debug' }),
    new winston.transports.Console({format: winston.format.simple()})
  ]
});

module.exports = logger;