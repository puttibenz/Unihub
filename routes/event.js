const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const router = express.Router();

// Route: หน้าแสดงกิจกรรม
router.get('/event', async (req, res, next) => {
    try {
        const sql = `SELECT e.ID as id, e.Title as title, e.description as description, e.location as location, e.start_time as start_time, e.end_time as end_time, c.Name as tag, u.Name as university, f.Name as faculty, d.Name as department
                     FROM events e
                     LEFT JOIN category c ON e.category_ID = c.ID
                     LEFT JOIN university u ON e.university_ID = u.ID
                     LEFT JOIN faculty f ON e.faculty_ID = f.ID
                     LEFT JOIN department d ON e.Department_ID = d.ID
                     ORDER BY e.start_time DESC`;

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

        return res.render('event', { title: 'Event', events });
    } catch (err) {
        console.error('Error querying events for /event page:', err);
        return next(err);
    }
});

// shared unregister logic used by both PATCH (preferred) and POST (fallback for non-JS forms)
async function performUnregister(userId, eventId, req, res, next) {
    try {
        const updateSql = `UPDATE register SET Status = 'cancelled', cancelled_at = NOW() WHERE User_ID = ? AND Event_ID = ? AND (Status = 'joined' OR Status IS NULL)`;
        const [result] = await db.query(updateSql, [userId, eventId]);
        if (!result || result.affectedRows === 0) {
            const delSql = `DELETE FROM register WHERE User_ID = ? AND Event_ID = ?`;
            const [delRes] = await db.query(delSql, [userId, eventId]);
            if (req.headers && req.headers.accept && req.headers.accept.indexOf('application/json') !== -1) {
                return res.json({ success: true, action: 'deleted' });
            }
            return res.redirect('/profile');
        }
        if (req.headers && req.headers.accept && req.headers.accept.indexOf('application/json') !== -1) {
            return res.json({ success: true, action: 'updated' });
        }
        return res.redirect('/profile');
    } catch (err) {
        console.error('Error updating register status:', err);
        if (req.headers && req.headers.accept && req.headers.accept.indexOf('application/json') !== -1) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        return next(err);
    }
}

// PATCH /event/unregister/:id - preferred endpoint for AJAX and RESTful update (soft-delete)
router.patch('/event/unregister/:id', async (req, res, next) => {
    try {
        if (!req.session || !req.session.user) {
            if (req.headers && req.headers.accept && req.headers.accept.indexOf('application/json') !== -1) {
                return res.status(401).json({ success: false, message: 'Not authenticated' });
            }
            return res.redirect('/auth/login');
        }
        const userId = req.session.user.id;
        const eventId = req.params && req.params.id;
        if (!eventId) {
            if (req.headers && req.headers.accept && req.headers.accept.indexOf('application/json') !== -1) {
                return res.status(400).json({ success: false, message: 'eventId is required' });
            }
            return res.redirect('/profile');
        }
        await performUnregister(userId, eventId, req, res, next);
    } catch (err) {
        return next(err);
    }
});

// POST /event/register - register current user to an event
router.post('/event/register', async (req, res, next) => {
    try {
        if (!req.session || !req.session.user) {
            if (req.headers && req.headers.accept && req.headers.accept.indexOf('application/json') !== -1) {
                return res.status(401).json({ success: false, message: 'Not authenticated' });
            }
            return res.redirect('/auth/login');
        }

        const userId = req.session.user.id;
        const eventId = req.body && (req.body.eventId || req.body.event_id || req.body.ID || req.body.id);
        if (!eventId) {
            return res.status(400).json({ success: false, message: 'eventId is required' });
        }

        const [evRows] = await db.query('SELECT ID, University_ID FROM events WHERE ID = ? LIMIT 1', [eventId]);
        if (!evRows || evRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }
        const ev = evRows[0];
        if (!ev.University_ID) {
            return res.status(400).json({ success: false, message: 'Event must be associated with a university' });
        }

        const [sRows] = await db.query('SELECT * FROM register WHERE User_ID = ? AND Event_ID = ? LIMIT 1', [userId, eventId]);
        if (sRows && sRows.length > 0) {
            return res.status(409).json({ success: false, message: 'Already registered' });
        }

        const [result] = await db.query('INSERT INTO register (User_ID, Event_ID, Status) VALUES (?, ?, ?)', [userId, eventId, 'joined']);
        if (req.headers && req.headers.accept && req.headers.accept.indexOf('application/json') !== -1) {
            return res.status(201).json({ success: true, id: result.insertId });
        }
        return res.redirect('/profile');
    } catch (err) {
        console.error('DB error in /event/register:', err);
        return next(err);
    }
});

module.exports = router;
