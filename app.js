var pushNotifications = require('./routes/pushNotifications.js');
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var app = express();
var server = require('http').createServer(app);
var port = process.env.PORT || 80;
var io = require('socket.io')(server, { path: '/socket/socket.io' });
var dotenv = require('dotenv').config();
var jwt = require('jsonwebtoken');
var commands = require('./services/commands.js')(io);
var fs = require('fs');
const cert = fs.readFileSync('./key/public.pem');
var redisClient = require('./redis');
var mysql = require('./services/mysql.js')
const util = require('util')
var logger = require('./services/logger.js')
var redis = require('socket.io-redis')
io.adapter(redis( {
  port: process.env.REDIS_PORT,
  host: process.env.REDIS_HOST,
  password: process.env.REDIS_PASSWORD
}))

redisClient.on('connect', () => {
  logger.info('Redis client connected')
})

server.listen(port, () => {
  logger.info('Server listening at port %d', port);
});

app.use(express.static(path.join(__dirname, 'public')));

io.use((socket, next) => {
  if (socket.handshake.query && socket.handshake.query.token) {
    try {
      let token = socket.handshake.query.token.split(' ')[1];
      let decoded = jwt.verify(token, cert, {algorithms: 'RS256'});
      socket.username = decoded.username;
      socket.isAuthenticated = true;
      redisClient.set(socket.id, JSON.stringify({token: token}), () => {});
    } catch (e) {
      socket.isAuthenticated = false;
      return next();
    }
    next();
  } else {
    socket.isAuthenticated = false;
    next();
  }
});

io.on('connection', (socket) => {

  if (socket.isAuthenticated) {
    socket.join(socket.username);
  } else {
    socket.emit('notAuthenticated');
  }

  socket.on('join', (data) => {
    if (typeof socket.username !== 'undefined') {
      mysql.addUserToTide(socket.username, data.tide)
    }
    socket.join(data.tide);
    socket.tide = data.tide;
    if (socket.isAuthenticated) {
      redisClient.get(socket.id, (error, result) => {
        if (error) {
          logger.error(error);
          throw error;
        }
        result = JSON.parse(result);
        result.user = data.user;
        redisClient.set(socket.id, JSON.stringify(result), () => {});
      });
    }
    io.to(socket.tide).emit('join', {user: data.user});
    redisClient.hget(data.tide, 'queue', (err, queue) => {
      if (err) { throw err }
      queue = (queue !== null) ? JSON.parse(queue) : []
      io.to(data.tide).emit('queue', queue)
    })
    emitParticipants();
  });

  socket.on('leave', () => {
    socket.leave(socket.tide)
    mysql.removeUserFromTide(socket.username, socket.tide)
  })

  socket.on('message', (msg) => {
    if (socket.isAuthenticated) {
      // Handle cmds such as !play
      if (msg.charAt(0) === '!') {
        io.to(socket.id).emit('message', {
          username: socket.username,
          message: msg,
          type: 'italic'
        })
        let split = msg.split('!');
        commands.handle(split[1], socket.id, socket.username, socket.tide).then((response) => {
          if (typeof response !== 'undefined') {
            io.to(socket.id).emit('message', {
              message: response,
              type: 'italic'
            })
          }
        });
      } else {
        io.to(socket.tide).emit('message', {
          username: socket.username,
          message: msg,
          type: 'standard'
        })
      }
    } else {
      io.to(socket.id).emit('message', {
        message: 'You must be logged in to contribute',
        type: 'italic'
      })
    }
  });

  socket.on('skip', (index) => {
    if (socket.isAuthenticated) {
      commands.skip(socket, index).then((res) => {
        if (res !== undefined) {
          io.to(socket.id).emit('message', {
            message: res,
            type: 'italic'
          })
        }
      }).catch((err) => {
        logger.error(err)
      })
    } else {
      io.to(socket.id).emit('message', {
        message: 'You must be logged in to contribute',
        type: 'italic'
      })
    }
  })

  socket.on('disconnect', (reason) => {
    logger.debug(`${socket.username} disconnected`)
    redisClient.del(socket.id);
    if (typeof socket.tide !== 'undefined' && typeof socket.username !== 'undefined') {
      mysql.removeUserFromAllTides(socket.username, socket.tide)
      emitParticipants();
      io.to(socket.tide).emit('leave', socket.username);
    }
  })

  let emitParticipants = function () {
    io.in(socket.tide).clients((error, clients) => {
      if (error) throw error;

      let fn = function getUserData(id) {
        return new Promise((resolve, reject) => {
          if (id === socket.id) {
            resolve();
          }
          redisClient.get(id, (error, result) => {
            if (error) {
              logger.error(error)
              throw error;
            }
            result = JSON.parse(result);
            if (result !== null) {
              result = result.user;
            }
            resolve(result);
          })
        })
      }

      let results = clients.map(fn);
      let userData = Promise.all(results);

      userData.then((data) => {
        io.to(socket.tide).emit('participants', data);
      })
    });
  }
});


var allowCrossDomain = function(req, res, next) {
  res.header('Access-Control-Allow-Origin', process.env.RIPTIDES_HOST);
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Headers', 'Authorization');
  res.header('Access-Control-Allow-Credentials', true);

  next();
}

app.use(allowCrossDomain);
app.use(express.json());

app.use('/socket/push', function (req, res, next) {
  let decoded;
  try {
    let token = req.headers.authorization.split(" ")[1];
    decoded = jwt.verify(token, cert, {algorithms: 'RS256'})
  } catch(e) {
    next(createError(409));
  }
  io.to(decoded.username).emit('notification', req.body.notification)
  res.status(200).json({success: true})
});

app.use('/', function (req, res, next) {
  res.status(200).json({success: true})
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
});

module.exports = app;
