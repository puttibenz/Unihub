const express = require('express')
const router = express.Router()

router.get('/', async (req,res, next) => {
    try {
        return res.render('index', {title:'Index'});
    } catch (err) { return next(err); }
});

module.exports = router