(function(){
  function qs(s, root) { 
    return (root||document).querySelector(s); 
  }
  function qsa(s, root) { 
    return Array.from((root||document).querySelectorAll(s)); 
  }

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

  // submit profile edits via PUT /profile (send only changed fields)
  if(editForm){
    editForm.addEventListener('submit', async function(e){
      e.preventDefault();
      // build payload with only changed values compared to window.user
      const current = window.user || {};
      const raw = {
        first_name: qs('#first_name').value.trim(),
        last_name: qs('#last_name').value.trim(),
        email: qs('#email').value.trim(),
        phone: qs('#phone').value.trim(),
        school_name: qs('#school_name').value.trim()
      };
      const payload = {};
      Object.keys(raw).forEach(k => {
        const oldVal = (current[k] || '');
        const newVal = (raw[k] == null) ? '' : String(raw[k]);
        if (String(oldVal) !== newVal) payload[k] = newVal;
      });
      if (Object.keys(payload).length === 0) { closeEditModal(); return; }

      try{
        const res = await fetch('/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json().catch(()=>null);
        if(res.ok){
          // apply to local window.user and reload to reflect authoritative session/server rendering
          Object.assign(window.user, payload);
          alert('อัปเดตข้อมูลเรียบร้อยแล้ว');
          return window.location.reload();
        } else {
          alert((json && json.message) ? json.message : 'อัปเดตไม่สำเร็จ');
        }
      }catch(err){
        console.error('update profile error', err);
        alert('เกิดข้อผิดพลาดขณะอัปเดตข้อมูล');
      }
    });
  }

  // --- Detail modal handling for registered events ---
  const detailModal = qs('#detailModal');
  const detailQr = qs('#detail-qr');
  const successName = qs('#success-event-name');
  const successLocation = qs('#success-location');
  const successTime = qs('#success-time');
  const closeDetailBtn = qs('#closeDetail');

  async function trySetQr(eventId){
    if(!eventId) return;
    const localPath = `/images/qrcodes/${encodeURIComponent(eventId)}.png`;
    try{
      // try HEAD first to avoid downloading large payloads
      const res = await fetch(localPath, { method: 'HEAD' });
      if(res && res.ok){
        detailQr.src = localPath;
        return;
      }
    }catch(e){
      // fallthrough to fallback
    }
    // fallback to generic local QR
    detailQr.src = '/images/qrcode.png';
  }

  function openDetailModal(){
    if(detailModal) detailModal.style.display = 'flex';
  }
  function closeDetailModal(){ if(detailModal) detailModal.style.display = 'none'; }

  qsa('.detail-btn').forEach(btn => {
    btn.addEventListener('click', async function(e){
      const id = btn.getAttribute('data-id');
      const title = btn.getAttribute('data-title') || '';
      const location = btn.getAttribute('data-location') || '';
      const time = btn.getAttribute('data-time') || '';
      if(successName) successName.textContent = title;
      if(successLocation) successLocation.textContent = location;
      if(successTime) successTime.textContent = time;
      await trySetQr(id);
      openDetailModal();
    });
  });

  if(closeDetailBtn) closeDetailBtn.addEventListener('click', closeDetailModal);
  const detailOverlay = qs('#detailModal .modal-overlay');
  if(detailOverlay) detailOverlay.addEventListener('click', closeDetailModal);
  // close with ESC
  window.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeDetailModal(); });

})();
