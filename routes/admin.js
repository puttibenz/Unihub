const express = require('express');
const router = express.Router();
const db = require('../db');

// Ensure JSON parsing for this router
router.use(express.json());

// Helper: run a SELECT query and return rows (works with mysql2/promise)
async function query(sql, params = []) {
    const [rows] = await db.query(sql, params);
    return rows;
}

// GET /admin
// Render admin CRUD page and provide collections for the admin UI.
// Response (renders 'crud' template):
//   - universities: [{ id, name, location, website, email, phone }, ...]
//   - faculties: [{ id, name, universityId, university, email, phone }, ...]
//   - departments: [{ id, name, facultyId, faculty, universityId, university, email, phone }, ...]
// Errors are forwarded to next(err).
router.get('/admin', async (req, res, next) => {
    try {
        const unis = await query('SELECT ID, Name, Location, Website, Email, Contact_Number FROM university ORDER BY Name');
        const facs = await query('SELECT f.ID, f.Name, f.University_ID, f.Email, f.Phone as Phone, u.Name as UniversityName FROM faculty f JOIN university u ON f.University_ID = u.ID ORDER BY f.Name');
        const deps = await query('SELECT d.ID, d.Name, d.Faculty_ID, d.Email, d.Phone as Phone, f.Name as FacultyName, f.University_ID, u.Name as UniversityName FROM department d JOIN faculty f ON d.Faculty_ID = f.ID JOIN university u ON f.University_ID = u.ID ORDER BY d.Name');

        const catsRows = await query('SELECT ID as id, Name as name FROM category ORDER BY Name');
        const eventsRows = await query(`SELECT e.ID as id, e.Title as title, e.description as description, e.location as location, e.start_time as start_time, e.end_time as end_time, c.Name as category, u.Name as university, f.Name as faculty, d.Name as department FROM events e LEFT JOIN category c ON e.category_ID = c.ID LEFT JOIN university u ON e.university_ID = u.ID LEFT JOIN faculty f ON e.faculty_ID = f.ID LEFT JOIN department d ON e.Department_ID = d.ID ORDER BY e.start_time DESC`);
        const annRows = await query(`SELECT a.ID as id, a.Title as title, a.description as description, u.Name as university, f.Name as faculty, d.Name as department FROM announcement a LEFT JOIN university u ON a.university_ID = u.ID LEFT JOIN faculty f ON a.faculty_ID = f.ID LEFT JOIN department d ON a.Department_ID = d.ID ORDER BY a.ID DESC`);

        const normUnis = (unis || []).map(u => ({ id: u.ID ?? u.id, name: u.Name ?? u.name, location: u.Location ?? u.location, website: u.Website ?? u.website, email: u.Email ?? u.email ?? null, phone: u.Contact_Number ?? u.Contact ?? u.Contact_Number ?? null }));
        const normFacs = (facs || []).map(f => ({ id: f.ID ?? f.id, name: f.Name ?? f.name, universityId: f.University_ID ?? null, university: f.UniversityName ?? null, email: f.Email ?? null, phone: f.Phone ?? null }));
        const normDeps = (deps || []).map(d => ({ id: d.ID ?? d.id, name: d.Name ?? d.name, facultyId: d.Faculty_ID ?? null, faculty: d.FacultyName ?? null, universityId: d.University_ID ?? null, university: d.UniversityName ?? null, email: d.Email ?? null, phone: d.Phone ?? null }));
        const normCats = (catsRows || []).map(c => ({ id: c.id, name: c.name }));
        const normEvents = (eventsRows || []).map(r => ({ id: r.id, title: r.title, description: r.description, location: r.location, start_time: r.start_time, end_time: r.end_time, category: r.category || null, university: r.university || null, faculty: r.faculty || null, department: r.department || null }));
        const normAnns = (annRows || []).map(r => ({ id: r.id, title: r.title, description: r.description, university: r.university || null, faculty: r.faculty || null, department: r.department || null }));

        return res.render('crud', { title: 'CRUD Operations', universities: normUnis, faculties: normFacs, departments: normDeps, categories: normCats, events: normEvents, announcements: normAnns });
    } catch (err) {
        console.error('Admin /admin error:', err);
        return next(err);
    }
});

// POST /admin/faculties
// Create a new faculty associated with an existing university (lookup by university name).
// Body: { university: '<University Name>', name: '<Faculty Name>', email?: '<email>', phone?: '<phone>' }
// Response: 201 { success: true, id }
// Validation errors return 400; other errors forwarded to next(err).
router.post('/admin/faculties', async (req, res, next) => {
    try {
        const uniRaw = req.body.university ?? req.body.University;
        const { name, email, phone } = req.body;
        if (!name) return res.status(400).json({ success: false, message: 'Faculty name is required' });
        if (!uniRaw || String(uniRaw).trim() === '') return res.status(400).json({ success: false, message: 'university (name) is required' });
        const rows = await query('SELECT ID FROM university WHERE LOWER(Name) = LOWER(?) LIMIT 1', [String(uniRaw).trim()]);
        if (!rows || !rows.length) return res.status(400).json({ success: false, message: 'University not found (provide existing University Name)' });
        const resolvedId = rows[0].ID;
        const [result] = await db.query('INSERT INTO faculty (University_ID, Name, Email, Phone) VALUES (?, ?, ?, ?)', [resolvedId, name, email || null, phone || null]);
        return res.status(201).json({ success: true, id: result.insertId });
    } catch (err) { return next(err); }
});

// POST /admin/departments
// Create a new department under an existing faculty and university (lookup by names).
// Body: { university: '<University Name>', faculty: '<Faculty Name>', name: '<Department Name>', email?: '<email>', phone?: '<phone>' }
// Response: 201 { success: true, id }
// Validation errors return 400; other errors forwarded to next(err).
router.post('/admin/departments', async (req, res, next) => {
    try {
        const uniRaw = req.body.university ?? req.body.University;
        const facRaw = req.body.faculty ?? req.body.Faculty;
        const { name } = req.body;
        if (!name) return res.status(400).json({ success: false, message: 'Department name is required' });
        if (!uniRaw || String(uniRaw).trim() === '') return res.status(400).json({ success: false, message: 'university (name) is required' });
        if (!facRaw || String(facRaw).trim() === '') return res.status(400).json({ success: false, message: 'faculty (name) is required' });
        const uniRows = await query('SELECT ID FROM university WHERE LOWER(Name) = LOWER(?) LIMIT 1', [String(uniRaw).trim()]);
        if (!uniRows || !uniRows.length) return res.status(400).json({ success: false, message: 'University not found (provide existing University Name)' });
        const universityId = uniRows[0].ID;
        const facRows = await query('SELECT ID FROM faculty WHERE LOWER(Name) = LOWER(?) AND University_ID = ? LIMIT 1', [String(facRaw).trim(), universityId]);
        if (!facRows || !facRows.length) return res.status(400).json({ success: false, message: 'Faculty not found for the given university (provide existing Faculty Name)' });
        const facultyId = facRows[0].ID;
        const [result] = await db.query('INSERT INTO department (Faculty_ID, Name, Email, Phone) VALUES (?, ?, ?, ?)', [facultyId, name, req.body.email || null, req.body.phone || null]);
        return res.status(201).json({ success: true, id: result.insertId });
    } catch (err) { return next(err); }
});

// POST /admin/events
// Create an event. If category is a name and doesn't exist, it will be created.
// Body: { title, start_time, end_time, university: '<name>', faculty?: '<name>', department?: '<name>', category?: '<name or id>', description?, location? }
// Response: 201 { success: true, id }
// Validation errors return 400; other errors forwarded to next(err).
router.post('/admin/events', async (req, res, next) => {
    try {
        const uniRaw = req.body.university ?? req.body.University;
        const facRaw = req.body.faculty ?? req.body.Faculty;
        const depRaw = req.body.department ?? req.body.Department;
        const { title, description, location } = req.body;
        const startRaw = req.body.start_time ?? req.body.startTime ?? req.body.start ?? req.body.start_date ?? req.body.startDate;
        const endRaw = req.body.end_time ?? req.body.endTime ?? req.body.end ?? req.body.end_date ?? req.body.endDate;
        if (!title) return res.status(400).json({ success: false, message: 'title is required' });
        if (!startRaw || !endRaw) return res.status(400).json({ success: false, message: 'start_time and end_time are required' });
        const start = new Date(startRaw);
        const end = new Date(endRaw);
        if (isNaN(start) || isNaN(end) || start >= end) return res.status(400).json({ success: false, message: 'Invalid time range' });
        if (!uniRaw || String(uniRaw).trim() === '') return res.status(400).json({ success: false, message: 'university (name) is required' });
        const isId = v => v != null && String(v).match(/^\d+$/);
        if (isId(uniRaw)) return res.status(400).json({ success: false, message: 'university must be provided as a name string (no numeric id)' });
        if (facRaw && isId(facRaw)) return res.status(400).json({ success: false, message: 'faculty must be provided as a name string (no numeric id)' });
        if (depRaw && isId(depRaw)) return res.status(400).json({ success: false, message: 'department must be provided as a name string (no numeric id)' });
        const uniRows = await query('SELECT ID FROM university WHERE LOWER(Name) = LOWER(?) LIMIT 1', [String(uniRaw).trim()]);
        if (!uniRows || !uniRows.length) return res.status(400).json({ success: false, message: 'University not found' });
        const universityId = uniRows[0].ID;
        let facultyId = null;
        if (facRaw && String(facRaw).trim() !== ''){
            const facRows = await query('SELECT ID FROM faculty WHERE LOWER(Name) = LOWER(?) AND University_ID = ? LIMIT 1', [String(facRaw).trim(), universityId]);
            if (!facRows || !facRows.length) return res.status(400).json({ success: false, message: 'Faculty not found for this university' });
            facultyId = facRows[0].ID;
        }
        let departmentId = null;
        if (depRaw && String(depRaw).trim() !== ''){
            if (!facultyId) return res.status(400).json({ success: false, message: 'Department provided but faculty is missing' });
            const depRows = await query('SELECT ID FROM department WHERE LOWER(Name) = LOWER(?) AND Faculty_ID = ? LIMIT 1', [String(depRaw).trim(), facultyId]);
            if (!depRows || !depRows.length) return res.status(400).json({ success: false, message: 'Department not found for this faculty' });
            departmentId = depRows[0].ID;
        }
        const categoryRaw = req.body.category ?? req.body.categoryId ?? req.body.category_ID ?? req.body.category_id;
        async function resolveCategory(raw){
            if(!raw || String(raw).trim() === '') return null;
            if(isId(raw)){
                const rows = await query('SELECT ID FROM category WHERE ID = ? LIMIT 1', [Number(raw)]);
                if(!rows || !rows.length) throw new Error('category_not_found');
                return rows[0].ID;
            }
            const name = String(raw).trim();
            const rows = await query('SELECT ID FROM category WHERE LOWER(Name) = LOWER(?) LIMIT 1', [name]);
            if(rows && rows.length) return rows[0].ID;
            const [ins] = await db.query('INSERT INTO category (Name) VALUES (?)', [name]);
            return ins.insertId;
        }
        let categoryId = null;
        try { categoryId = await resolveCategory(categoryRaw); } catch(errCat){ if(errCat.message === 'category_not_found') return res.status(400).json({ success:false, message:'Category not found' }); throw errCat; }
        const sql = `INSERT INTO events (Title, description, location, start_time, end_date, Category_ID, University_ID, Faculty_ID, Department_ID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const params = [ title, description || null, location || null, start.toISOString().slice(0,19).replace('T',' '), end.toISOString().slice(0,19).replace('T',' '), categoryId, universityId, facultyId, departmentId ];
        const [insRes] = await db.query(sql, params);
        return res.status(201).json({ success: true, id: insRes.insertId });
    } catch (err) { return next(err); }
});

// POST /admin/announcements
// Create an announcement linked to university/faculty/department (lookup by names).
// Body: { title, description, university: '<name>', faculty?: '<name>', department?: '<name>' }
// Response: 201 { success: true, id }
// Validation errors return 400; other errors forwarded to next(err).
router.post('/admin/announcements', async (req, res, next) => {
    try {
        const uniRaw = req.body.university ?? req.body.University;
        const facRaw = req.body.faculty ?? req.body.Faculty;
        const depRaw = req.body.department ?? req.body.Department;
        const { title, description } = req.body;
        if (!title || String(title).trim() === '') return res.status(400).json({ success:false, message:'title is required' });
        if (!uniRaw || String(uniRaw).trim() === '') return res.status(400).json({ success:false, message:'university (name) is required' });
        const isId = v => v != null && String(v).match(/^\d+$/);
        if (isId(uniRaw)) return res.status(400).json({ success:false, message:'university must be provided as a name string (no numeric id)' });
        const uniRows = await query('SELECT ID FROM university WHERE LOWER(Name) = LOWER(?) LIMIT 1', [String(uniRaw).trim()]);
        if (!uniRows || !uniRows.length) return res.status(400).json({ success:false, message:'University not found' });
        const universityId = uniRows[0].ID;
        let facultyId = null;
        if (facRaw && String(facRaw).trim() !== ''){
            const facRows = await query('SELECT ID FROM faculty WHERE LOWER(Name) = LOWER(?) AND University_ID = ? LIMIT 1', [String(facRaw).trim(), universityId]);
            if (!facRows || !facRows.length) return res.status(400).json({ success:false, message:'Faculty not found for this university' });
            facultyId = facRows[0].ID;
        }
        let departmentId = null;
        if (depRaw && String(depRaw).trim() !== ''){
            if (!facultyId) return res.status(400).json({ success:false, message:'Department provided but faculty is missing' });
            const depRows = await query('SELECT ID FROM department WHERE LOWER(Name) = LOWER(?) AND Faculty_ID = ? LIMIT 1', [String(depRaw).trim(), facultyId]);
            if (!depRows || !depRows.length) return res.status(400).json({ success:false, message:'Department not found for this faculty' });
            departmentId = depRows[0].ID;
        }
        const sql = 'INSERT INTO announcement (Title, description, university_ID, faculty_ID, Department_ID) VALUES (?, ?, ?, ?, ?)';
        const params = [ String(title).trim(), description || null, universityId, facultyId, departmentId ];
        const [result] = await db.query(sql, params);
        return res.status(201).json({ success:true, id: result.insertId });
    } catch (err) { return next(err); }
});

// PUT /admin/universities/:id
// Update a university record by id.
// Body accepts: { name, location?, website?, email?, phone? } (also accepts Name/Location/Website/Email/Contact aliases)
// Response: { success: true, rowsAffected: 1 }
// Validation errors return 400; other errors forwarded to next(err).
router.put('/admin/universities/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id || 0);
        if (!id) return res.status(400).json({ success: false, message: 'Invalid university id' });
        const name = (req.body.name ?? req.body.Name ?? '').trim();
        const location = req.body.location ?? req.body.Location ?? null;
        const website = req.body.website ?? req.body.Website ?? null;
        const emailVal = req.body.email ?? req.body.Email ?? null;
        const contactVal = req.body.phone ?? req.body.contact ?? req.body.Contact ?? null;
        await db.query('UPDATE university SET Name = ?, Location = ?, Website = ?, Email = ?, Contact = ? WHERE ID = ?', [name, location, website, emailVal, contactVal, id]);
        return res.json({ success: true, rowsAffected: 1 });
    } catch (err) { return next(err); }
});

// DELETE /admin/universities/:id
// Delete a university by id.
// Response: { success: true, rowsAffected: 1 }
// Validation errors return 400; other errors forwarded to next(err).
router.delete('/admin/universities/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id || 0);
        if (!id) return res.status(400).json({ success: false, message: 'Invalid university id' });
        await db.query('DELETE FROM university WHERE ID = ?', [id]);
        return res.json({ success: true, rowsAffected: 1 });
    } catch (err) { return next(err); }
});

// PUT /admin/faculties/:id
// Update a faculty record by id. Body: { name, email?, phone? }
// Response: { success: true, rowsAffected: 1 }
// Validation errors return 400; other errors forwarded to next(err).
router.put('/admin/faculties/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id || 0);
        if (!id) return res.status(400).json({ success: false, message: 'Invalid faculty id' });
        const name = (req.body.name ?? req.body.Name ?? '').trim();
        const emailVal = req.body.email ?? req.body.Email ?? null;
        const phoneVal = req.body.phone ?? req.body.Phone ?? null;
        await db.query('UPDATE faculty SET Name = ?, Email = ?, Phone = ? WHERE ID = ?', [name, emailVal, phoneVal, id]);
        return res.json({ success: true, rowsAffected: 1 });
    } catch (err) { return next(err); }
});

// DELETE /admin/faculties/:id
// Delete a faculty by id.
// Response: { success: true, rowsAffected: 1 }
// Validation errors return 400; other errors forwarded to next(err).
router.delete('/admin/faculties/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id || 0);
        if (!id) return res.status(400).json({ success: false, message: 'Invalid faculty id' });
        await db.query('DELETE FROM faculty WHERE ID = ?', [id]);
        return res.json({ success: true, rowsAffected: 1 });
    } catch (err) { return next(err); }
});

// PUT /admin/departments/:id
// Update a department record by id. Body: { name, email?, phone? }
// Response: { success: true, rowsAffected: 1 }
// Validation errors return 400; other errors forwarded to next(err).
router.put('/admin/departments/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id || 0);
        if (!id) return res.status(400).json({ success: false, message: 'Invalid department id' });
        const name = (req.body.name ?? req.body.Name ?? '').trim();
        const emailVal = req.body.email ?? req.body.Email ?? null;
        const phoneVal = req.body.phone ?? req.body.Phone ?? null;
        await db.query('UPDATE department SET Name = ?, Email = ?, Phone = ? WHERE ID = ?', [name, emailVal, phoneVal, id]);
        return res.json({ success: true, rowsAffected: 1 });
    } catch (err) { return next(err); }
});

// DELETE /admin/departments/:id
// Delete a department by id.
// Response: { success: true, rowsAffected: 1 }
// Validation errors return 400; other errors forwarded to next(err).
router.delete('/admin/departments/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id || 0);
        if (!id) return res.status(400).json({ success: false, message: 'Invalid department id' });
        await db.query('DELETE FROM department WHERE ID = ?', [id]);
        return res.json({ success: true, rowsAffected: 1 });
    } catch (err) { return next(err); }
});

module.exports = router;
