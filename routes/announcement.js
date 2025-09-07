const express = require('express');
const router = express.Router();

router.get('/announcement', (req, res) => {
    res.render('announcement', { title: 'Announcement' });
});

module.exports = router;
