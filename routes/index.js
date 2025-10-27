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

        return res.render('index', {title:'Index', events});
    } catch (err) { return next(err); }
});

module.exports = router