var winston = require('winston');

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.json(),
  defaultMeta: { service: 'chat-socket' },
  transports: [
    new winston.transports.File({ filename: '/var/log/chat-socket/app/error.log', level: 'error' }),
    new winston.transports.File({ filename: '/var/log/chat-socket/app/debug.log', level: 'debug' })
  ]
});
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;