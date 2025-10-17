(function(){
    const searchInput = document.getElementById('search-input');
    const uni = document.getElementById('university-filter');
    const type = document.getElementById('type-filter');
    const faculty = document.getElementById('faculty-filter');
    const department = document.getElementById('department-filter');
    const cards = Array.from(document.querySelectorAll('.card-container .card'));
    const countEl = document.getElementById('results-count');

    function applyFilters(){
        const q = (searchInput && searchInput.value || '').toLowerCase();
        const u = (uni && uni.value || '').toLowerCase();
        const t = (type && type.value || '').toLowerCase();
        const f = (faculty && faculty.value || '').toLowerCase();
        const d = (department && department.value || '').toLowerCase();
        let visible = 0;
        cards.forEach(card => {
            const text = card.innerText.toLowerCase();
            const cardUni = (card.dataset.university || '').toLowerCase();
            const cardTag = (card.dataset.tag || '').toLowerCase();
            const cardFaculty = (card.dataset.faculty || '').toLowerCase();
            const cardDept = (card.dataset.department || '').toLowerCase();

            const matchesQuery = !q || text.includes(q);
            const matchesUni = !u || cardUni === u;
            const matchesTag = !t || cardTag === t;const matchesFac = !f || cardFaculty === f;const matchesDept = !d || cardDept === d;
            const show = matchesQuery && matchesUni && matchesTag && matchesFac && matchesDept;
            card.style.display = show ? 'flex' : 'none';
            if(show) visible++;
            });
            if(countEl) countEl.textContent = visible;
    }

    [searchInput, uni, type, faculty, department].forEach(el => {
        if(!el) return;
        el.addEventListener('input', applyFilters);
        el.addEventListener('change', applyFilters);
    });

    applyFilters();
    })();

        // join modal handlers
    (function(){
        const joinModal = document.getElementById('join-modal');
        const joinTitle = document.getElementById('join-modal-title');
        const joinConfirm = document.getElementById('join-confirm');
        const joinCancel = document.getElementById('join-cancel');

        const successModal = document.getElementById('join-success-modal');
        const successQR = document.getElementById('success-qr');
        const successName = document.getElementById('success-event-name');
        const successLocation = document.getElementById('success-location');
        const successTime = document.getElementById('success-time');
        const successBack = document.getElementById('success-back');

        let currentEvent = null;

        function openModalForCard(card){
            const title = card ? (card.querySelector('.card-header h3')?.textContent || '') : '';
            const dateP = card ? card.querySelector('.card-body p i.fa-calendar-alt')?.parentNode : null;
            const timeP = card ? card.querySelector('.card-body p i.fa-clock')?.parentNode : null;
            const locP = card ? card.querySelector('.card-body p i.fa-map-marker-alt')?.parentNode : null;
            const dateText = dateP ? dateP.textContent.replace(/\s+/g,' ').trim() : '';
            const timeText = timeP ? timeP.textContent.replace(/\s+/g,' ').trim() : '';
            const locText = locP ? locP.textContent.replace(/\s+/g,' ').trim() : '';

            // read event id from data attribute
            const eventId = card ? (card.getAttribute('data-event-id') || card.dataset.eventId || null) : null;

            currentEvent = {
                id: eventId,
                title: title,
                date: dateText,
                time: timeText,
                location: locText
            };

                
            if(joinTitle) joinTitle.textContent = 'คุณต้องการเข้าร่วม "' + currentEvent.title + '" หรือไม่ ?';
            if(joinModal)
            { 
                joinModal.classList.remove('hidden'); 
                joinModal.setAttribute('aria-hidden','false'); 
                document.documentElement.classList.add('modal-open'); 
            }
        }

        function closeJoinModal(){ 
            if(joinModal)
            { 
                joinModal.classList.add('hidden'); 
                joinModal.setAttribute('aria-hidden','true'); 
                document.documentElement.classList.remove('modal-open'); 
            } 
        }
        function openSuccessModal(){ 
            if(successModal)
            { 
                successModal.classList.remove('hidden'); 
                successModal.setAttribute('aria-hidden','false'); 
                document.documentElement.classList.add('modal-open'); 
            } 
        }
        function closeSuccessModal(){ 
            if(successModal){ successModal.classList.add('hidden'); successModal.setAttribute('aria-hidden','true'); document.documentElement.classList.remove('modal-open'); } 
        }

        // bind only join buttons (have class .join-btn)
        document.querySelectorAll('.join-btn').forEach(btn => {
            btn.addEventListener('click', function(e){
                const card = e.target.closest('.card');
                openModalForCard(card);
            });
        });

        if(joinCancel) joinCancel.addEventListener('click', closeJoinModal);

        if(joinConfirm) joinConfirm.addEventListener('click', async function(){
            // close confirmation modal
            closeJoinModal();

            if(!currentEvent || !currentEvent.id){
                alert('ไม่พบข้อมูลกิจกรรม');
                return;
            }

            try{
                const resp = await fetch('/event/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ eventId: currentEvent.id })
                });

                const json = await resp.json().catch(() => null);

                if(resp.status === 201 || resp.ok){
                    // success: show success modal with QR
                    const payloadObj = { title: currentEvent.title, date: currentEvent.date, time: currentEvent.time, location: currentEvent.location, registerId: (json && json.id) ? json.id : undefined };
                    const payload = JSON.stringify(payloadObj);
                    const qrUrl = 'https://chart.googleapis.com/chart?chs=250x250&cht=qr&chl=' + encodeURIComponent(payload) + '&chld=L|1';
                    if(successQR) successQR.src = qrUrl;
                    if(successName) successName.textContent = currentEvent.title || '-';
                    if(successLocation) successLocation.textContent = currentEvent.location || '-';
                    if(successTime) successTime.textContent = currentEvent.time || '-';
                    openSuccessModal();
                } else if(resp.status === 409) {
                    alert((json && json.message) ? json.message : 'คุณได้ลงทะเบียนแล้ว');
                } else if(resp.status === 401) {
                    // not authenticated
                    window.location.href = '/auth/login';
                } else {
                    alert((json && json.message) ? json.message : 'เกิดข้อผิดพลาดขณะลงทะเบียน');
                }
            } catch(err){
                console.error('Error registering:', err);
                alert('เกิดข้อผิดพลาดขณะลงทะเบียน');
            } finally {
                currentEvent = null;
            }
        });

    if(successBack) successBack.addEventListener('click', function(){ closeSuccessModal(); });
})();