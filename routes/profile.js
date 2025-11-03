const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/profile', async (req, res, next) => {
    try {
        if (!req.session.user) {
            return res.redirect('/auth/login');
        }

        const userId = req.session.user.id;
     // New schema: registrations and events are split by scope (_department/_faculty/_university).
     // Query all three register_* tables and join to their corresponding event_* tables, then normalize.
     const sql = `
         SELECT r.User_ID as user_id, r.Event_ID as event_id, r.Status as status,
             e.Event_ID as id, e.Title as title, e.Description as description, e.Location as location, e.Start_time as start_time, e.End_time as end_time,
             u.Name as university
         FROM Register_department r
         LEFT JOIN event_department e ON r.Event_ID = e.Event_ID
         LEFT JOIN department d ON e.Department_ID = d.ID
         LEFT JOIN faculty f ON d.Faculty_ID = f.ID
         LEFT JOIN university u ON f.University_ID = u.ID
         WHERE r.User_ID = ? AND (r.Status = 'joined' OR r.Status IS NULL)

         UNION ALL

         SELECT r.User_ID as user_id, r.Event_ID as event_id, r.Status as status,
             e.Event_ID as id, e.Title as title, e.Description as description, e.Location as location, e.Start_time as start_time, e.End_time as end_time,
             u.Name as university
         FROM Register_faculty r
         LEFT JOIN event_faculty e ON r.Event_ID = e.Event_ID
         LEFT JOIN faculty f ON e.Faculty_ID = f.ID
         LEFT JOIN university u ON f.University_ID = u.ID
         WHERE r.User_ID = ? AND (r.Status = 'joined' OR r.Status IS NULL)

         UNION ALL

         SELECT r.User_ID as user_id, r.Event_ID as event_id, r.Status as status,
             e.Event_ID as id, e.Title as title, e.Description as description, e.Location as location, e.Start_time as start_time, e.End_time as end_time,
             u.Name as university
         FROM Register_university r
         LEFT JOIN event_university e ON r.Event_ID = e.Event_ID
         LEFT JOIN university u ON e.University_ID = u.ID
         WHERE r.User_ID = ? AND (r.Status = 'joined' OR r.Status IS NULL)

         ORDER BY start_time DESC
     `;

     const [rows] = await db.query(sql, [userId, userId, userId]);

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
    } catch (err) {
        console.error('Error querying registered events for /profile page:', err);
        return next(err);
    }
});

// PUT /profile - accept PUT as an alternative to PATCH for full/partial updates
router.put('/profile', async (req, res, next) => {
    try {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }
        const userId = req.session.user.id;
        const { first_name, last_name, email, phone, school_name } = req.body || {};
        const isProvided = v => (v !== undefined) && (typeof v !== 'string' || v.trim() !== '');
        if (!isProvided(first_name) && !isProvided(last_name) && !isProvided(email) && !isProvided(phone) && !isProvided(school_name)) {
            return res.status(400).json({ success: false, message: 'No data to update' });
        }

        const fields = [];
        const params = [];
        if (isProvided(first_name)) { fields.push('first_name = ?'); params.push(first_name.trim ? first_name.trim() : first_name); }
        if (isProvided(last_name)) { fields.push('last_name = ?'); params.push(last_name.trim ? last_name.trim() : last_name); }
        if (isProvided(email)) { fields.push('email = ?'); params.push(email.trim ? email.trim() : email); }
        if (isProvided(phone)) { fields.push('phone_number = ?'); params.push(phone.trim ? phone.trim() : phone); }
        if (isProvided(school_name)) { fields.push('school_name = ?'); params.push(school_name.trim ? school_name.trim() : school_name); }
        if (fields.length === 0) return res.status(400).json({ success: false, message: 'No valid fields' });
        const sql = `UPDATE users SET ${fields.join(', ')} WHERE ID = ?`;
        params.push(userId);

        await db.query(sql, params);
        if (!req.session.user) req.session.user = {};
        if (isProvided(first_name)) req.session.user.first_name = first_name.trim ? first_name.trim() : first_name;
        if (isProvided(last_name)) req.session.user.last_name = last_name.trim ? last_name.trim() : last_name;
        if (isProvided(email)) req.session.user.email = email.trim ? email.trim() : email;
        if (isProvided(phone)) req.session.user.phone = phone.trim ? phone.trim() : phone;
        if (isProvided(school_name)) req.session.user.school_name = school_name.trim ? school_name.trim() : school_name;

        return res.json({ success: true });
    } catch (err) {
        console.error('Error updating user profile (PUT):', err);
        return next(err);
    }
});

module.exports = router;
