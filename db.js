const mysql = require('mysql');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root', // เปลี่ยนตาม user ของคุณ
    password: '', // ใส่รหัสผ่านถ้ามี
    database: 'unihub'
});

db.connect((err) => {
    if (err) {
        console.error('MySQL connection error:', err);
    } else {
        console.log('Connected to MySQL database.');
    }
});

module.exports = db;
