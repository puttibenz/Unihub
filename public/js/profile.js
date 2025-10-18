(function(){
  function qs(s, root){ return (root||document).querySelector(s); }
  function qsa(s, root){ return Array.from((root||document).querySelectorAll(s)); }

  // intercept unregister forms/buttons and call PATCH /event/unregister/:id
  qsa('form[action="/event/unregister"]').forEach(form => {
    form.addEventListener('submit', async function(e){
      e.preventDefault();
      const fd = new FormData(form);
      const eventId = fd.get('eventId');
      if(!eventId) return alert('ไม่พบ id ของกิจกรรม');
      if(!confirm('คุณต้องการยกเลิกการลงทะเบียนกิจกรรมใช่หรือไม่?')) return;

      try{
        const res = await fetch(`/event/unregister/${encodeURIComponent(eventId)}`, {
          method: 'PATCH',
          headers: { 'Accept': 'application/json' }
        });
        const json = await res.json().catch(()=>null);
        if(res.ok){
          // remove card from DOM
          const card = form.closest('.card');
          if(card) card.remove();
          // if no more cards, show muted message
          const container = document.querySelector('.registered-events-section .card-container');
          if(container && container.querySelectorAll('.card').length === 0){
            container.innerHTML = '<p class="muted">ยังไม่มีการลงทะเบียนกิจกรรม</p>';
          }
        } else {
          alert((json && json.message) ? json.message : 'ยกเลิกไม่สำเร็จ');
        }
      }catch(err){
        console.error('unregister error', err);
        alert('เกิดข้อผิดพลาดขณะยกเลิก');
      }
    });
  });
  
  // --- Edit profile modal handling ---
  const editBtn = qs('.edit-btn');
  const editModal = qs('#editProfileModal');
  const editForm = qs('#editProfileForm');
  const cancelBtn = qs('#cancelEdit');

  function openEditModal() {
    // populate fields from global `user` if available
    try{
      if (window.user) {
        qs('#first_name').value = user.first_name || '';
        qs('#last_name').value = user.last_name || '';
        qs('#email').value = user.email || '';
        qs('#phone').value = user.phone || '';
        qs('#school_name').value = user.school_name || '';
      }
    }catch(e){ }
    editModal.style.display = 'flex';
  }

  function closeEditModal(){ editModal.style.display = 'none'; }

  if(editBtn) editBtn.addEventListener('click', openEditModal);
  if(cancelBtn) cancelBtn.addEventListener('click', closeEditModal);
  // close when clicking overlay
  const overlay = qs('#editProfileModal .modal-overlay');
  if(overlay) overlay.addEventListener('click', closeEditModal);

  // submit profile edits via PATCH /profile (expects JSON)
  if(editForm){
    editForm.addEventListener('submit', async function(e){
      e.preventDefault();
      const data = {
        first_name: qs('#first_name').value.trim(),
        last_name: qs('#last_name').value.trim(),
        email: qs('#email').value.trim(),
        phone: qs('#phone').value.trim(),
        school_name: qs('#school_name').value.trim()
      };
      try{
        const res = await fetch('/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(data)
        });
        const json = await res.json().catch(()=>null);
        if(res.ok){
          // update page values quickly without reload
          if(window.user){ Object.assign(window.user, data); }
          // update the visible lines
          qs('.name-line').textContent = (data.first_name + ' ' + data.last_name).trim() || 'ไม่พบชื่อผู้ใช้';
          qs('.school-line').textContent = data.school_name || 'โรงเรียน';
          qs('.email-line').textContent = data.email || '-';
          qs('.phone-line').textContent = data.phone || '-';
          closeEditModal();
        } else {
          alert((json && json.message) ? json.message : 'อัปเดตไม่สำเร็จ');
        }
      }catch(err){
        console.error('update profile error', err);
        alert('เกิดข้อผิดพลาดขณะอัปเดตข้อมูล');
      }
    });
  }

})();
