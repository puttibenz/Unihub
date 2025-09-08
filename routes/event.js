const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db'); // Assuming db connection is in a separate file
const router = express.Router();

// Route: หน้าแสดงกิจกรรม
router.get('/event', (req, res) => {
    // fetch events from DB and render the event page
    const sql = `SELECT e.ID as id, e.Title as title, e.description as description, e.location as location, e.start_time as start_time, e.end_date as end_time, c.Name as tag, u.Name as university, f.Name as faculty, d.Name as department
                 FROM events e
                 LEFT JOIN category c ON e.category_ID = c.ID
                 LEFT JOIN university u ON e.university_ID = u.ID
                 LEFT JOIN faculty f ON e.faculty_ID = f.ID
                 LEFT JOIN department d ON e.Department_ID = d.ID
                 ORDER BY e.start_time DESC`;

    db.query(sql, (err, rows) => {
        if (err) {
            console.error('Error querying events for /event page:', err);
            // fallback to empty list so the page still renders
            return res.render('event', { title: 'Event', events: [] });
        }

        const events = (rows || []).map(r => {
            // compute date and time strings the template expects
            let dateStr = '';
            let timeStr = '';
            try{
                if(r.start_time){
                    const s = new Date(r.start_time);
                    dateStr = isNaN(s) ? '' : s.toISOString().slice(0,10); // YYYY-MM-DD
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

        return res.render('event', { title: 'Event', events });
    });
});

module.exports = router;
