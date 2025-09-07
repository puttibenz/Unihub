const express = require('express');
const router = express.Router();

router.get('/profile', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    // ส่ง user จาก session ไป view (app.js ใส่ res.locals.user แล้ว แต่เผื่อกรณีอื่น)
    res.render('profile', { title: 'Profile', user: req.session.user });
});

module.exports = router;
