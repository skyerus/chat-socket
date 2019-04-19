var axios = require('axios');
var redisClient = require('../redis.js')
var buildQuery = require('./BuildQuery.js')
var io;
const util = require('util')

axios.defaults.baseURL = process.env.RIPTIDES_API_HOST;

module.exports = (ioInstance) => {
  io = ioInstance;
  var cli = {};
  cli.handle = (name, id, tide) => {
    let args = name.split(' ');
    name = args[0];
    args.splice(0, 1);
    args = {
      query: args,
      id: id,
      tide: tide
    };
    return callFunc(name, args);
  };

  return cli;
};

function callFunc(name, args = []) {
  let fn = cli[name];

  if(typeof fn !== 'function') {
    return new Promise((resolve, reject) => {
      resolve('Invalid command, enter !help to view some available commands');
    })
  }
  return fn(args);
}

let cli = {};
let helpers = {};

cli.help = () => {
  return new Promise((resolve, reject) => {
    resolve('Available commands: ');
  });
};

cli.play = (args) => {
  return new Promise((resolve, reject) => {
    helpers.search(args.id, args.query).then((searchRes) => {
      redisClient.hget(args.tide, 'queue', (err, queue) => {
        let empty = false;
        if (queue === null) {
          queue = []
          empty = true
        } else {
          queue = JSON.parse(queue)
        }
        queue.push(searchRes)
        redisClient.hset(args.tide, 'queue', JSON.stringify(queue), () => {
          if (empty) {
            helpers.play(args.tide, queue)
          } else {
            io.to(args.tide).emit('queue', queue)
            resolve();
          }
        });
      })
    }).catch((error) => {
      resolve(error);
    })
  })
}

cli.queue = (args) => {
  return cli.play(args)
}

cli.skip = (args) => {
  return new Promise((resolve, reject) => {
    if (args.query.length > 1) {
      return resolve('!skip only accepts at most one parameter')

    } else if (args.query.length === 1) {
      let int = parseInt(args.query[0])
      if (isNaN(int)) {
        return resolve('!skip only accepts an integer as a parameter')
      }
      redisClient.hget(args.tide, 'queue', (err, queue) => {
        queue = JSON.parse(queue)
        if (queue === null || queue.length === 0) {
          return resolve('The queue is empty')
        }
        queue.splice(int, 1)
        redisClient.hset(args.tide, 'queue', JSON.stringify(queue))
        io.to(args.tide).emit('queue', queue)
        resolve()
      })
    } else {
      redisClient.hget(args.tide, 'queue', (err, queue) => {
        queue = JSON.parse(queue)
        if (queue === null || queue.length === 0) {
          return resolve('There is nothing playing')
        }
        queue.shift()
        helpers.play(args.tide, queue).then(() => {
          redisClient.hset(args.tide, 'queue', JSON.stringify(queue))
        })
      })
    }
  })
}

helpers.search = (socketId, query) => {
  return new Promise((resolve, reject) => {
    query = {
      q: query.join(' '),
      type: 'track'
    };
    query = buildQuery.build(query);
    redisClient.get(socketId, (error, result) => {
      if (error) {
        console.log(error);
        throw error;
      }
      result = JSON.parse(result);
      axios({
        method: 'get',
        url: `/api/auth/spotify/v1/search${query}`,
        headers: {"Authorization": `Bearer ${result.token}`}
      }).then((response) => {
        resolve(response.data);
      }).catch((error) => {
        reject(error.response.data.message);
      })
    })
  })
}

helpers.play = (tide, queue) => {
  return new Promise((resolve, reject) => {
    let song = queue[0]
    song.timeStamp = Date.now()

    helpers.getParticipants(tide).then((participants) => {
      helpers.getParticipantsData(participants).then((participantsData) => {
        if (participantsData.length === 0) {
          redisClient.del(tide)
          return resolve()
        }
        let songReqs = participantsData.map(helpers.sendPlayRequest.bind({ song: song }))

        Promise.all(songReqs).then((playResponses) => {
          redisClient.hset(tide, 'playing', JSON.stringify(song))
          resolve()
          // Recursively call next song in queue
          setTimeout(() => {
            redisClient.hgetall(tide, (err, res) => {
              let playing = JSON.parse(res.playing)
              // Check if playlist has been altered
              if (playing.timeStamp !== song.timeStamp) {
                return resolve()
              }
              queue = JSON.parse(res.queue)
              queue.shift()

              if (queue.length === 0) {
                io.to(tide).emit('queue', queue)
                redisClient.del(tide)
                return resolve()
              }

              redisClient.hset(tide, 'queue', JSON.stringify(queue), () => {
                helpers.play(tide, queue)
              })
            })
          }, song.duration_ms + 800)

          io.to(tide).emit('queue', queue)

          playResponses.forEach((playResponse, index) => {
            if (typeof playResponse !== 'undefined') {
              io.to(participants[index]).emit('message', {
                message: `There was an error playing: ${playResponse}`,
                type: 'italic'
              })
            }
          })

          resolve()
        })

      })
    })
  })
}

helpers.sendPlayRequest = function(user) {
  return new Promise((resolve, reject) => {
    if (user !== null) {
      axios({
        method: 'put',
        url: '/api/auth/spotify/v1/me/player/play',
        headers: {"Authorization": `Bearer ${user.token}`},
        data: {
          uri: this.song.uri
        }
      }).then(() => {
        resolve()
      }).catch((err) => {
        resolve(err.response.data.message)
      })
    }
  })
}

helpers.getParticipants = (tide) => {
  return new Promise((resolve, reject) => {
    io.in(tide).clients((error, clients) => {
      if (error) throw error
      resolve(clients)
    })
  })
}

helpers.getParticipantsData = (participants) => {
  return new Promise((resolve, reject) => {

    let fn = function getUserData(id) {
      return new Promise((resolve, reject) => {
        redisClient.get(id, (error, result) => {
          if (error) {
            console.log(error);
            throw error;
          }
          if (typeof result !== 'undefined') {
            result = JSON.parse(result);
          }
          resolve(result);
        })
      })
    }

    let results = participants.map(fn);
    let userData = Promise.all(results);
    userData.then((data) => {
      resolve(data);
    })
  })
}
