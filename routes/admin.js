const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser')
const db = require('../db');


router.get('/admin', (req, res) => {
    res.render('crud', { title: 'CRUD Operations' });
});

//API add university
router.post('/admin/universities', (req, res) => {
    const { name, location, website } = req.body;

    db.query('INSERT INTO university (Name, Location, Website) VALUES (?, ?, ?)', [name, location, website], (err, result) => {
        if (err) {
            console.error('Error inserting university:', err);
            return res.status(500).send('Error inserting university');
        }
        res.status(201).send('University added');
    });
});

//API add faculty
    router.post('/admin/faculties', (req, res) => {
        // accept either `university` or `University` in request body
        const uniRaw = req.body.university ?? req.body.University;
        const { name } = req.body;
        if(!name) return res.status(400).send('Faculty name is required');

        // helper to insert once we have universityId
        function insertFacultyWithUniversityId(universityId){
            db.query('INSERT INTO faculty (University_ID, Name) VALUES (?, ?)', [universityId, name ], (err, result) => {
                if (err) {
                    console.error('Error inserting faculty:', err);
                    return res.status(500).send('Error inserting faculty');
                }
                res.status(201).send('Faculty added');
            });
        }

        if(uniRaw == null || String(uniRaw).trim() === ''){
            return res.status(400).send('university (name) is required');
        }

        // treat `uniRaw` as a name: look up id by name (case-insensitive)
        const uniName = String(uniRaw).trim();
        db.query('SELECT ID FROM university WHERE LOWER(Name) = LOWER(?) LIMIT 1', [uniName], (err, rows) => {
            if(err){
                console.error('Error looking up university by name:', err);
                return res.status(500).send('Error looking up university');
            }
            if(rows && rows.length){
                const row = rows[0];
                const resolvedId = row.ID ?? row.id ?? row.UniversityID ?? row.University_ID;
                if(!resolvedId) return res.status(500).send('University record missing id');
                return insertFacultyWithUniversityId(resolvedId);
            }
            // not found
            return res.status(400).send('University not found (provide existing University Name)');
        });
    });

module.exports = router;