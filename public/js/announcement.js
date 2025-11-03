(function(){
    const search = document.getElementById('search');
    const uni = document.getElementById('university-filter');
    const type = document.getElementById('type-filter');
    const cards = Array.from(document.querySelectorAll('.card'));
    const countEl = document.getElementById('count');

    function applyFilters(){
        const q = (search && search.value || '').toLowerCase();
        const u = (uni && uni.value || '').toLowerCase();
        const t = (type && type.value || '').toLowerCase();
        let visible = 0;
        cards.forEach(card => {
            const text = card.innerText.toLowerCase();
            const matches = (!q || text.includes(q)) && (!u || text.includes(u)) && (!t || text.includes(t));
            card.style.display = matches ? 'flex' : 'none';
            if(matches) visible++;
        });
        countEl.innerText = visible;
    }

    [search, uni, type].forEach(el => el && el.addEventListener('input', applyFilters));
    applyFilters();

    // --- Detail modal handling ---
    const modal = document.getElementById('annDetailModal');
    const modalOverlay = modal ? modal.querySelector('.modal-overlay') : null;
    const modalDialog = modal ? modal.querySelector('.modal-dialog') : null;
    const annTitle = document.getElementById('annTitle');
    const annUniversity = document.getElementById('annUniversity');
    const annFaculty = document.getElementById('annFaculty');
    const annDepartment = document.getElementById('annDepartment');
    const annContent = document.getElementById('annContent');
    const annClose = document.getElementById('annClose');

    function openModal(){ if(modal) modal.style.display = 'flex'; }
    function openModal(){ if(modal){ modal.style.display = 'flex'; modal.classList.add('open'); } }
    function closeModal(){ if(modal){ modal.style.display = 'none'; modal.classList.remove('open'); } }

    // bind view buttons — fetch full details from server when possible
    document.querySelectorAll('.view-ann-btn').forEach(btn => {
        btn.addEventListener('click', async function(e){
            e.preventDefault();
            const card = btn.closest('.announcement-card');
            if(!card) return;
            const id = card.dataset.id;
            let data = null;
                if (id) {
                try {
                    // include card scope if present to disambiguate ID across announcement_* tables
                    const scope = card.dataset.scope || '';
                    const url = '/announcement/' + encodeURIComponent(id) + (scope ? ('?scope=' + encodeURIComponent(scope)) : '');
                    const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
                    if (resp && resp.ok) {
                        const json = await resp.json().catch(() => null);
                        if (json && json.success && json.announcement) data = json.announcement;
                        else if (json && json.title) data = json; // fallback shape
                    } else {
                        // failed to fetch — fall back to embedded card data
                        console.warn('Failed to fetch announcement details', resp && resp.status);
                    }
                } catch (err) {
                    console.warn('Network error fetching announcement details', err);
                }
            }

            // fallback to card DOM (use data-description attribute) if server data not available
            if (!data) {
                const title = card.querySelector('.ann-title') ? card.querySelector('.ann-title').textContent.trim() : '';
                const desc = card.dataset.description || '';
                data = { title: title || 'ประกาศ', description: desc || '', university: card.dataset.university || '', faculty: card.dataset.faculty || '', department: card.dataset.department || '' };
            }

            if(annTitle) annTitle.textContent = data.title || 'ประกาศ';
            if(annUniversity) annUniversity.textContent = data.university || '';
            if(annFaculty) annFaculty.textContent = data.faculty || '';
            if(annDepartment) annDepartment.textContent = data.department || '';
            if(annContent) annContent.textContent = data.content || '';

            openModal();
        });
    });

    if(modalOverlay) modalOverlay.addEventListener('click', closeModal);
    if(annClose) annClose.addEventListener('click', closeModal);
    window.addEventListener('keydown', (e) => { if(e.key === 'Escape') closeModal(); });

})();