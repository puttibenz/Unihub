const db = require('../db');

async function listLatestAnnouncements(limit = 10) {
    const sql = `
        SELECT scope, id, title, content, university, faculty, department, created_at FROM (
            SELECT 'department' AS scope, a.ID as id, a.Title as title, a.Content as content, u.Name as university, f.Name as faculty, d.Name as department, a.Post_Date as created_at
            FROM announcement_department a
            LEFT JOIN department d ON a.Department_ID = d.ID
            LEFT JOIN faculty f ON d.Faculty_ID = f.ID
            LEFT JOIN university u ON f.University_ID = u.ID
            UNION ALL
            SELECT 'faculty' AS scope, a.ID as id, a.Title as title, a.Content as content, u.Name as university, f.Name as faculty, NULL as department, a.Post_Date as created_at
            FROM announcement_faculty a
            LEFT JOIN faculty f ON a.Faculty_ID = f.ID
            LEFT JOIN university u ON f.University_ID = u.ID
            UNION ALL
            SELECT 'university' AS scope, a.ID as id, a.Title as title, a.Content as content, u.Name as university, NULL as faculty, NULL as department, a.Post_Date as created_at
            FROM announcement_university a
            LEFT JOIN university u ON a.University_ID = u.ID
        ) x
        ORDER BY created_at DESC
        LIMIT ?
    `;
    const [rows] = await db.query(sql, [limit]);
    return rows || [];
}

async function getAnnouncementById(id) {
    const sql = `
        SELECT scope, id, title, content, university, faculty, department FROM (
            SELECT 'department' AS scope, a.ID as id, a.Title as title, a.Content as content, u.Name as university, f.Name as faculty, d.Name as department
            FROM announcement_department a
            LEFT JOIN department d ON a.Department_ID = d.ID
            LEFT JOIN faculty f ON d.Faculty_ID = f.ID
            LEFT JOIN university u ON f.University_ID = u.ID
            WHERE a.ID = ?
            UNION ALL
            SELECT 'faculty' AS scope, a.ID as id, a.Title as title, a.Content as content, u.Name as university, f.Name as faculty, NULL as department
            FROM announcement_faculty a
            LEFT JOIN faculty f ON a.Faculty_ID = f.ID
            LEFT JOIN university u ON f.University_ID = u.ID
            WHERE a.ID = ?
            UNION ALL
            SELECT 'university' AS scope, a.ID as id, a.Title as title, a.Content as content, u.Name as university, NULL as faculty, NULL as department
            FROM announcement_university a
            LEFT JOIN university u ON a.University_ID = u.ID
            WHERE a.ID = ?
        ) x LIMIT 1
    `;
    const [rows] = await db.query(sql, [id, id, id]);
    return (rows && rows[0]) || null;
}

async function listEvents(limit = 100) {
    const sql = `
        SELECT scope, id, title, description, location, start_time, end_time, category, abbreviation, faculty, department FROM (
            SELECT 'department' AS scope, e.Event_ID as id, e.Title as title, e.Description as description, e.Location as location, e.Start_time as start_time, e.End_time as end_time, c.Name as category, COALESCE(u.Abbreviation, u.Name) as abbreviation, f.Name as faculty, d.Name as department
            FROM event_department e
            LEFT JOIN category c ON e.Category_ID = c.ID
            LEFT JOIN department d ON e.Department_ID = d.ID
            LEFT JOIN faculty f ON d.Faculty_ID = f.ID
            LEFT JOIN university u ON f.University_ID = u.ID
            UNION ALL
            SELECT 'faculty' AS scope, e.Event_ID as id, e.Title as title, e.Description as description, e.Location as location, e.Start_time as start_time, e.End_time as end_time, c.Name as category, COALESCE(u.Abbreviation, u.Name) as abbreviation, f.Name as faculty, NULL as department
            FROM event_faculty e
            LEFT JOIN category c ON e.Category_ID = c.ID
            LEFT JOIN faculty f ON e.Faculty_ID = f.ID
            LEFT JOIN university u ON f.University_ID = u.ID
            UNION ALL
            SELECT 'university' AS scope, e.Event_ID as id, e.Title as title, e.Description as description, e.Location as location, e.Start_time as start_time, e.End_time as end_time, c.Name as category, COALESCE(u.Abbreviation, u.Name) as abbreviation, NULL as faculty, NULL as department
            FROM event_university e
            LEFT JOIN category c ON e.Category_ID = c.ID
            LEFT JOIN university u ON e.University_ID = u.ID
        ) x
        ORDER BY start_time DESC
        LIMIT ?
    `;
    const [rows] = await db.query(sql, [limit]);
    return rows || [];
}

async function getEventById(id) {
    const sql = `
        SELECT scope, id, title, description, location, start_time, end_time, category, university, faculty, department FROM (
            SELECT 'department' AS scope, e.Event_ID as id, e.Title as title, e.Description as description, e.Location as location, e.Start_time as start_time, e.End_time as end_time, c.Name as category, u.Name as university, f.Name as faculty, d.Name as department
            FROM event_department e
            LEFT JOIN category c ON e.Category_ID = c.ID
            LEFT JOIN department d ON e.Department_ID = d.ID
            LEFT JOIN faculty f ON d.Faculty_ID = f.ID
            LEFT JOIN university u ON f.University_ID = u.ID
            WHERE e.Event_ID = ?
            UNION ALL
            SELECT 'faculty' AS scope, e.Event_ID as id, e.Title as title, e.Description as description, e.Location as location, e.Start_time as start_time, e.End_time as end_time, c.Name as category, u.Name as university, f.Name as faculty, NULL as department
            FROM event_faculty e
            LEFT JOIN category c ON e.Category_ID = c.ID
            LEFT JOIN faculty f ON e.Faculty_ID = f.ID
            LEFT JOIN university u ON f.University_ID = u.ID
            WHERE e.Event_ID = ?
            UNION ALL
            SELECT 'university' AS scope, e.Event_ID as id, e.Title as title, e.Description as description, e.Location as location, e.Start_time as start_time, e.End_time as end_time, c.Name as category, u.Name as university, NULL as faculty, NULL as department
            FROM event_university e
            LEFT JOIN category c ON e.Category_ID = c.ID
            LEFT JOIN university u ON e.University_ID = u.ID
            WHERE e.Event_ID = ?
        ) x LIMIT 1
    `;
    const [rows] = await db.query(sql, [id, id, id]);
    return (rows && rows[0]) || null;
}

// Helpers for registration: detect scope for event id and perform register/unregister on the corresponding register table
async function findEventScope(id) {
    // check department
    let [rows] = await db.query('SELECT Event_ID FROM event_department WHERE Event_ID = ? LIMIT 1', [id]);
    if (rows && rows.length) return 'department';
    [rows] = await db.query('SELECT Event_ID FROM event_faculty WHERE Event_ID = ? LIMIT 1', [id]);
    if (rows && rows.length) return 'faculty';
    [rows] = await db.query('SELECT Event_ID FROM event_university WHERE Event_ID = ? LIMIT 1', [id]);
    if (rows && rows.length) return 'university';
    return null;
}

async function registerUserToEvent(userId, eventId) {
    const scope = await findEventScope(eventId);
    if (!scope) throw new Error('event_not_found');
    const regTable = (scope === 'department') ? 'Register_department' : (scope === 'faculty') ? 'Register_faculty' : 'Register_university';
    const [exists] = await db.query(`SELECT User_ID FROM ${regTable} WHERE User_ID = ? AND Event_ID = ? LIMIT 1`, [userId, eventId]);
    if (exists && exists.length) throw new Error('already_registered');
    const [ins] = await db.query(`INSERT INTO ${regTable} (User_ID, Event_ID, Status, registered_date) VALUES (?, ?, 'joined', NOW())`, [userId, eventId]);
    return { id: ins.insertId, scope };
}

async function unregisterUserFromEvent(userId, eventId) {
    const scope = await findEventScope(eventId);
    if (!scope) throw new Error('event_not_found');
    const regTable = (scope === 'department') ? 'Register_department' : (scope === 'faculty') ? 'Register_faculty' : 'Register_university';
    const [res] = await db.query(`UPDATE ${regTable} SET Status = 'cancelled', unregistered_date = NOW() WHERE User_ID = ? AND Event_ID = ? AND (Status = 'joined' OR Status IS NULL)`, [userId, eventId]);
    if (res && res.affectedRows) return { action: 'updated', rows: res.affectedRows };
    // fallback: delete row if exists
    const [del] = await db.query(`DELETE FROM ${regTable} WHERE User_ID = ? AND Event_ID = ?`, [userId, eventId]);
    if (del && del.affectedRows) return { action: 'deleted', rows: del.affectedRows };
    return { action: 'none', rows: 0 };
}

module.exports = {
    listLatestAnnouncements,
    getAnnouncementById,
    listEvents,
    getEventById,
    findEventScope,
    registerUserToEvent,
    unregisterUserFromEvent
};
