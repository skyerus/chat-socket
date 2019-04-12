var mysql = require('mysql')

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
      con.query(`SELECT id FROM user WHERE username = ${mysql.escape(username)}`, (err, result) => {
        if (err) {
          reject(err)
        }
        con.query(`INSERT INTO tide_participant (user_id, tide_id) VALUES (${mysql.escape(result[0].id)}, ${mysql.escape(tideId)})`, (err, result) => {
          if (err) {
            reject(err)
          }
          resolve()
        })
      })
    });
  },

  removeUserFromTide(username, tideId) {
    return new Promise((resolve, reject) => {
      con.query(`SELECT id FROM user WHERE username=${mysql.escape(username)}`, (err, result) => {
        if (err) {
          reject(err)
        }
        con.query(`DELETE FROM tide_participant WHERE (user_id = ${mysql.escape(result[0].id)}) AND (tide_id = ${mysql.escape(tideId)})`, (err, result) => {
          if (err) {
            reject(err)
          }
          resolve()
        })
      })
    })
  },

  removeUserFromAllTides(username, tideId) {
    return new Promise((resolve, reject) => {
      con.query(`SELECT id FROM user WHERE username=${mysql.escape(username)}`, (err, result) => {
        if (err) {
          reject(err)
        }
        con.query(`DELETE FROM tide_participant WHERE (user_id = ${mysql.escape(result[0].id)})`, (err, result) => {
          if (err) {
            reject(err)
          }
          resolve()
        })
      })
    })
  }
}