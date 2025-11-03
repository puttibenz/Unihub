const express = require('express')
const db = require('../db')
const dbHelpers = require('./dbHelpers');
const router = express.Router()

router.get('/', async (req,res, next) => {
    try {
        // fetch events from scope-specific tables via helper (normalized rows)
        const rows = await dbHelpers.listEvents(3);
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
                uniAbbreviation: r.abbreviation || '',
                date: dateStr,
                time: timeStr,
                location: r.location || '',
                description: r.description || '',
                category: r.category || '',
                faculty: r.faculty || null,
                department: r.department || null
            };
        });

        // fetch latest 3 announcements using helpers
        const annRows = await dbHelpers.listLatestAnnouncements(3);
        const announcements = (annRows || []).map(r => ({ id: r.id, scope: r.scope, title: r.title || '', description: r.description || '', university: r.university || '', faculty: r.faculty || '', department: r.department || '' }));

        return res.render('index', {title:'Index', events, announcements});
    } catch (err) { return next(err); }
});

module.exports = router