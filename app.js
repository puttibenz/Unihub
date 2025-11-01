const express = require('express')
const session = require('express-session')
const bodyParser = require('body-parser')
const app = express()
const path = require('path');

const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/event');
const universitiesRoutes = require('./routes/universities');
const profileRoutes = require('./routes/profile');
const announcementRoutes = require('./routes/announcement');
const crudRoutes = require('./routes/admin');    
const questionRoutes = require('./routes/question');

const db = require('./db'); // นำเข้าโมดูล db.js

// Configure admin emails (comma-separated) via environment variable
// Example: ADMIN_EMAILS=admin@uni.edu,owner@uni.edu
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@uni.edu').split(',').map(s => s.trim()).filter(Boolean);

// NOTE: session middleware is configured below with cookie options and rolling=true
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set('view engine','ejs');


app.use(express.static(path.join(__dirname,'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'replace_this_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    // secure: true, // เปิดเมื่อใช้ HTTPS เท่านั้น
  },
  rolling: true // ต่ออายุ session ทุก request
}));

// Middleware ส่ง user ไปทุกหน้า และ expose admin info ให้ view 
app.use((req, res, next) => {
    res.locals.user = req.session.user; //
    // expose configured admin emails and a convenience flag
    res.locals.adminEmails = ADMIN_EMAILS;
    res.locals.isAdmin = !!(req.session.user && req.session.user.email && ADMIN_EMAILS.includes(req.session.user.email));
    next();
});

app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/', eventRoutes);
app.use('/', universitiesRoutes);
app.use('/', profileRoutes);
app.use('/', announcementRoutes);
app.use('/', crudRoutes);
app.use('/', questionRoutes);

// Initialize core tables (Post, Comment) once server starts
app.listen(3000, () => {
    console.log('Server is running')
})