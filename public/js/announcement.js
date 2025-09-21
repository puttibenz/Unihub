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
})();