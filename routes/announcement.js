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

module.exports = router;
