const express = require('express');
const router = express.Router();
const dbHelpers = require('./dbHelpers');

router.get('/announcement', async (req, res, next) => {
    try {
        const rows = await dbHelpers.listLatestAnnouncements(100);
        const announcements = (rows || []).map(r => ({ id: r.id, scope: r.scope, title: r.title || '', description: r.description || '', university: r.university || '', faculty: r.faculty || '', department: r.department || '' }));
        return res.render('announcement', { title: 'Announcement', announcements });
    } catch (err) {
        console.error('DB error fetching announcements:', err);
        return next(err);
    }
});

// GET /announcement/:id - return announcement JSON (used by modal)
router.get('/announcement/:id', async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
        // accept optional scope query param to disambiguate IDs that may overlap across tables
        const scope = req.query.scope || null;
        const r = await dbHelpers.getAnnouncementById(id, scope);
        if (!r) return res.status(404).json({ success: false, message: 'Not found' });
        const announcement = { id: r.id, title: r.title || '', content: r.content || '', university: r.university || '', faculty: r.faculty || '', department: r.department || '' };
        return res.json({ success: true, announcement });
    } catch (err) {
        console.error('Error fetching announcement by id:', err);
        return next(err);
    }
});

module.exports = router;
