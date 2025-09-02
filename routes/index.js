const express = require('express')
const router = express.Router()

// Define your routes here
router.get('/', (req,res) => {
    res.render('index', {title:'Index'});
});


module.exports = router