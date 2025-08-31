const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const router = express.Router();

// Register
router.get('/register', (req,res) => {
    res.render('register', {title:'Register'});
});

router.post('/register', async (req, res) => {
    const { name, lastname, school, email, password } = req.body;
    if (!name || !lastname || !school || !email || !password) {
        return res.status(400).json({ message: 'กรอกข้อมูลให้ครบถ้วน' });
    }
    try {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        const sql = 'INSERT INTO users (first_name, last_name, school_name , email , password) VALUES (?, ?, ?, ?, ?)';
        db.query(sql, [name, lastname, school, email, hash], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ message: 'อีเมลนี้ถูกใช้แล้ว' });
                }
                return res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err });
            }
            return res.status(201).json({ message: 'สมัครสมาชิกสำเร็จ' });
        });
    } catch (error) {
        return res.status(500).json({ message: 'เกิดข้อผิดพลาด', error });
    }
});

// Login
router.get('/login', (req,res) => {
    res.render('login', {title:'Login'});
});

router.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'กรอกข้อมูลให้ครบถ้วน' });
    }
    const sql = 'SELECT * FROM users WHERE email = ?';
    db.query(sql, [email], async (err, results) => {
        if (err) return res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err });
        if (results.length === 0) {
            return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        }
        const user = results[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        }
        req.session.user = {
            id: user.UserID,
            first_name: user.first_name,
            last_name: user.last_name,
            school_name: user.school_name,
            email: user.email,
        };
        return res.status(200).json({ message: 'เข้าสู่ระบบสำเร็จ' });
    });
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

module.exports = router;
