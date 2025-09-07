const express = require('express');
const router = express.Router();

router.get('/universities', (req, res) => {
    res.render('universities', { title: 'Universities' });
});

module.exports = router;
