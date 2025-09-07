const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /universities - render universities listing page with DB data
router.get('/universities', (req, res) => {
    const sql = 'SELECT ID, Name, Location, Website FROM university ORDER BY Name';
    db.query(sql, (err, rows) => {
        if (err) {
            console.error('DB select universities error:', err);
            return res.status(500).send('Database error');
        }

        const universities = (rows || []).map(r => ({
            id: r.ID ?? r.id,
            name: r.Name ?? r.name,
            location: r.Location ?? r.location,
            website: r.Website ?? r.website
        }));

        return res.render('universities', { title: 'Universities', universities });
    });
});

module.exports = router;
