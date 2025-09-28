const express = require('express');
const router = express.Router();

const db = require('../db');

// GET /question (callback style similar to /event)
router.get('/question', (req, res) => {
  const limit = 50;
  db.query(
    `SELECT p.Post_ID, p.Title, p.Content, p.Create_at, p.User_ID, u.first_name AS author_first
     FROM Post p
     LEFT JOIN users u ON p.User_ID = u.ID
     ORDER BY p.Create_at DESC LIMIT ?`,
    [limit],
    (err, posts) => {
      if (err) { 
        console.error('Fetch posts error (posts)', err); 
        return res.render('question', { title: 'Q&A', questions: [] }); 
      }
      if(!posts.length){
        return res.render('question', { title: 'Q&A', questions: [] });
      }
      const ids = posts.map(p => p.Post_ID);
      db.query(
        `SELECT c.Comment_ID, c.Content, c.Create_at, c.Post_ID, c.User_ID, u.first_name AS comment_author_first
         FROM Comment c
         LEFT JOIN users u ON c.User_ID = u.ID
         WHERE c.Post_ID IN (?)
         ORDER BY c.Create_at ASC`,
        [ids],
        (err2, comments) => {
          if (err2) { 
            console.error('Fetch posts error (comments)', err2); 
            return res.render('question', { title: 'Q&A', questions: [] }); 
          }
          const grouped = {};
          comments.forEach(c => {
            (grouped[c.Post_ID] = grouped[c.Post_ID] || []).push({
              id: c.Comment_ID,
              body: c.Content,
              createdAt: c.Create_at,
              author: c.comment_author_first || (c.User_ID ? `User#${c.User_ID}` : 'Anonymous')
            });
          });
          const questions = posts.map(p => ({
            id: p.Post_ID,
            title: p.Title,
            body: p.Content,
            createdAt: p.Create_at,
            author: p.author_first || (p.User_ID ? `User#${p.User_ID}` : 'Anonymous'),
            likes: 0,
            views: 0,
            tags: [],
            answers: grouped[p.Post_ID] || []
          }));
          return res.render('question', { title: 'Q&A', questions });
        }
      );
    }
  );
});

module.exports = router;

// === API endpoints moved from api.post.js ===
function sanitize(str){ return String(str||'').trim(); }

// Create a new question (Post)
router.post('/api/posts', (req,res)=>{
	const title = sanitize(req.body.title);
	const body = sanitize(req.body.body);
	const userId = req.session.user ? req.session.user.id : null;
	if(!title || !body) return res.status(400).json({error:'Missing title/body'});
	if(title.length > 200) return res.status(400).json({error:'Title too long'});
	db.query('INSERT INTO Post (Title, Content, User_ID) VALUES (?,?,?)',[title, body, userId], (err, result)=>{
		if(err){ console.error(err); return res.status(500).json({error:'DB error'}); }
		db.query(`SELECT p.Post_ID as id, p.Title as title, p.Content as body, DATE_FORMAT(p.Create_at, "%Y-%m-%d") as createdAt, p.User_ID, u.first_name
							FROM Post p LEFT JOIN users u ON p.User_ID = u.ID WHERE p.Post_ID=?`,[result.insertId], (err2, rows)=>{
			if(err2){ console.error(err2); return res.status(500).json({error:'DB error'}); }
			const row = rows[0];
			res.json({ id: row.id, title: row.title, body: row.body, createdAt: row.createdAt, author: row.first_name || (row.User_ID?`User#${row.User_ID}`:'Anonymous'), likes:0, views:0, tags:[], answers:[] });
		});
	});
});

// Create a new answer (Comment)
router.post('/api/posts/:id/comments', (req,res)=>{
	const postId = parseInt(req.params.id,10);
	const body = sanitize(req.body.body);
	const userId = req.session.user ? req.session.user.id : null;
	if(!postId || !body) return res.status(400).json({error:'Missing data'});
	db.query('INSERT INTO Comment (Content, Post_ID, User_ID) VALUES (?,?,?)',[body, postId, userId], (err, result)=>{
		if(err){ console.error(err); return res.status(500).json({error:'DB error'}); }
		db.query(`SELECT c.Comment_ID as id, c.Content as body, DATE_FORMAT(c.Create_at, "%Y-%m-%d") as createdAt, c.User_ID, u.first_name
							FROM Comment c LEFT JOIN users u ON c.User_ID = u.ID WHERE c.Comment_ID=?`,[result.insertId], (err2, rows)=>{
			if(err2){ console.error(err2); return res.status(500).json({error:'DB error'}); }
			const row = rows[0];
			res.json({ id: row.id, body: row.body, createdAt: row.createdAt, author: row.first_name || (row.User_ID?`User#${row.User_ID}`:'Anonymous') });
		});
	});
});
