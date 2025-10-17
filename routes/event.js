const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db'); // Assuming db connection is in a separate file
const router = express.Router();

// Route: หน้าแสดงกิจกรรม
router.get('/event', (req, res) => {
    // fetch events from DB and render the event page
    const sql = `SELECT e.ID as id, e.Title as title, e.description as description, e.location as location, e.start_time as start_time, e.end_time as end_time, c.Name as tag, u.Name as university, f.Name as faculty, d.Name as department
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

// shared unregister logic used by both PATCH (preferred) and POST (fallback for non-JS forms)
function performUnregister(userId, eventId, req, res) {
    // Soft-delete pattern: update Status -> 'cancelled' and set cancelled_at
    const updateSql = `UPDATE register SET Status = 'cancelled', cancelled_at = NOW() WHERE User_ID = ? AND Event_ID = ? AND (Status = 'joined' OR Status IS NULL)`;
    db.query(updateSql, [userId, eventId], (err, result) => {
        if (err) {
            console.error('Error updating register status:', err);
            if (req.headers && req.headers.accept && req.headers.accept.indexOf('application/json') !== -1) {
                return res.status(500).json({ success: false, message: 'Database error' });
            }
            return res.redirect('/profile');
        }
        // if no rows were affected (older rows or different status), try deleting as fallback
        if (!result || result.affectedRows === 0) {
            const delSql = `DELETE FROM register WHERE User_ID = ? AND Event_ID = ?`;
            db.query(delSql, [userId, eventId], (err2, res2) => {
                if (err2) {
                    console.error('Error deleting register fallback:', err2);
                    if (req.headers && req.headers.accept && req.headers.accept.indexOf('application/json') !== -1) {
                        return res.status(500).json({ success: false, message: 'Database error' });
                    }
                    return res.redirect('/profile');
                }
                if (req.headers && req.headers.accept && req.headers.accept.indexOf('application/json') !== -1) {
                    return res.json({ success: true, action: 'deleted' });
                }
                return res.redirect('/profile');
            });
        } else {
            if (req.headers && req.headers.accept && req.headers.accept.indexOf('application/json') !== -1) {
                return res.json({ success: true, action: 'updated' });
            }
            return res.redirect('/profile');
        }
    });
}

// PATCH /event/unregister/:id - preferred endpoint for AJAX and RESTful update (soft-delete)
router.patch('/event/unregister/:id', (req, res) => {
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
    performUnregister(userId, eventId, req, res);
});

// POST /event/register - register current user to an event
router.post('/event/register', (req, res) => {
    if (!req.session || !req.session.user) {
        // if AJAX expect JSON, else redirect to login
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

    // ensure event exists and has a University_ID (every event must have a university)
    db.query('SELECT ID, University_ID FROM events WHERE ID = ? LIMIT 1', [eventId], (errE, evRows) => {
        if (errE) {
            console.error('DB error checking event:', errE);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        if (!evRows || evRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }
        const ev = evRows[0];
        if (!ev.University_ID) {
            return res.status(400).json({ success: false, message: 'Event must be associated with a university' });
        }

        // prevent duplicate registration
        db.query('SELECT * FROM register WHERE User_ID = ? AND Event_ID = ? LIMIT 1', [userId, eventId], (errS, sRows) => {
            if (errS) {
                console.error('DB error checking existing registration:', errS);
                return res.status(500).json({ success: false, message: 'Database error' });
            }
            if (sRows && sRows.length > 0) {
                // already registered
                return res.status(409).json({ success: false, message: 'Already registered' });
            }

            // insert registration, default status = 'joined' (or adjust as needed)
            db.query('INSERT INTO register (User_ID, Event_ID, Status) VALUES (?, ?, ?)', [userId, eventId, 'joined'], (errI, result) => {
                if (errI) {
                    console.error('DB error inserting registration:', errI);
                    return res.status(500).json({ success: false, message: 'Database error' });
                }

                // Respond: if request came from a form redirect back to event or profile; if AJAX return JSON
                if (req.headers && req.headers.accept && req.headers.accept.indexOf('application/json') !== -1) {
                    return res.status(201).json({ success: true, id: result.insertId });
                }
                return res.redirect('/profile');
            });
        });
    });
});

module.exports = router;
