const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.render('announcement', { title: 'Announcement' });
});

module.exports = router;
