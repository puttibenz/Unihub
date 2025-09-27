const express = require('express');
const router = express.Router();

// Temporary sample data until database is implemented
const sampleQuestions = [
	{
		id: 1,
		author: 'Alice',
		createdAt: '2025-09-10',
		title: 'วิธีการสมัครเรียนที่มหาวิทยาลัย A?',
		body: 'อยากทราบว่าการสมัครต้องใช้เอกสารอะไรบ้าง และมีเกณฑ์คะแนนขั้นต่ำหรือไม่?',
		tags: ['College Applications','Admissions'],
		views: 45,
		likes: 12,
		answers: [
			{ id: 1, author: 'Bob', body: 'โดยปกติจะต้องใช้ผลการเรียน ทรานสคริปต์ และจดหมายแนะนำ 2 ฉบับ', createdAt: '2025-09-11', likes: 0 }
		]
	},
	{
		id: 2,
		author: 'Charlie',
		createdAt: '2025-09-15',
		title: 'สอบเข้าเอกวิทย์คอมต้องเตรียมอะไร?',
		body: 'อยากรู้ว่ามีข้อสอบวิชาอะไรบ้าง และควรเตรียมตัวอย่างไร?',
		tags: ['Study Tips','College Prep'],
		views: 32,
		likes: 8,
		answers: []
	}
];

// GET /question
router.get('/question', (req, res) => {
	res.render('question', { title: 'Q&A', questions: sampleQuestions });
});

module.exports = router;
