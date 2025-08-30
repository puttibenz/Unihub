const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db'); // Assuming db connection is in a separate file
const router = express.Router();

// Route: หน้าแสดงกิจกรรม
router.get('/', (req, res) => {
    // sample events data - replace with DB query when ready
    const sampleEvents = [
        { tag: 'OpenHouse', university: 'MIT', title: 'งาน Open House ภาควิชาวิทยาการคอมพิวเตอร์', date: '2024-03-15', time: '14:00 - 17:00', location: 'Campus Center, Boston', interested: 127, description: 'สำรวจหลักสูตรวิทยาการคอมพิวเตอร์ที่ล้ำสมัยของเราและพบปะกับคณาจารย์ เรียนรู้เกี่ยวกับโอกาสในการทำวิจัย...' },
        { tag: 'Academic', university: 'Harvard University', title: 'เวิร์คช็อปสำหรับนักศึกษาเตรียมแพทย์', date: '2024-03-18', time: '10:00 - 12:00', location: 'Medical School, Cambridge', interested: 89, description: 'เวิร์คช็อปเชิงโต้ตอบที่ครอบคลุมการเตรียมตัวสอบ MCAT, การสมัครเข้าเรียนแพทย์ และแนวทางการประกอบอาชีพ...' },
        { tag: 'Social', university: 'Stanford University', title: 'เทศกาลฤดูใบไม้ผลิในมหาวิทยาลัย', date: '2024-03-22', time: '12:00 - 20:00', location: 'Main Quad, Palo Alto', interested: 245, description: 'มาร่วมเพลิดเพลินกับดนตรี อาหาร และความสนุกสนานตลอดวัน!' },
        { tag: 'Academic', university: 'Caltech', title: 'งานนวัตกรรมวิศวกรรม', date: '2024-03-25', time: '13:00 - 18:00', location: 'Engineering Building, Pasadena', interested: 156, description: 'ค้นพบโครงการนักศึกษาและงานวิจัยที่ก้าวล้ำในสาขาวิศวกรรม' },
        { tag: 'Social', university: 'Yale University', title: 'การแสดงผลงานศิลปะและวัฒนธรรม', date: '2024-03-28', time: '15:00 - 19:00', location: 'Art Center, New Haven', interested: 98, description: 'สัมผัสบรรยากาศศิลปะที่มีชีวิตชีวาที่เยลผ่านการแสดงนิทรรศการและเวิร์คช็อป' },
        { tag: 'OpenHouse', university: 'Wharton', title: 'การบรรยายข้อมูลหลักสูตรบริหารธุรกิจ', date: '2024-04-02', time: '11:00 - 13:00', location: 'Business School, Philadelphia', interested: 173, description: 'เรียนรู้เกี่ยวกับหลักสูตรบริหารธุรกิจระดับปริญญาตรี และโอกาสในการประกอบอาชีพ' }
    ];

    res.render('events', { title: 'Events', events: sampleEvents });
});

module.exports = router;
