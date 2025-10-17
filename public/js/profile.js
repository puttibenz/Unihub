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
})();
