const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const dbHelpers = require('./dbHelpers');
const router = express.Router();

// Route: หน้าแสดงกิจกรรม
router.get('/event', async (req, res, next) => {
    try {
    const rows = await dbHelpers.listEvents(100);
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
                title: r.title || '',
                uniAbbreviation: r.Abbreviation || '',
                date: dateStr,
                time: timeStr,
                location: r.location || '',
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
        const result = await dbHelpers.unregisterUserFromEvent(userId, eventId);
        if (req.headers && req.headers.accept && req.headers.accept.indexOf('application/json') !== -1) {
            return res.json({ success: true, action: result.action });
        }
        return res.redirect('/profile');
    } catch (err) {
        console.error('Error updating register status:', err);
        if (req.headers && req.headers.accept && req.headers.accept.indexOf('application/json') !== -1) {
            return res.status(500).json({ success: false, message: err.message || 'Database error' });
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

        try {
            const r = await dbHelpers.registerUserToEvent(userId, eventId);
            if (req.headers && req.headers.accept && req.headers.accept.indexOf('application/json') !== -1) {
                return res.status(201).json({ success: true, id: r.id, scope: r.scope });
            }
            return res.redirect('/profile');
        } catch (err) {
            if (err && err.message === 'already_registered') return res.status(409).json({ success: false, message: 'Already registered' });
            if (err && err.message === 'event_not_found') return res.status(404).json({ success: false, message: 'Event not found' });
            throw err;
        }
    } catch (err) {
        console.error('DB error in /event/register:', err);
        return next(err);
    }
});

module.exports = router;
