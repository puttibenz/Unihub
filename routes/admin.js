const express = require('express');
const router = express.Router();
const db = require('../db');
// ensure JSON parsing for this router (app.js already has bodyParser.json but this is safe)
router.use(express.json());

// render admin page with data from DB so the frontend can embed lists
router.get('/admin', (req, res) => {
    // fetch universities
    const sqlUnis = 'SELECT ID, Name, Location, Website FROM university ORDER BY Name';
    db.query(sqlUnis, (err, unis) => {
        if (err) {
            console.error('DB select universities error:', err);
            return res.status(500).send('Database error');
        }

        // fetch faculties
        const sqlFacs = `SELECT f.ID, f.Name, f.University_ID, u.Name as UniversityName 
                        FROM faculty f 
                        JOIN university u ON f.University_ID = u.ID 
                        ORDER BY f.Name`;
        db.query(sqlFacs, (err2, facs) => {
            if (err2) {
                console.error('DB select faculties error:', err2);
                return res.status(500).send('Database error');
            }

            // fetch departments joined with faculty/university names (useful for rendering table)
            const sqlDeps = `SELECT d.ID as ID, d.Name as Name, d.Faculty_ID as Faculty_ID, f.Name as FacultyName, f.University_ID as University_ID, u.Name as UniversityName
                             FROM department d
                             JOIN faculty f ON d.Faculty_ID = f.ID
                             JOIN university u ON f.University_ID = u.ID
                             ORDER BY d.Name`;

            db.query(sqlDeps, (err3, deps) => {
                if (err3) {
                    console.error('DB select departments error:', err3);
                    return res.status(500).send('Database error');
                }

                // normalize DB rows to lowercase keys so the EJS template finds expected properties
                const normUnis = (unis || []).map(u => ({
                    id: u.ID ?? u.id,
                    name: u.Name ?? u.name,
                    location: u.Location ?? u.location,
                    website: u.Website ?? u.website
                }));

                const normFacs = (facs || []).map(f => ({
                    id: f.ID ?? f.id,
                    name: f.Name ?? f.name,
                    university: f.UniversityName ?? f.University ?? f.university
                }));

                const normDeps = (deps || []).map(d => ({
                    id: d.ID ?? d.id,
                    name: d.Name ?? d.name,
                    facultyId: d.Faculty_ID ?? d.FacultyId ?? d.facultyId,
                    faculty: d.FacultyName ?? d.Faculty ?? d.faculty,
                    universityId: d.University_ID ?? d.UniversityId ?? d.universityId,
                    university: d.UniversityName ?? d.University ?? d.university
                }));

                return res.render('crud', {
                    title: 'CRUD Operations',
                    universities: normUnis,
                    faculties: normFacs,
                    departments: normDeps
                });
            });
        });
    });
});

//Post /admin/universities
router.post('/admin/universities', (req, res) => {
    const { name, location, website } = req.body;

    db.query('INSERT INTO university (Name, Location, Website) VALUES (?, ?, ?)', [name, location, website], (err, result) => {
        if (err) {
            console.error('Error inserting university:', err);
            return res.status(500).json({ success: false, message: 'Error inserting university' });
        }
        return res.status(201).json({ success: true, id: result.insertId });
    });
});

//Post /admin/faculties
router.post('/admin/faculties', (req, res) => {
    // accept either `university` or `University` in request body
    const uniRaw = req.body.university ?? req.body.University;
    const { name } = req.body;
    if(!name) return res.status(400).json({ success:false, message:'Faculty name is required' });

    // helper to insert once we have universityId
    function insertFacultyWithUniversityId(universityId){
        db.query('INSERT INTO faculty (University_ID, Name) VALUES (?, ?)', [universityId, name ], (err, result) => {
            if (err) {
                console.error('Error inserting faculty:', err);
                return res.status(500).json({ success:false, message:'Error inserting faculty' });
            }
            return res.status(201).json({ success:true, id: result.insertId });
            });
        }

    if(uniRaw == null || String(uniRaw).trim() === ''){
        return res.status(400).json({ success:false, message:'university (name) is required' });
    }

    // treat `uniRaw` as a name: look up id by name (case-insensitive)
    const uniName = String(uniRaw).trim();
    db.query('SELECT ID FROM university WHERE LOWER(Name) = LOWER(?) LIMIT 1', [uniName], (err, rows) => {
        if(err){
            console.error('Error looking up university by name:', err);
            return res.status(500).json({ success:false, message:'Error looking up university' });
        }
        if(rows && rows.length){
            const row = rows[0];
            const resolvedId = row.ID ?? row.id ?? row.UniversityID ?? row.University_ID;
            if(!resolvedId) return res.status(500).json({ success:false, message:'University record missing id' });
            return insertFacultyWithUniversityId(resolvedId);
        }
        // not found
        return res.status(400).json({ success:false, message:'University not found (provide existing University Name)' });
    });
});

//API add department
router.post('/admin/departments', (req, res) => {
    // accept either `university` or `University`, and `faculty` or `Faculty`
    const uniRaw = req.body.university ?? req.body.University;
    const facRaw = req.body.faculty ?? req.body.Faculty;
    const { name } = req.body;

    if (!name) return res.status(400).json({ success:false, message:'Department name is required' });
    if (uniRaw == null || String(uniRaw).trim() === '') return res.status(400).json({ success:false, message:'university (name) is required' });
    if (facRaw == null || String(facRaw).trim() === '') return res.status(400).json({ success:false, message:'faculty (name) is required' });

    const uniName = String(uniRaw).trim();
    const facName = String(facRaw).trim();

    // lookup university id by name (case-insensitive)
    db.query('SELECT ID FROM university WHERE LOWER(Name) = LOWER(?) LIMIT 1', [uniName], (err, uniRows) => {
        if (err) {
            console.error('Error looking up university by name:', err);
            return res.status(500).json({ success:false, message:'Error looking up university' });
        }
        if (!uniRows || !uniRows.length) return res.status(400).json({ success:false, message:'University not found (provide existing University Name)' });

        const uniRow = uniRows[0];
        const universityId = uniRow.ID ?? uniRow.id ?? uniRow.UniversityID ?? uniRow.University_ID;
        if (!universityId) return res.status(500).json({ success:false, message:'University record missing id' });

        // lookup faculty by name within the university
        db.query('SELECT ID FROM faculty WHERE LOWER(Name) = LOWER(?) AND University_ID = ? LIMIT 1', [facName, universityId], (err2, facRows) => {
            if (err2) {
                console.error('Error looking up faculty by name:', err2);
                return res.status(500).json({ success:false, message:'Error looking up faculty' });
            }
            if (!facRows || !facRows.length) return res.status(400).json({ success:false, message:'Faculty not found for the given university (provide existing Faculty Name)' });

            const facRow = facRows[0];
            const facultyId = facRow.ID ?? facRow.id ?? facRow.FacultyID ?? facRow.Faculty_ID;
            if (!facultyId) return res.status(500).json({ success:false, message:'Faculty record missing id' });

            // insert department (assumes department table has Faculty_ID and Name columns)
            db.query('INSERT INTO department (Faculty_ID, Name) VALUES (?, ?)', [facultyId, name], (err3, result) => {
                if (err3) {
                    console.error('Error inserting department:', err3);
                    return res.status(500).json({ success:false, message:'Error inserting department' });
                }
                return res.status(201).json({ success:true, id: result.insertId });
            });
        });
    });
});

module.exports = router;