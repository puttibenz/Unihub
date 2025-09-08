const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db'); // Assuming db connection is in a separate file
const router = express.Router();

// Route: หน้าแสดงกิจกรรม
router.get('/event', (req, res) => {
    // sample events data - replace with DB query when ready (ตัวอย่างเป็นมหาวิทยาลัยไทย)
    const sampleEvents = [
        { tag: 'OpenHouse', university: 'จุฬาลงกรณ์มหาวิทยาลัย', title: 'วันเปิดบ้านภาควิชาวิทยาการคอมพิวเตอร์', date: '2025-10-15', time: '09:00 - 15:00', location: 'อาคารวิทยาการ จุฬาลงกรณ์', interested: 320, description: 'ร่วมสำรวจหลักสูตรและห้องปฏิบัติการ พบอาจารย์และนักศึกษาปัจจุบัน' },
        { tag: 'Academic', university: 'มหาวิทยาลัยมหิดล', title: 'เวิร์คช็อปเตรียมแพทย์สำหรับนักเรียนมัธยม', date: '2025-10-20', time: '10:00 - 12:00', location: 'คณะแพทยศาสตร์ ม.มหิดล ศาลายา', interested: 210, description: 'แนวทางการเตรียมตัวสอบและการสมัครเข้าคณะแพทยศาสตร์ พร้อมคำแนะนำจากรุ่นพี่' },
        { tag: 'Academic', university: 'มหาวิทยาลัยเกษตรศาสตร์', title: 'งานนวัตกรรมการเกษตร', date: '2025-11-12', time: '13:00 - 18:00', location: 'อาคารวิจัย มก.', interested: 150, description: 'นิทรรศการผลงานวิจัยและโครงการนวัตกรรมด้านการเกษตรและเทคโนโลยี' }
    ];

    res.render('event', { title: 'Event', events: sampleEvents });
});

module.exports = router;
