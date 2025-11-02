(function(){
    // --- Detail modal handling ---
    const modal = document.getElementById('annDetailModal');
    const modalOverlay = modal ? modal.querySelector('.modal-overlay') : null;
    const modalDialog = modal ? modal.querySelector('.modal-dialog') : null;
    const annTitle = document.getElementById('annTitle');
    const annUniversity = document.getElementById('annUniversity');
    const annFaculty = document.getElementById('annFaculty');
    const annDepartment = document.getElementById('annDepartment');
    const annDescription = document.getElementById('annDescription');
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
                    const resp = await fetch('/announcement/' + encodeURIComponent(id), { headers: { 'Accept': 'application/json' } });
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
            if(annDescription) annDescription.textContent = data.description || '';

            openModal();
        });
    });

    if(modalOverlay) modalOverlay.addEventListener('click', closeModal);
    if(annClose) annClose.addEventListener('click', closeModal);
    window.addEventListener('keydown', (e) => { if(e.key === 'Escape') closeModal(); });
    })();