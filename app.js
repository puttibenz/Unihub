const express = require('express')
const mysql = require('mysql')
const session = require('express-session')
const bodyParser = require('body-parser')
const app = express()
const path = require('path');
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/event');
const universitiesRoutes = require('./routes/universities');
const profileRoutes = require('./routes/profile');
const db = require('./db'); // นำเข้าโมดูล db.js

app.use(session({
    secret: 'your_secret_key', // เปลี่ยนเป็นค่าสุ่มของคุณเอง
    resave: false,
    saveUninitialized: false
}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set('view engine','ejs');


app.use(express.static(path.join(__dirname,'public')));

// Middleware ส่ง user ไปทุกหน้า
app.use((req, res, next) => {
    res.locals.user = req.session.user; // หรือ req.user ตามที่คุณใช้
    next();
});

app.get('/', (req,res) => {
    res.render('index', {title:'Index'});
});

app.get('/login', (req,res) => {
    res.render('login', {title:'Login'});
});

app.get('/register', (req,res) => {
    res.render('register', {title:'Register'});
});

app.use('/auth', authRoutes);
app.use('/events', eventRoutes);
app.use('/universities', universitiesRoutes);
app.use('/profile', profileRoutes);

app.listen(3000, () => {
    console.log('Server is running')
})