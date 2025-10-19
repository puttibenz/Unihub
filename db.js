const mysql = require('mysql2/promise'); // <--- เปลี่ยนตรงนี้

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'unihub'
});

module.exports = pool;

pool.getConnection()
    .then((connection) => {
        console.log('Connected to MySQL database.');
        connection.release();
    })
    .catch((err) => {
        console.error('MySQL connection error:', err);
    });

module.exports = pool;
