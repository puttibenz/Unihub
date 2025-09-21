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
                    // include universityId so client can filter faculties by selected university
                    universityId: (f.University_ID ?? f.UniversityId ?? f.universityId ?? null),
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

                // fetch categories as well, then fetch events and announcements to embed into the admin page
                const catsSql = 'SELECT ID as id, Name as name FROM category ORDER BY Name';
                db.query(catsSql, (errC, catsRows) => {
                    if (errC) {
                        console.error('DB select categories error:', errC);
                        catsRows = [];
                    }
                    const normCats = (catsRows || []).map(c => ({ id: c.id, name: c.name }));

                    const eventsSql = `SELECT e.ID as id, e.Title as title, e.description as description, e.location as location, e.start_time as start_time, e.end_time as end_time, c.Name as category, u.Name as university, f.Name as faculty, d.Name as department
                                       FROM events e
                                       LEFT JOIN category c ON e.category_ID = c.ID
                                       LEFT JOIN university u ON e.university_ID = u.ID
                                       LEFT JOIN faculty f ON e.faculty_ID = f.ID
                                       LEFT JOIN department d ON e.Department_ID = d.ID
                                       ORDER BY e.start_time DESC`;

                    db.query(eventsSql, (errE, eventsRows) => {
                        if (errE) {
                            console.error('DB select events error:', errE);
                            eventsRows = [];
                        }

                        const annSql = `SELECT a.ID as id, a.Title as title, a.description as description, u.Name as university, f.Name as faculty, d.Name as department
                                        FROM announcement a
                                        LEFT JOIN university u ON a.university_ID = u.ID
                                        LEFT JOIN faculty f ON a.faculty_ID = f.ID
                                        LEFT JOIN department d ON a.Department_ID = d.ID
                                        ORDER BY a.ID DESC`;

                        db.query(annSql, (errA, annRows) => {
                            if (errA) {
                                console.error('DB select announcements error:', errA);
                                annRows = [];
                            }

                            const normEvents = (eventsRows || []).map(r => ({
                                id: r.id,
                                title: r.title,
                                description: r.description,
                                location: r.location,
                                start_time: r.start_time,
                                end_time: r.end_time,
                                category: r.category || null,
                                university: r.university || null,
                                faculty: r.faculty || null,
                                department: r.department || null
                            }));

                            const normAnns = (annRows || []).map(r => ({
                                id: r.id,
                                title: r.title,
                                description: r.description,
                                university: r.university || null,
                                faculty: r.faculty || null,
                                department: r.department || null
                            }));

                            // debug: log sizes of loaded collections to help diagnose missing select options
                            try { console.log('/admin render: unis=', (normUnis||[]).length, 'facs=', (normFacs||[]).length, 'deps=', (normDeps||[]).length, 'cats=', (normCats||[]).length, 'events=', (normEvents||[]).length, 'anns=', (normAnns||[]).length); } catch(e){}

                            return res.render('crud', {
                                title: 'CRUD Operations',
                                universities: normUnis,
                                faculties: normFacs,
                                departments: normDeps,
                                categories: normCats,
                                events: normEvents,
                                announcements: normAnns
                            });
                        });
                    });
                });
            });
        });
    });
});

// quick JSON endpoint to inspect faculties from browser/devtools
router.get('/admin/faculties', (req, res) => {
    const sqlFacs = `SELECT f.ID, f.Name, f.University_ID, u.Name as UniversityName FROM faculty f JOIN university u ON f.University_ID = u.ID ORDER BY f.Name`;
    db.query(sqlFacs, (err, facs) => {
        if (err) return res.status(500).json({ success:false, message:'DB error', error: String(err) });
        const normFacs = (facs || []).map(f => ({ id: f.ID ?? f.id, name: f.Name ?? f.name, universityId: f.University_ID ?? null, university: f.UniversityName ?? null }));
        return res.json({ success:true, count: normFacs.length, faculties: normFacs });
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

// ...existing code...

// POST /admin/events
// - university: required (id number หรือ name)
// - faculty: optional (id หรือ name) — ถ้ามีจะต้องอยู่ภายใต้ university
// - department: optional (id หรือ name) — ถ้ามีจะต้องอยู่ภายใต้ faculty
router.post('/admin/events', (req, res) => {
    // debug: log incoming body and content-type to help troubleshoot missing fields from clients
    try { console.log('POST /admin/events body keys:', Object.keys(req.body || {})); } catch(e){}
    try { console.log('POST /admin/events Content-Type:', req.headers && req.headers['content-type']); } catch(e){}
    const uniRaw = req.body.university ?? req.body.University;
    const facRaw = req.body.faculty ?? req.body.Faculty;
    const depRaw = req.body.department ?? req.body.Department;
    const { title, description, location } = req.body;
    // accept multiple common key names for start/end times
    const startRaw = req.body.start_time ?? req.body.startTime ?? req.body.start ?? req.body.start_date ?? req.body.startDate;
    const endRaw = req.body.end_time ?? req.body.endTime ?? req.body.end ?? req.body.end_date ?? req.body.endDate;

    if (!title) return res.status(400).json({ success:false, message:'title is required' });
    if (!startRaw || !endRaw) return res.status(400).json({ success:false, message:'start_time and end_time are required (accepted aliases: startTime, start_date, endTime, end_date)'});
    const start = new Date(startRaw);
    const end = new Date(endRaw);
    if (isNaN(start) || isNaN(end) || start >= end) return res.status(400).json({ success:false, message:'Invalid time range (start_time < end_time required)' });

    if (uniRaw == null || String(uniRaw).trim() === '') {
        return res.status(400).json({ success:false, message:'university (name) is required' });
    }

    // helpers to detect numeric id (declare before use)
    const isId = v => v != null && String(v).match(/^\d+$/);

    // enforce that university/faculty/department are provided as names (strings) only — numeric ids are not accepted
    if (isId(uniRaw)) return res.status(400).json({ success:false, message:'university must be provided as a name string (no numeric id)' });
    if (facRaw && isId(facRaw)) return res.status(400).json({ success:false, message:'faculty must be provided as a name string (no numeric id)' });
    if (depRaw && isId(depRaw)) return res.status(400).json({ success:false, message:'department must be provided as a name string (no numeric id)' });

    function resolveUniversity(cb) {
        // uniRaw is expected to be a name string
        db.query('SELECT ID FROM university WHERE LOWER(Name) = LOWER(?) LIMIT 1', [String(uniRaw).trim()], (err, rows) => {
            if (err) return cb(err);
            if (!rows || !rows.length) return cb(new Error('university_not_found'));
            cb(null, rows[0].ID);
        });
    }

    function resolveFaculty(universityId, cb) {
        if (!facRaw || String(facRaw).trim() === '') return cb(null, null);
        // facRaw is expected to be a name string
        db.query('SELECT ID FROM faculty WHERE LOWER(Name) = LOWER(?) AND University_ID = ? LIMIT 1', [String(facRaw).trim(), universityId], (err, rows) => {
            if (err) return cb(err);
            if (!rows || !rows.length) return cb(new Error('faculty_not_found'));
            cb(null, rows[0].ID);
        });
    }

    function resolveDepartment(facultyId, cb) {
        if (!depRaw || String(depRaw).trim() === '') return cb(null, null);
        if (!facultyId) return cb(new Error('department_requires_faculty'));
        // depRaw is expected to be a name string
        db.query('SELECT ID FROM department WHERE LOWER(Name) = LOWER(?) AND Faculty_ID = ? LIMIT 1', [String(depRaw).trim(), facultyId], (err, rows) => {
            if (err) return cb(err);
            if (!rows || !rows.length) return cb(new Error('department_not_found'));
            cb(null, rows[0].ID);
        });
    }

    resolveUniversity((err, universityId) => {
        if (err) {
            if (err.message === 'university_not_found') return res.status(400).json({ success:false, message:'University not found' });
            console.error('DB error resolving university:', err);
            return res.status(500).json({ success:false, message:'Database error' });
        }

        resolveFaculty(universityId, (err2, facultyId) => {
            if (err2) {
                if (err2.message === 'faculty_not_found') return res.status(400).json({ success:false, message:'Faculty not found for this university' });
                console.error('DB error resolving faculty:', err2);
                return res.status(500).json({ success:false, message:'Database error' });
            }

            resolveDepartment(facultyId, (err3, departmentId) => {
                if (err3) {
                    if (err3.message === 'department_requires_faculty') return res.status(400).json({ success:false, message:'Department provided but faculty is missing' });
                    if (err3.message === 'department_not_found') return res.status(400).json({ success:false, message:'Department not found for this faculty' });
                    console.error('DB error resolving department:', err3);
                    return res.status(500).json({ success:false, message:'Database error' });
                }

                // accept category (id or name) from request body as category, categoryId, category_ID or category_id
                const categoryRaw = req.body.category ?? req.body.categoryId ?? req.body.category_ID ?? req.body.category_id;

                function resolveCategory(raw, cb){
                    if(raw == null || String(raw).trim() === '') return cb(null, null);
                    if(isId(raw)){
                        db.query('SELECT ID FROM category WHERE ID = ? LIMIT 1', [Number(raw)], (errC, rowsC) => {
                            if(errC) return cb(errC);
                            if(!rowsC || !rowsC.length) return cb(new Error('category_not_found'));
                            return cb(null, rowsC[0].ID);
                        });
                    } else {
                        const name = String(raw).trim();
                        db.query('SELECT ID FROM category WHERE LOWER(Name) = LOWER(?) LIMIT 1', [name], (errC, rowsC) => {
                            if(errC) return cb(errC);
                            if(rowsC && rowsC.length) return cb(null, rowsC[0].ID);
                            // not found: create a new category
                            db.query('INSERT INTO category (Name) VALUES (?)', [name], (errI, resultI) => {
                                if(errI) return cb(errI);
                                return cb(null, resultI.insertId);
                            });
                        });
                    }
                }

                resolveCategory(categoryRaw, (errCat, categoryId) => {
                    if(errCat){
                        if(errCat.message === 'category_not_found') return res.status(400).json({ success:false, message:'Category not found' });
                        console.error('DB error resolving category:', errCat);
                        return res.status(500).json({ success:false, message:'Database error' });
                    }

                    const sql = `INSERT INTO events
                        (Title, description, location, start_time, end_time, Category_ID, University_ID, Faculty_ID, Department_ID)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                    const params = [
                        title,
                        description || null,
                        location || null,
                        start.toISOString().slice(0,19).replace('T',' '),
                        end.toISOString().slice(0,19).replace('T',' '),
                        categoryId,
                        universityId,
                        facultyId,
                        departmentId
                    ];
                    db.query(sql, params, (err4, result) => {
                        if (err4) {
                            console.error('Error inserting event:', err4);
                            return res.status(500).json({ success:false, message:'Error inserting event' });
                        }
                        return res.status(201).json({ success:true, id: result.insertId });
                    });
                });
            });
        });
    });
});

router.post('/admin/announcements', (req, res) => {
    // accept title (required), description (optional), university (name, required), faculty (name optional), department (name optional)
    const uniRaw = req.body.university ?? req.body.University;
    const facRaw = req.body.faculty ?? req.body.Faculty;
    const depRaw = req.body.department ?? req.body.Department;
    const { title, description } = req.body;

    if (!title || String(title).trim() === '') return res.status(400).json({ success:false, message:'title is required' });
    if (uniRaw == null || String(uniRaw).trim() === '') return res.status(400).json({ success:false, message:'university (name) is required' });

    // helper to detect numeric id - we require names (no numeric ids)
    const isId = v => v != null && String(v).match(/^\d+$/);
    if (isId(uniRaw)) return res.status(400).json({ success:false, message:'university must be provided as a name string (no numeric id)' });
    if (facRaw && isId(facRaw)) return res.status(400).json({ success:false, message:'faculty must be provided as a name string (no numeric id)' });
    if (depRaw && isId(depRaw)) return res.status(400).json({ success:false, message:'department must be provided as a name string (no numeric id)' });

    function resolveUniversity(cb){
        db.query('SELECT ID FROM university WHERE LOWER(Name) = LOWER(?) LIMIT 1', [String(uniRaw).trim()], (err, rows) => {
            if (err) return cb(err);
            if (!rows || !rows.length) return cb(new Error('university_not_found'));
            cb(null, rows[0].ID);
        });
    }

    function resolveFaculty(universityId, cb){
        if (!facRaw || String(facRaw).trim() === '') return cb(null, null);
        db.query('SELECT ID FROM faculty WHERE LOWER(Name) = LOWER(?) AND University_ID = ? LIMIT 1', [String(facRaw).trim(), universityId], (err, rows) => {
            if (err) return cb(err);
            if (!rows || !rows.length) return cb(new Error('faculty_not_found'));
            cb(null, rows[0].ID);
        });
    }

    function resolveDepartment(facultyId, cb){
        if (!depRaw || String(depRaw).trim() === '') return cb(null, null);
        if (!facultyId) return cb(new Error('department_requires_faculty'));
        db.query('SELECT ID FROM department WHERE LOWER(Name) = LOWER(?) AND Faculty_ID = ? LIMIT 1', [String(depRaw).trim(), facultyId], (err, rows) => {
            if (err) return cb(err);
            if (!rows || !rows.length) return cb(new Error('department_not_found'));
            cb(null, rows[0].ID);
        });
    }

    resolveUniversity((err, universityId) => {
        if (err) {
            if (err.message === 'university_not_found') return res.status(400).json({ success:false, message:'University not found' });
            console.error('DB error resolving university (announcement):', err);
            return res.status(500).json({ success:false, message:'Database error' });
        }

        resolveFaculty(universityId, (err2, facultyId) => {
            if (err2) {
                if (err2.message === 'faculty_not_found') return res.status(400).json({ success:false, message:'Faculty not found for this university' });
                console.error('DB error resolving faculty (announcement):', err2);
                return res.status(500).json({ success:false, message:'Database error' });
            }

            resolveDepartment(facultyId, (err3, departmentId) => {
                if (err3) {
                    if (err3.message === 'department_requires_faculty') return res.status(400).json({ success:false, message:'Department provided but faculty is missing' });
                    if (err3.message === 'department_not_found') return res.status(400).json({ success:false, message:'Department not found for this faculty' });
                    console.error('DB error resolving department (announcement):', err3);
                    return res.status(500).json({ success:false, message:'Database error' });
                }

                const sql = 'INSERT INTO announcement (Title, description, university_ID, faculty_ID, Department_ID) VALUES (?, ?, ?, ?, ?)';
                const params = [ String(title).trim(), description || null, universityId, facultyId, departmentId ];
                db.query(sql, params, (err4, result) => {
                    if (err4) {
                        console.error('Error inserting announcement:', err4);
                        return res.status(500).json({ success:false, message:'Error inserting announcement' });
                    }
                    return res.status(201).json({ success:true, id: result.insertId });
                });
            });
        });
    });
});

module.exports = router;


