const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.render('universities', { title: 'Universities' });
});

module.exports = router;
