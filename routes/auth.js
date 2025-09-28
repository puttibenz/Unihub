const express = require('express');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser')
const db = require('../db');
const router = express.Router();

// Register
router.get('/register', (req,res) => {
    res.render('register', {title:'Register'});
});

router.post('/register', async (req, res) => {
    // Expect payload: { name, lastname, email, phone?, user_type, password, school_name|null }
    const { name, lastname, email, phone, user_type, password, school_name } = req.body || {};

    // Basic presence validation
    if (!name || !lastname || !email || !user_type || !password) {
        return res.status(400).json({ message: 'กรอกข้อมูลให้ครบถ้วน' });
    }

    // User type whitelist
    const allowedTypes = ['student','university_student','teacher','staff'];
    if (!allowedTypes.includes(user_type)) {
        return res.status(400).json({ message: 'ประเภทผู้ใช้ไม่ถูกต้อง' });
    }

    // School required for certain user types
    const needsSchool = ['student','university_student','teacher'].includes(user_type);
    if (needsSchool && !school_name) {
        return res.status(400).json({ message: 'กรุณากรอกชื่อสถานศึกษา' });
    }

    // Length / format checks (simple)
    if (name.length > 100 || lastname.length > 100) {
        return res.status(400).json({ message: 'ชื่อหรือสกุลยาวเกินไป' });
    }
    if (school_name && school_name.length > 150) {
        return res.status(400).json({ message: 'ชื่อสถานศึกษายาวเกินไป' });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
    }

    // Basic email pattern (lightweight)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'อีเมลไม่ถูกต้อง' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // Normalize email to lowercase for uniqueness consistency
        const emailLower = email.toLowerCase();

        // Insert (allow NULL for school_name, phone) – reordered columns to reflect table sequence
        // Table (example): ID, first_name, last_name, email, school_name, user_type, phone_number, password
        const sql = `INSERT INTO users (first_name, last_name, email, school_name, user_type, phone_number, password)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`;
        // ตารางปัจจุบันตั้ง school_name, phone_number เป็น NOT NULL -> ใช้ '' แทน NULL สำหรับ staff / ไม่มีเบอร์
        const schoolValue = needsSchool ? school_name : '';
        const phoneSanitized = phone && phone.trim() !== '' ? phone.trim() : '';

        db.query(sql, [name, lastname, emailLower, schoolValue, user_type, phoneSanitized, hash], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ message: 'อีเมลนี้ถูกใช้แล้ว' });
                }
                if (err.code === 'ER_BAD_NULL_ERROR') {
                    console.error('NOT NULL constraint hit:', err.sqlMessage);
                    return res.status(500).json({ message: 'คอลัมน์บางตัวห้าม NULL (ปรับ schema หรือใช้ค่า default)', column: err.sqlMessage });
                }
                console.error('Register insert error:', err);
                return res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.code });
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
    const sql = `SELECT ID, first_name, last_name, email, school_name, user_type, phone_number, password 
                 FROM users WHERE email = ?`;
    db.query(sql, [email.toLowerCase()], async (err, results) => {
        if (err) return res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err });
        if (results.length === 0) {
            return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        }
        const user = results[0];
        const hashed = user.password; // standardized lowercase column
        const match = await bcrypt.compare(password, hashed);
        if (!match) {
            return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        }
        req.session.user = {
            id: user.ID,
            first_name: user.first_name,
            last_name: user.last_name,
            school_name: user.school_name,
            email: user.email,
            user_type: user.user_type || user.User_Type || null
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
