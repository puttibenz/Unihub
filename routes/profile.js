const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/profile', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }

    const userId = req.session.user.id;

    // Fetch events the user has registered for from register table joined to events
    const sql = `SELECT r.User_ID as user_id, r.Event_ID as event_id, r.Status as status,
                        e.ID as id, e.Title as title, e.description as description, e.location as location, e.start_time as start_time, e.end_time as end_time,
                        u.Name as university
                 FROM register r
                 LEFT JOIN events e ON r.Event_ID = e.ID
                 LEFT JOIN university u ON e.university_ID = u.ID
                 WHERE r.User_ID = ? AND (r.Status = 'joined' OR r.Status IS NULL)
                 ORDER BY e.start_time DESC`;

    db.query(sql, [userId], (err, rows) => {
        if (err) {
            console.error('Error querying registered events for /profile page:', err);
            // render profile with empty registeredEvents on error
            return res.render('profile', { title: 'Profile', user: req.session.user, registeredEvents: [] });
        }

        const thaiMonths = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
        const registeredEvents = (rows || []).map(r => {
            let dateStr = '';
            let timeStr = '';
            try {
                if (r.start_time) {
                    const s = new Date(r.start_time);
                    if (!isNaN(s)) {
                        const day = s.getDate();
                        const month = thaiMonths[s.getMonth()] || '';
                        const year = s.getFullYear();
                        dateStr = `${day} ${month} ${year}`;
                    }
                }
                if (r.start_time && r.end_time) {
                    const s = new Date(r.start_time);
                    const e = new Date(r.end_time);
                    if (!isNaN(s) && !isNaN(e)) {
                        const pad = n => String(n).padStart(2,'0');
                        timeStr = pad(s.getHours()) + ':' + pad(s.getMinutes()) + ' - ' + pad(e.getHours()) + ':' + pad(e.getMinutes());
                    }
                }
            } catch (ex) { }

            return {
                // event id may be in e.ID (r.id) or fallback to the register table Event_ID
                id: r.id || r.event_id || r.Event_ID || null,
                title: r.title || '',
                university: r.university || '',
                date: dateStr,
                time: timeStr,
                location: r.location || '',
                description: r.description || '',
                status: r.status || ''
            };
        });

        return res.render('profile', { title: 'Profile', user: req.session.user, registeredEvents });
    });
});

module.exports = router;
