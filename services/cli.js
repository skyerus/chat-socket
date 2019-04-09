var axios = require('axios');
var redisClient = require('../redis.js')
var buildQuery = require('./BuildQuery.js')
var io;
var song;
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
      redisClient.lrange(args.tide, 0, 0, (err, left) => {
        redisClient.rpush([args.tide, JSON.stringify(searchRes)], () => {
          if (left.length === 0) {
            helpers.play(args.tide).then(() => {
              resolve();
            })
          } else {
            io.to(args.tide).emit('message', {
              message: `Added ${searchRes.name} by ${searchRes.artist} to the queue`,
              type: 'italic'
            })
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
        url: `/api/spotify/v1/search${query}`,
        headers: {"Authorization": `Bearer ${result.token}`}
      }).then((response) => {
        resolve(response.data);
      }).catch((error) => {
        reject(error.response.data.message);
      })
    })
  })
}

helpers.play = (tide) => {
  return new Promise((resolve, reject) => {
    redisClient.lrange(tide, 0, 0, (err, res) => {
      if (err) {
        console.log(error)
        throw error
      }
      if (res.length !== 0) {
        song = JSON.parse(res)
        helpers.getParticipants(tide).then((participants) => {
          helpers.getParticipantsData(participants).then((participantsData) => {
            if (participantsData.length === 0) {
              redisClient.del(tide)
              resolve()
            }
            let songReqs = participantsData.map(helpers.sendPlayRequest)

            Promise.all(songReqs).then((playResponses) => {
              setTimeout(() => {
                redisClient.lpop(tide, (err, res) => {
                  helpers.play(tide)
                })
              }, song.duration_ms + 800)

              playResponses.forEach((playResponse, index) => {
                let message;
                if (typeof playResponse === 'undefined') {
                  message = `Now playing ${song.name} by ${song.artist}`
                } else {
                  message = `There was an error playing: ${playResponse}`
                }
                io.to(participants[index]).emit('message', {
                  message: message,
                  type: 'italic'
                })
              })

              resolve()
            })

          })
        })
      } else {
        resolve()
      }
    })
  })
}

helpers.sendPlayRequest = (user) => {
  return new Promise((resolve, reject) => {
    if (user !== null) {
      axios({
        method: 'put',
        url: '/api/spotify/v1/me/player/play',
        headers: {"Authorization": `Bearer ${user.token}`},
        data: {
          uri: song.uri
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
