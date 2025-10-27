const mysql = require('mysql2/promise'); 

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'unihub'
});

pool.getConnection()
    .then((connection) => {
        console.log('Connected to MySQL database.');
        connection.release();
    })
    .catch((err) => {
        console.error('MySQL connection error:', err);
    });

module.exports = pool;
