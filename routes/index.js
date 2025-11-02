const express = require('express')
const db = require('../db')
const router = express.Router()

router.get('/', async (req,res, next) => {
    try {
        const sql = `SELECT e.ID as id, e.Title as title, e.description as description, e.location as location, e.start_time as start_time, e.end_time as end_time, c.Name as tag, u.Name as university, f.Name as faculty, d.Name as department
                     FROM events e
                     LEFT JOIN category c ON e.category_ID = c.ID
                     LEFT JOIN university u ON e.university_ID = u.ID
                     LEFT JOIN faculty f ON e.faculty_ID = f.ID
                     LEFT JOIN department d ON e.Department_ID = d.ID
                     ORDER BY e.start_time DESC
                     LIMIT 3`;

        const [rows] = await db.query(sql);
        const events = (rows || []).map(r => {
            let dateStr = '';
            let timeStr = '';
            try{
                if(r.start_time){
                    const s = new Date(r.start_time);
                    dateStr = isNaN(s) ? '' : s.toISOString().slice(0,10);
                }
                if(r.start_time && r.end_time){
                    const s = new Date(r.start_time);
                    const e = new Date(r.end_time);
                    if(!isNaN(s) && !isNaN(e)){
                        const pad = n => String(n).padStart(2,'0');
                        timeStr = pad(s.getHours()) + ':' + pad(s.getMinutes()) + ' - ' + pad(e.getHours()) + ':' + pad(e.getMinutes());
                    }
                }
            }catch(ex){ }

            return {
                id: r.id,
                tag: r.tag || '',
                university: r.university || '',
                title: r.title || '',
                date: dateStr,
                time: timeStr,
                location: r.location || '',
                interested: r.interested || undefined,
                description: r.description || '',
                faculty: r.faculty || null,
                department: r.department || null
            };
        });

            // fetch latest announcements (limit 3) to show on the index page
            const annSql = `SELECT a.ID as id, a.Title as title, a.description as description, u.Name as university, f.Name as faculty, d.Name as department
                            FROM announcement a
                            LEFT JOIN university u ON a.university_ID = u.ID
                            LEFT JOIN faculty f ON a.faculty_ID = f.ID
                            LEFT JOIN department d ON a.Department_ID = d.ID
                            ORDER BY a.ID DESC`;
        
            const [annrows] = await db.query(annSql);
            const announcements = (annrows || []).map(r => ({
                id: r.id,
                university: r.university || '',
                faculty: r.faculty || '',
                department: r.department || '',
                title: r.title || '',
                description: r.description || ''
            }));

            return res.render('index', {title:'Index', events, announcements});
    } catch (err) { return next(err); }
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

module.exports = router