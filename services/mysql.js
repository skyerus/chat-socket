var mysql = require('mysql')
var logger = require('./logger.js')

var con = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE
})

con.connect(function(err) {
  if (err) throw err
});

module.exports = {
  addUserToTide(username, tideId) {
    return new Promise((resolve, reject) => {
      con.query(`SELECT id FROM user WHERE username = ${mysql.escape(username)}`, (err, user) => {
        if (err) {
          logger.error(err)
          return reject(err)
        }
        if (typeof user[0] !== "undefined") {
          con.query(`SELECT id FROM tide_participant WHERE user_id = ${user[0].id} AND tide_id = ${tideId}`, (err, result) => {
            if (err) {
              logger.error(err)
              return reject(err)
            }
            if (typeof result[0] === "undefined") {
              con.query(`INSERT INTO tide_participant (user_id, tide_id) VALUES (${mysql.escape(user[0].id)}, ${mysql.escape(tideId)})`, (err, result) => {
                if (err) {
                  logger.error(err)
                  return reject(err)
                }
                resolve()
              })
            }
          })
        }
      })
    });
  },

  removeUserFromTide(username, tideId) {
    return new Promise((resolve, reject) => {
      con.query(`SELECT id FROM user WHERE username=${mysql.escape(username)}`, (err, result) => {
        if (err) {
          logger.error(err)
          return reject(err)
        }
        if (typeof result[0] !== "undefined") {
          con.query(`DELETE FROM tide_participant WHERE (user_id = ${mysql.escape(result[0].id)}) AND (tide_id = ${mysql.escape(tideId)})`, (err, result) => {
            if (err) {
              logger.error(err)
              return reject(err)
            }
            resolve()
          })
        }
      })
    })
  },

  removeUserFromAllTides(username, tideId) {
    return new Promise((resolve, reject) => {
      con.query(`SELECT id FROM user WHERE username=${mysql.escape(username)}`, (err, result) => {
        if (err) {
          logger.error(err)
          return reject(err)
        }
        if (typeof result[0] !== "undefined") {
          con.query(`DELETE FROM tide_participant WHERE (user_id = ${mysql.escape(result[0].id)})`, (err, result) => {
            if (err) {
              logger.error(err)
              return reject(err)
            }
            resolve()
          })
        }
      })
    })
  }
}