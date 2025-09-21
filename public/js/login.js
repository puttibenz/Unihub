document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            try {
                const res = await fetch('/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                if (res.ok) {
                    alert('เข้าสู่ระบบสำเร็จ! จะนำคุณไปยังหน้าแรก');
                        window.location.href = '/';
                } 
                    else {
                    alert(data.message || 'เข้าสู่ระบบไม่สำเร็จ');
                }

            } catch (err) {
                    alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
                }
        });
    }
});