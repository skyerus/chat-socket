var mysql = require('mysql')

var con = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE
})

module.exports = {
  addUserToTide(username, tideId) {
    return new Promise((resolve, reject) => {
      con.connect(function(err) {
        if (err) {
          reject(err)
        }

        con.query(`SELECT id FROM user WHERE username=${username}`, (err, result) => {
          if (err) {
            reject(err)
          }
          con.query(`INSERT INTO tide_participant (user_id, tide_id) VALUES (${result}, ${tideId})`, (err, result) => {
            if (err) {
              reject(err)
            }
            resolve()
          })
        })
      });
    })
  },

  removeUserFromTide(username, tideId) {
    return new Promise((resolve, reject) => {
      con.connect(function(err) {
        if (err) {
          reject(err)
        }

        con.query(`SELECT id FROM user WHERE username=${username}`, (err, result) => {
          if (err) {
            reject(err)
          }
          con.query(`DELETE FROM tide_participant WHERE (user_id = ${result}) AND (tide_id = ${tideId})`, (err, result) => {
            if (err) {
              reject(err)
            }
            resolve()
          })
        })
      });
    })
  }
}