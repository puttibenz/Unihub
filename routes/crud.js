const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.render('crud', { title: 'CRUD Operations' });
});

module.exports = router;