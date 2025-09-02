const express = require('express')
const mysql = require('mysql')
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
const crudRoutes = require('./routes/crud');    

const db = require('./db'); // นำเข้าโมดูล db.js

// Configure admin emails (comma-separated) via environment variable
// Example: ADMIN_EMAILS=admin@uni.edu,owner@uni.edu
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@uni.edu').split(',').map(s => s.trim()).filter(Boolean);

app.use(session({
    secret: 'your_secret_key', // เปลี่ยนเป็นค่าสุ่มของคุณเอง
    resave: false,
    saveUninitialized: false
}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set('view engine','ejs');


app.use(express.static(path.join(__dirname,'public')));

// Middleware ส่ง user ไปทุกหน้า และ expose admin info ให้ view 
app.use((req, res, next) => {
    res.locals.user = req.session.user; // หรือ req.user ตามที่คุณใช้
    // expose configured admin emails and a convenience flag
    res.locals.adminEmails = ADMIN_EMAILS;
    res.locals.isAdmin = !!(req.session.user && req.session.user.email && ADMIN_EMAILS.includes(req.session.user.email));
    next();
});

app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/event', eventRoutes);
app.use('/universities', universitiesRoutes);
app.use('/profile', profileRoutes);
app.use('/announcement', announcementRoutes);
app.use('/crud', crudRoutes);

app.listen(3000, () => {
    console.log('Server is running')
})