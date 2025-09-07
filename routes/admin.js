const express = require('express');
const router = express.Router();

router.get('/admin', (req, res) => {
    res.render('crud', { title: 'CRUD Operations' });
});

module.exports = router;