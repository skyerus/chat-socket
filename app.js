var pushNotifications = require('./routes/pushNotifications.js');
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var logger = require('morgan');
var app = express();
var server = require('http').createServer(app);
var port = 3000;
var io = require('socket.io')(server);
var axios = require('axios');
var dotenv = require('dotenv').config();
var jwt = require('jsonwebtoken');
var fs = require('fs');
const cert = fs.readFileSync('./key/public.pem');

server.listen(port, () => {
  console.log('Server listening at port %d', port);
});

app.use(express.static(path.join(__dirname, 'public')));

io.use((socket, next) => {
  if (socket.handshake.query && socket.handshake.query.token) {
    try {
      let decoded = jwt.verify(socket.handshake.query.token.split(' ')[1], cert, {algorithms: 'RS256'});
      socket.username = decoded.username;
      socket.isAuthenticated = true;
    } catch (e) {
      socket.isAuthenticated = false;
      console.log('Caught error');
      return next();
    }
    next();
  } else {
    socket.isAuthenticated = false;
    next();
  }
});

io.on('connection', (socket) => {
  console.log(`${socket.username} connected`);
  if (socket.isAuthenticated) {
    socket.join(socket.username);
  } else {
    socket.emit('notAuthenticated');
  }
  socket.on('join', (msg) => {
    socket.join(msg);
    socket.tide = msg;
    console.log(`${socket.username} joined channel ${socket.tide}`);
  });
  socket.on('message', (msg) => {
    if (socket.isAuthenticated) {
      io.to(socket.tide).emit('message', {msg: msg})
    } else {
      io.to(socket.id).emit('message', {msg: 'You must be logged in to contribute'})
    }
  });
  socket.on('disconnect', (reason) => {
    console.log('disconnected');
  })
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
app.use(logger('dev'));
app.use(express.json());

app.use('/push', function (req, res, next) {
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
