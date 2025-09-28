document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('register-form');
    const userTypeSel = document.getElementById('user-type');
    const schoolWrapper = document.getElementById('school-wrapper');
    const schoolInput = document.getElementById('school');

    function needsSchool(type){
        return ['student','university_student','teacher'].includes(type);
    }

    function updateSchoolVisibility(){
        const type = userTypeSel.value;
        if(needsSchool(type)){
            schoolWrapper.hidden = false;
            schoolInput.setAttribute('required','required');
        } else {
            schoolWrapper.hidden = true;
            schoolInput.removeAttribute('required');
            schoolInput.value='';
        }
    }

    userTypeSel?.addEventListener('change', updateSchoolVisibility);
    updateSchoolVisibility();

    if (registerForm) {
        registerForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const name = document.getElementById('name').value.trim();
            const lastname = document.getElementById('lastname').value.trim();
            const email = document.getElementById('email').value.trim();
            const phone = document.getElementById('phone')?.value.trim() || '';
            const user_type = userTypeSel.value;
            const school_name = schoolInput.value.trim();
            const password = document.getElementById('password').value;
            const confirm = document.getElementById('confirm-password') ? document.getElementById('confirm-password').value : '';

            if (!name || !lastname || !email || !password || !confirm || !user_type) {
                alert('กรุณากรอกข้อมูลให้ครบถ้วน');
                return;
            }
            if (password !== confirm) {
                alert('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
                return;
            }
            if(needsSchool(user_type) && !school_name){
                alert('กรุณากรอกชื่อสถานศึกษา');
                return;
            }
            const payload = { name, lastname, email, phone, user_type, password };
            if(needsSchool(user_type)) payload.school_name = school_name; else payload.school_name = null;

            try {
                const res = await fetch('/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json().catch(()=>({}));
                if (res.ok) {
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