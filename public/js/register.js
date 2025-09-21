document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const name = document.getElementById('name').value.trim();
            const lastname = document.getElementById('lastname').value.trim();
            const school = document.getElementById('school').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const confirm = document.getElementById('confirm-password') ? document.getElementById('confirm-password').value : '';

            if (!name || !lastname || !school || !email || !password || !confirm) {
                alert('กรุณากรอกข้อมูลให้ครบถ้วน');
                return;
            }
            if (password !== confirm) {
                alert('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
                return;
            }

            try {
                const res = await fetch('/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, lastname, school, email, password })
                });
                const data = await res.json();
                if (res.ok) {
                    alert('ลงทะเบียนสำเร็จ! จะนำคุณไปยังหน้าเข้าสู่ระบบ');
                    window.location.href = '/auth/login';
                } else {
                    alert(data.message || 'เกิดข้อผิดพลาด');
                }
            } catch (err) {
                alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
            }
        });
    }
});