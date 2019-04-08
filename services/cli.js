var axios = require('axios');
var redisClient = require('../redis.js')

axios.defaults.baseURL = process.env.RIPTIDES_API_HOST;

module.exports = {
  handle: (name, id) => {
    let args = name.split(' ');
    name = args[0];
    args.splice(0, 1);
    args = {
      query: args,
      id: id
    };
    return callFunc(name, args);
  }
}

function callFunc(name, args = []) {
  let fn = funcObj[name];

  if(typeof fn !== 'function') {
    return new Promise((resolve, reject) => {
      resolve('Invalid command, enter !help to view some available commands');
    })
  }
  return fn(args);
}

let funcObj = {};

funcObj.help = () => {
  return new Promise((resolve, reject) => {
    resolve('Available commands: ');
  });
}

funcObj.play = (args) => {
  return new Promise((resolve, reject) => {
    redisClient.get(args.id, (error, result) => {
      if (error) {
        console.log(error);
        throw error;
      }
      result = JSON.parse(result);
      axios({
        method: 'put',
        url: '/api/spotify/v1/search/play',
        headers: {"Authorization": `Bearer ${result.token}`},
        data: {
          q: args.query.join(' ')
        }
      }).then((response) => {
        resolve(`Now playing ${response.data.name} by ${response.data.artist}`);
      }).catch((error) => {
        resolve('Error');
      })
    });
  })
}


