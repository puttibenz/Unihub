const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/announcement', async (req, res, next) => {
    try {
        const sql = `SELECT a.ID as id, a.Title as title, a.description as description, u.Name as university, f.Name as faculty, d.Name as department
                     FROM announcement a
                     LEFT JOIN university u ON a.university_ID = u.ID
                     LEFT JOIN faculty f ON a.faculty_ID = f.ID
                     LEFT JOIN department d ON a.Department_ID = d.ID
                     ORDER BY a.ID DESC`;

        const [rows] = await db.query(sql);
        const announcements = (rows || []).map(r => ({
            id: r.id,
            university: r.university || '',
            faculty: r.faculty || '',
            department: r.department || '',
            title: r.title || '',
            description: r.description || ''
        }));

        return res.render('announcement', { title: 'Announcement', announcements });
    } catch (err) {
        console.error('DB error fetching announcements:', err);
        return next(err);
    }
});

// GET /announcement/:id - return announcement JSON (used by modal)
router.get('/announcement/:id', async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
        const sql = `SELECT a.ID as id, a.Title as title, a.description as description, u.Name as university, f.Name as faculty, d.Name as department
                     FROM announcement a
                     LEFT JOIN university u ON a.university_ID = u.ID
                     LEFT JOIN faculty f ON a.faculty_ID = f.ID
                     LEFT JOIN department d ON a.Department_ID = d.ID
                     WHERE a.ID = ? LIMIT 1`;
        const [rows] = await db.query(sql, [id]);
        if (!rows || rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
        const r = rows[0] || {};
        const announcement = {
            id: r.id,
            title: r.title || '',
            description: r.description || '',
            university: r.university || '',
            faculty: r.faculty || '',
            department: r.department || ''
        };
        return res.json({ success: true, announcement });
    } catch (err) {
        console.error('Error fetching announcement by id:', err);
        return next(err);
    }
});

module.exports = router;
