/*
    สคริปต์สำหรับหน้า admin CRUD (ปรับรูปแบบและแปลคอมเมนต์เป็นภาษาไทย)
    - ทำความสะอาดรูปแบบ (indentation) ให้สม่ำเสมอ
    - แปลคอมเมนต์เป็นภาษาไทย แต่ไม่เปลี่ยนพฤติกรรมของโค้ด
    - รักษา API สาธารณะไว้ (ฟังก์ชัน onAdd, onEdit, onDelete, append*Row)
*/

/* -------------------------
   1) อ่านข้อมูลที่ฝังมาในหน้า (embedded JSON)
   ------------------------- */
const __DATA_CONTAINER = document.getElementById('__DATA__container');
const __UNIVERSITIES = JSON.parse(__DATA_CONTAINER?.getAttribute('data-universities') || '[]');
const __FACULTIES = JSON.parse(__DATA_CONTAINER?.getAttribute('data-faculties') || '[]');
const __DEPARTMENTS = JSON.parse(__DATA_CONTAINER?.getAttribute('data-departments') || '[]');
const __CATEGORIES = JSON.parse(__DATA_CONTAINER?.getAttribute('data-categories') || '[]');

// ทำให้ข้อมูลมีรูปแบบคงที่ที่โค้ดส่วนอื่นๆ คาดหวัง
const _UNIS = (__UNIVERSITIES || []).map(u => ({
    id: String(u.ID ?? u.id ?? u.UniversityID ?? u.University_ID ?? ''),
    name: String(u.name ?? u.Name ?? u.UniversityName ?? u.University ?? '').trim(),
    location: u.location ?? u.Location ?? null,
    website: u.website ?? u.Website ?? null
}));

const _FACS = (__FACULTIES || []).map(f => ({
    id: String(f.ID ?? f.id ?? f.FacultyID ?? f.Faculty_ID ?? ''),
    name: String(f.name ?? f.Name ?? f.FacultyName ?? f.Faculty ?? '').trim(),
    universityId: String(f.University_ID ?? f.UniversityID ?? f.universityId ?? f.university ?? '')
}));

const _DEPS = (__DEPARTMENTS || []).map(d => ({
    id: String(d.ID ?? d.id ?? ''),
    name: String((d.name ?? d.Name ?? d.DepartmentName ?? d.Department) || '').trim(),
    facultyId: String(d.Faculty_ID ?? d.FacultyId ?? d.facultyId ?? ''),
    universityId: String(d.University_ID ?? d.UniversityId ?? d.universityId ?? '')
}));

// ให้เป็นตัวแปรสาธารณะไว้สำหรับโค้ดเก่าที่อาจเรียกใช้งาน
window.__UNIVERSITIES = _UNIS;
window.__FACULTIES = _FACS;


/* -------------------------
   2) ฟังก์ชันเติม <select> (dropdown)
   ------------------------- */
function populateUniversitySelect(sel) {
    if (!sel) return;
    sel.innerHTML = '<option value="">-- เลือกมหาวิทยาลัย --</option>';
    _UNIS.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.textContent = u.name || 'Unknown';
        sel.appendChild(opt);
    });
}

// กรณีข้อมูลคณะอาจไม่ถูกฝังมาหมดในหน้า จะลอง fetch จากเซิร์ฟเวอร์เพียงครั้งเดียวเป็น fallback
let _FACS_fetchTried = false;
async function populateFacultySelectForUniversity(sel, universityId) {
    if (!sel) return;
    sel.innerHTML = '<option value="">-- ทุกคณะ --</option>';
    let found = 0;
    _FACS.forEach(f => {
        const include = !universityId || String(f.universityId) === String(universityId);
        if (include) {
            const opt = document.createElement('option');
            opt.value = f.id;
            opt.textContent = f.name || 'Unknown';
            sel.appendChild(opt);
            found++;
        }
    });

    // หากไม่พบคณะสำหรับมหาวิทยาลัยนี้ ให้ลองดึงจาก /admin/faculties หนึ่งครั้ง
    if (found === 0 && !_FACS_fetchTried && universityId) {
        _FACS_fetchTried = true;
        try {
            const resp = await fetch('/admin/faculties');
            if (resp && resp.ok) {
                const json = await resp.json();
                if (json && Array.isArray(json.faculties)) {
                    json.faculties.forEach(ff => {
                        if (!_FACS.find(x => String(x.id) === String(ff.id))) {
                            _FACS.push({ id: String(ff.id), name: String(ff.name || ''), universityId: String(ff.universityId || '') });
                        }
                    });
                    // เติมข้อมูลที่ดึงมาแล้วเรียกตัวเองใหม่เพื่อเติม select
                    populateFacultySelectForUniversity(sel, universityId);
                    return;
                }
            }
        } catch (err) {
            console.warn('ไม่สามารถดึง /admin/faculties สำหรับ fallback ได้:', err);
        }
    }
}

function populateDepartmentSelectForFaculty(sel, universityId, facultyId) {
    if (!sel) return;
    sel.innerHTML = '<option value="">-- ทุกสาขา --</option>';
    _DEPS.forEach(d => {
        const matchUni = !universityId || String(d.universityId) === String(universityId);
        const matchFac = !facultyId || String(d.facultyId) === String(facultyId);
        if (matchUni && matchFac) {
            const opt = document.createElement('option');
            opt.value = d.id;
            opt.textContent = d.name || 'Unknown';
            sel.appendChild(opt);
        }
    });
}

// categories: ถ้ามีใน embedded ใช้ค่านั้นๆ มิฉะนั้นใช้ค่าเริ่มต้น
const _EMBEDDED_CATS = (__CATEGORIES || []).map(c => (typeof c === 'string' ? c : (c.name || c.Name || c.Category || ''))).filter(Boolean);
const CATEGORIES = (_EMBEDDED_CATS.length > 0) ? _EMBEDDED_CATS : ['OpenHouse', 'Academic', 'Social', 'Workshop', 'Seminar'];
function populateCategorySelect(sel) {
    if (!sel) return;
    sel.innerHTML = '<option value="">-- เลือกประเภท --</option>';
    CATEGORIES.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        sel.appendChild(opt);
    });
}


/* -------------------------
   3) การเตรียม UI (จับ element หลักๆ) และ bind events
   ------------------------- */
const addModal = document.getElementById('add-modal');
const addModalTitle = document.getElementById('add-modal-title');
const addModalForm = document.getElementById('add-modal-form');
const addModalCancel = document.getElementById('add-modal-cancel');
const formUniversity = document.getElementById('form-university');
const formFaculty = document.getElementById('form-faculty');
const formDepartment = document.getElementById('form-department');
const uniNameInput = document.getElementById('uni-name');
const uniAbbreviationInput = document.getElementById('uni-abbreviation');
const uniLocationInput = document.getElementById('uni-location');
const uniWebsiteInput = document.getElementById('uni-website');
const uniEmailInput = document.getElementById('uni-email');
const uniContactInput = document.getElementById('uni-contact');
const facUniversitySelect = document.getElementById('fac-university');
const facNameInput = document.getElementById('fac-name');
const facEmailInput = document.getElementById('fac-email');
const facPhoneInput = document.getElementById('fac-phone');
const deptUniversitySelect = document.getElementById('dept-university');
const deptFacultySelect = document.getElementById('dept-faculty');
const deptNameInput = document.getElementById('dept-name');
const deptEmailInput = document.getElementById('dept-email');
const deptPhoneInput = document.getElementById('dept-phone');
const eventUniversitySelect = document.getElementById('event-university');
const eventFacultySelect = document.getElementById('event-faculty');
const eventCategorySelect = document.getElementById('event-category');
const eventMajorInput = document.getElementById('event-major');
const eventTitleInput = document.getElementById('event-title');
const eventDescriptionInput = document.getElementById('event-description');
const eventLocationInput = document.getElementById('event-location');
const eventStartInput = document.getElementById('event-start');
const eventEndInput = document.getElementById('event-end');
const annUniversitySelect = document.getElementById('ann-university');
const annTitleInput = document.getElementById('ann-title');
const annDescriptionInput = document.getElementById('ann-description');
const annFacultyInput = document.getElementById('ann-faculty');
const annDepartmentInput = document.getElementById('ann-department');

// เติมค่าลงใน select controls
populateUniversitySelect(facUniversitySelect);
populateUniversitySelect(deptUniversitySelect);
populateUniversitySelect(eventUniversitySelect);
if (annUniversitySelect) populateUniversitySelect(annUniversitySelect);
populateFacultySelectForUniversity(eventFacultySelect, '');
populateDepartmentSelectForFaculty(eventMajorInput, '', '');
populateCategorySelect(eventCategorySelect);

// ตัวกรองประเภทกิจกรรม (ถ้ามี)
const eventsFilterCategory = document.getElementById('events-filter-category');
if (eventsFilterCategory) {
    eventsFilterCategory.innerHTML = '';
    CATEGORIES.forEach((c, idx) => {
        const o = document.createElement('option');
        o.value = c;
        o.textContent = c;
        if (idx === 0) o.selected = true;
        eventsFilterCategory.appendChild(o);
    });
    function applyEventsFilter() {
        const v = eventsFilterCategory.value;
        document.querySelectorAll('#panel-events tbody tr').forEach(tr => {
            const cat = tr.dataset.category || '';
            tr.style.display = (v === '' || v === cat) ? '' : 'none';
        });
    }
    applyEventsFilter();
    eventsFilterCategory.addEventListener('change', applyEventsFilter);
}

// ให้ select ที่พึ่งพากันอัพเดตเมื่อเลือกค่า
if (deptUniversitySelect) deptUniversitySelect.addEventListener('change', (e) => populateFacultySelectForUniversity(deptFacultySelect, e.target.value));
if (eventUniversitySelect) {
    eventUniversitySelect.addEventListener('change', (e) => {
        populateFacultySelectForUniversity(eventFacultySelect, e.target.value);
        populateDepartmentSelectForFaculty(eventMajorInput, e.target.value, eventFacultySelect.value || '');
    });
}
if (eventFacultySelect) {
    eventFacultySelect.addEventListener('change', (e) => populateDepartmentSelectForFaculty(eventMajorInput, eventUniversitySelect.value || '', e.target.value || ''));
}


/* -------------------------
   4) Helpers สำหรับ table/rows
   ------------------------- */
const tbodyUnis = document.querySelector('#panel-universities tbody');
const tbodyFacs = document.querySelector('#panel-faculties tbody');
const tbodyDeps = document.querySelector('#panel-departments tbody');

function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, function (m) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": "&#39;" })[m];
    });
}

function appendUniversityRow(uni) {
    if (!tbodyUnis) return;
    const tr = document.createElement('tr');
    // include email and contact columns to match server-rendered table
    tr.innerHTML = `<td>${escapeHtml(uni.name || '')}</td><td>${escapeHtml(uni.location || '-')}</td><td>${escapeHtml(uni.website || '-')}</td><td>${escapeHtml(uni.email || '-')}</td><td>${escapeHtml(uni.phone || '-')}</td><td class="actions"><button class="icon-btn" data-id="${uni.id || ''}" onclick="onEdit('university', this.dataset.id)">✎</button><button class="icon-btn" data-id="${uni.id || ''}" onclick="onDelete('university', this.dataset.id)">🗑</button></td>`;
    tbodyUnis.appendChild(tr);
}

function appendFacultyRow(fac) {
    if (!tbodyFacs) return;
    const tr = document.createElement('tr');
    const uniName = (_UNIS.find(u => u.id === String(fac.universityId)) || {}).name || '';
    // render email and phone columns
    tr.innerHTML = `<td>${escapeHtml(fac.name || '')}</td><td>${escapeHtml(uniName || '-')}</td><td>${escapeHtml(fac.email || '-')}</td><td>${escapeHtml(fac.phone || '-')}</td><td class="actions"><button class="icon-btn" data-id="${fac.id || ''}" onclick="onEdit('faculty', this.dataset.id)">✎</button><button class="icon-btn" data-id="${fac.id || ''}" onclick="onDelete('faculty', this.dataset.id)">🗑</button></td>`;
    tbodyFacs.appendChild(tr);
}

function appendDepartmentRow(dep) {
    if (!tbodyDeps) return;
    const tr = document.createElement('tr');
    const fac = (_FACS.find(f => f.id === String(dep.facultyId)) || {});
    const uniName = (_UNIS.find(u => u.id === String(dep.universityId)) || {}).name || '';
    // include email and phone columns for departments
    tr.innerHTML = `<td>${escapeHtml(dep.name || '')}</td><td>${escapeHtml(fac.name || '-')}</td><td>${escapeHtml(uniName || '-')}</td><td>${escapeHtml(dep.email || '-')}</td><td>${escapeHtml(dep.phone || '-')}</td><td class="actions"><button class="icon-btn" data-id="${dep.id || ''}" onclick="onEdit('department', this.dataset.id)">✎</button><button class="icon-btn" data-id="${dep.id || ''}" onclick="onDelete('department', this.dataset.id)">🗑</button></td>`;
    tbodyDeps.appendChild(tr);
}

// ช่วยเติมแถวกิจกรรม
function appendEventRow(ev) {
    const tbody = document.querySelector('#panel-events tbody');
    if (!tbody) return;
    const tr = document.createElement('tr');
    // store full event data in data- attributes for editing (table shows a compact set of columns)
    tr.dataset.id = ev.id || '';
    tr.dataset.title = ev.title || '';
    tr.dataset.description = ev.description || '';
    tr.dataset.location = ev.location || '';
    tr.dataset.startTime = ev.start_time || ev.start || '';
    tr.dataset.endTime = ev.end_time || ev.end || '';
    tr.dataset.category = ev.category || '';
    tr.dataset.university = ev.university || '';
    tr.dataset.faculty = ev.faculty || '';
    tr.dataset.department = ev.department || '';
    tr.innerHTML = `<td>${escapeHtml(ev.title || '')}</td><td>${escapeHtml(ev.description || '-')}</td><td>${escapeHtml(ev.category || '-')}</td><td>${escapeHtml(ev.university || '-')}</td><td>${escapeHtml(ev.faculty || '-')}</td><td>${escapeHtml(ev.department || '-')}</td><td class="actions"><button class="icon-btn" data-id="${ev.id || ''}" onclick="onEdit('event', this.dataset.id)">✎</button><button class="icon-btn" data-id="${ev.id || ''}" onclick="onDelete('event', this.dataset.id)">🗑</button></td>`;
    tbody.appendChild(tr);
}

function appendAnnouncementRow(a) {
    const tbody = document.querySelector('#panel-announcements tbody');
    if (!tbody) return;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${escapeHtml(a.title || '')}</td><td>${escapeHtml(a.description || '-')}</td><td>${escapeHtml(a.university || '-')}</td><td>${escapeHtml(a.faculty || '-')}</td><td>${escapeHtml(a.department || '-')}</td><td class="actions"><button class="icon-btn" data-id="${a.id || ''}" onclick="onEdit('announcement', this.dataset.id)">✎</button><button class="icon-btn" data-id="${a.id || ''}" onclick="onDelete('announcement', this.dataset.id)">🗑</button></td>`;
    tbody.appendChild(tr);
}


/* -------------------------
   5) Modal การเปิด/ปิด และการส่งฟอร์ม (สร้างรายการใหม่)
   ------------------------- */
function onAdd(type) {
    // ตั้งค่า type ของ modal และ title ตามประเภท
    addModal.dataset.type = type;
    // ensure editMode is cleared when adding
    addModal.dataset.editMode = 'false';
    addModal.dataset.editId = '';
    addModalTitle.textContent = (type === 'university') ? 'เพิ่มมหาวิทยาลัย' : (type === 'faculty') ? 'เพิ่มคณะ' : (type === 'department') ? 'เพิ่มสาขา' : (type === 'event') ? 'เพิ่มกิจกรรม' : 'เพิ่มรายการ';

    // ซ่อนทุกฟอร์มย่อย แล้วเปิดเฉพาะฟอร์มที่ต้องการ
    [formUniversity, formFaculty, formDepartment, document.getElementById('form-event'), document.getElementById('form-announcement')].forEach(el => { if (el) el.classList.add('hidden'); });
    if (type === 'university') formUniversity.classList.remove('hidden');
    if (type === 'faculty') formFaculty.classList.remove('hidden');
    if (type === 'department') formDepartment.classList.remove('hidden');
    if (type === 'event' && document.getElementById('form-event')) {
        document.getElementById('form-event').classList.remove('hidden');
        populateUniversitySelect(eventUniversitySelect);
        populateFacultySelectForUniversity(eventFacultySelect, eventUniversitySelect.value || '');
    }
    if (type === 'announcement' && document.getElementById('form-announcement')) {
        document.getElementById('form-announcement').classList.remove('hidden');
        if (annUniversitySelect) populateUniversitySelect(annUniversitySelect);
    }

    // รีเซ็ต input ทั่วไป
    ['uniNameInput', 'uniLocationInput', 'uniWebsiteInput', 'uniEmailInput', 'uniContactInput', 'facNameInput', 'facEmailInput', 'facPhoneInput', 'deptNameInput', 'deptEmailInput', 'deptPhoneInput'].forEach(k => {
        try { if (window[k]) window[k].value = ''; } catch (e) { }
    });
    if (deptFacultySelect) deptFacultySelect.innerHTML = '<option value="">-- เลือกคณะ --</option>';
    if (eventUniversitySelect) eventUniversitySelect.value = '';
    if (eventFacultySelect) eventFacultySelect.innerHTML = '<option value="">-- ทุกคณะ --</option>';
    if (eventCategorySelect) eventCategorySelect.value = '';
    if (eventMajorInput) eventMajorInput.value = '';
    if (eventTitleInput) eventTitleInput.value = '';
    if (eventDescriptionInput) eventDescriptionInput.value = '';
    if (eventLocationInput) eventLocationInput.value = '';

    // แสดง modal
    document.documentElement.classList.add('modal-open');
    addModal.classList.remove('hidden');
    addModal.setAttribute('aria-hidden', 'false');

    // focus input แรกหลังอนิเมชัน
    setTimeout(() => { const first = addModal.querySelector('input, select'); if (first) first.focus(); }, 160);
}

function closeAddModal() {
    document.documentElement.classList.remove('modal-open');
    addModal.classList.add('hidden');
    addModal.dataset.type = '';
    addModal.dataset.editMode = 'false';
    addModal.dataset.editId = '';
    addModal.setAttribute('aria-hidden', 'true');
}
addModalCancel.addEventListener('click', () => closeAddModal());
document.addEventListener('click', (e) => {
    if (!document.documentElement.classList.contains('modal-open')) return;
    if (e.target.closest && e.target.closest('.modal-box')) return;
    if (e.target.classList && e.target.classList.contains('modal-backdrop')) closeAddModal();
});


// dependent selects handlers (duplicate safe)
if (deptUniversitySelect) deptUniversitySelect.addEventListener('change', (e) => populateFacultySelectForUniversity(deptFacultySelect, e.target.value));
if (eventUniversitySelect) eventUniversitySelect.addEventListener('change', (e) => {
    populateFacultySelectForUniversity(eventFacultySelect, e.target.value);
    populateDepartmentSelectForFaculty(eventMajorInput, e.target.value, eventFacultySelect.value || '');
});
if (eventFacultySelect) eventFacultySelect.addEventListener('change', (e) => populateDepartmentSelectForFaculty(eventMajorInput, eventUniversitySelect.value || '', e.target.value || ''));


// ส่งฟอร์มสำหรับเพิ่มรายการ (university/faculty/department/event/announcement)
addModalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = addModal.dataset.type || 'item';
    try {
         if (type === 'university') {
            const editMode = addModal.dataset.editMode === 'true';
           const editId = addModal.dataset.editId || null;
            const payload = { name: uniNameInput.value.trim(), abbreviation: uniAbbreviationInput.value.trim(), location: uniLocationInput.value.trim(), website: uniWebsiteInput.value.trim(), email: uniEmailInput.value.trim() || null, phone: uniContactInput.value.trim() || null };
            if (!payload.name) return alert('กรุณากรอกชื่อมหาวิทยาลัย');
            if (editMode && editId) {
                const res = await fetch('/admin/universities/' + editId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.message || 'Server error');
                alert('แก้ไขมหาวิทยาลัยเรียบร้อยแล้ว');
                return location.reload();
            } else {
                const res = await fetch('/admin/universities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.message || 'Server error');
                const newUni = { id: String(data.id), name: payload.name, abbreviation: payload.abbreviation, location: payload.location, website: payload.website, email: payload.email, phone: payload.phone };
                _UNIS.push(newUni);
                window.__UNIVERSITIES = _UNIS;
                populateUniversitySelect(facUniversitySelect);
                populateUniversitySelect(deptUniversitySelect);
                appendUniversityRow(newUni);
                alert('เพิ่มมหาวิทยาลัยสำเร็จ');
            }

        } else if (type === 'faculty') {
            const editMode = addModal.dataset.editMode === 'true';
            const editId = addModal.dataset.editId || null;
            const uniId = facUniversitySelect.value;
            const uniName = facUniversitySelect.selectedOptions[0]?.textContent?.trim() || '';
            const payload = { university: uniName, name: facNameInput.value.trim(), email: facEmailInput.value.trim() || null, phone: facPhoneInput.value.trim() || null };
            if (!payload.university || !payload.name) return alert('กรุณาเลือกมหาวิทยาลัยและกรอกชื่อคณะ');
            if (editMode && editId) {
                const res = await fetch('/admin/faculties/' + editId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.message || 'Server error');
                alert('แก้ไขคณะเรียบร้อยแล้ว');
                return location.reload();
            } else {
                const res = await fetch('/admin/faculties', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.message || 'Server error');
                const newFac = { id: String(data.id), name: payload.name, universityId: uniId, email: payload.email, phone: payload.phone };
                _FACS.push(newFac);
                window.__FACULTIES = _FACS;
                populateFacultySelectForUniversity(deptFacultySelect, deptUniversitySelect.value);
                appendFacultyRow(newFac);
                alert('เพิ่มคณะสำเร็จ');
            }

        } else if (type === 'department') {
            const editMode = addModal.dataset.editMode === 'true';
            const editId = addModal.dataset.editId || null;
            const payload = { university: deptUniversitySelect.selectedOptions[0]?.textContent?.trim() || '', faculty: deptFacultySelect.selectedOptions[0]?.textContent?.trim() || '', name: deptNameInput.value.trim(), email: deptEmailInput.value.trim() || null, phone: deptPhoneInput.value.trim() || null };
            if (!payload.university || !payload.faculty || !payload.name) return alert('กรุณากรอกข้อมูลให้ครบ');
            if (editMode && editId) {
                const res = await fetch('/admin/departments/' + editId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.message || 'Server error');
                alert('แก้ไขสาขาเรียบร้อยแล้ว');
                return location.reload();
            } else {
                const res = await fetch('/admin/departments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.message || 'Server error');
                const deptObj = { id: String(data.id), name: payload.name, facultyId: (_FACS.find(f => f.name === payload.faculty) || {}).id, universityId: (_UNIS.find(u => u.name === payload.university) || {}).id, email: payload.email, phone: payload.phone };
                appendDepartmentRow(deptObj);
                alert('เพิ่มสาขาสำเร็จ');
            }

        } else if (type === 'event') {
            // สร้าง payload และตรวจสอบช่วงเวลา
            const uniId = eventUniversitySelect.value || '';
            const uniName = uniId ? (eventUniversitySelect.selectedOptions[0]?.textContent?.trim() || '') : '';
            const facId = eventFacultySelect.value || '';
            const facName = facId ? (eventFacultySelect.selectedOptions[0]?.textContent?.trim() || '') : '';
            const depId = eventMajorInput.value || '';
            let depName = '';
            if (depId) { const d = (_DEPS || []).find(x => String(x.id) === String(depId)); depName = d ? d.name : (eventMajorInput.selectedOptions[0]?.textContent?.trim() || ''); }

            const payload = {
                universityId: uniId,
                university: uniName,
                facultyId: facId,
                faculty: facName,
                major: depName || null,
                departmentId: depId || null,
                title: eventTitleInput.value.trim() || '',
                description: eventDescriptionInput.value.trim() || '',
                location: eventLocationInput.value.trim() || '',
                startTime: eventStartInput.value || '',
                endTime: eventEndInput.value || '',
                category: eventCategorySelect?.value || ''
            };
            if (!payload.title) return alert('กรุณากรอกชื่อกิจกรรม');
            if (!payload.startTime || !payload.endTime) return alert('กรุณาเลือกเวลาเริ่มและเวลาสิ้นสุด');
            const s = new Date(payload.startTime);
            const e = new Date(payload.endTime);
            if (isNaN(s) || isNaN(e) || s >= e) return alert('ช่วงเวลาที่เลือกไม่ถูกต้อง (ช่วงเริ่มต้นต้องน้อยกว่าช่วงสิ้นสุด)');

            // กรณีต้องเติมคณะจากสาขา
            const selectedDepId = eventMajorInput && eventMajorInput.value ? String(eventMajorInput.value) : '';
            if (selectedDepId && (!payload.facultyId || String(payload.facultyId).trim() === '')) {
                const depObj = (_DEPS || []).find(d => String(d.id) === String(selectedDepId));
                if (depObj) {
                    payload.major = depObj.name || payload.major || '';
                    const facObj = (_FACS || []).find(f => String(f.id) === String(depObj.facultyId));
                    if (facObj) { payload.faculty = facObj.name || ''; payload.facultyId = facObj.id || ''; }
                }
            } else if (selectedDepId) {
                const depObj2 = (_DEPS || []).find(d => String(d.id) === String(selectedDepId));
                if (depObj2) payload.major = depObj2.name || payload.major || '';
            }

            const editMode = addModal.dataset.editMode === 'true';
            const editId = addModal.dataset.editId || null;
            let res;
            try {
                if (editMode && editId) {
                    res = await fetch('/admin/events/' + editId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: payload.title, description: payload.description, location: payload.location, startTime: payload.startTime, endTime: payload.endTime, category: payload.category, university: payload.university, universityId: payload.universityId, faculty: payload.faculty, facultyId: payload.facultyId, department: payload.major, departmentId: payload.departmentId }) });
                } else {
                    res = await fetch('/admin/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                }
            } catch (err) { res = null; console.warn('Network error posting/putting event:', err); }

            if (res && res.ok) {
                const data = await res.json().catch(() => ({}));
                if (editMode && editId) {
                    alert('แก้ไขกิจกรรมเรียบร้อยแล้ว');
                    return location.reload();
                } else {
                    const newEvent = { id: String(data.id || ''), title: payload.title, description: payload.description || '', location: payload.location || '', start_time: payload.startTime || '', end_time: payload.endTime || '', category: payload.category || '', university: payload.university || '', faculty: payload.faculty || '', department: payload.major || '' };
                    appendEventRow(newEvent);
                    alert('เพิ่มกิจกรรมสำเร็จ');
                }
            } else {
                // server returned error or network failure: show informative message and do not perform client-only fallback
                if (res) {
                    const errBody = await res.json().catch(() => null);
                    const msg = (errBody && errBody.message) ? errBody.message : (res.statusText || ('status ' + res.status));
                    alert('ไม่สามารถบันทึกกิจกรรมบนเซิร์ฟเวอร์: ' + msg);
                } else {
                    alert('ไม่สามารถติดต่อเซิร์ฟเวอร์เพื่อบันทึกกิจกรรม โปรดลองอีกครั้ง');
                }
                return;
            }

        } else if (type === 'announcement') {
            const editMode = addModal.dataset.editMode === 'true';
            const editId = addModal.dataset.editId || null;
            const payload = { title: annTitleInput.value.trim(), description: annDescriptionInput.value.trim(), university: annUniversitySelect.selectedOptions[0]?.textContent?.trim() || '', faculty: annFacultyInput.value.trim() || undefined, department: annDepartmentInput.value.trim() || undefined };
            if (!payload.title) return alert('กรุณากรอกหัวข้อประกาศ');
            let resAnn;
            try {
                if (editMode && editId) {
                    resAnn = await fetch('/admin/announcements/' + editId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                } else {
                    resAnn = await fetch('/admin/announcements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                }
            } catch (x) { resAnn = null; }
            if (resAnn && resAnn.ok) {
                const data = await resAnn.json().catch(() => ({}));
                if (editMode && editId) {
                    alert('แก้ไขประกาศเรียบร้อยแล้ว');
                    return location.reload();
                }
                const newAnn = { id: String(data.id || ''), title: payload.title, description: payload.description, university: payload.university, faculty: payload.faculty, department: payload.department };
                appendAnnouncementRow(newAnn);
                alert(editMode ? 'แก้ไขประกาศสำเร็จ' : 'เพิ่มประกาศสำเร็จ');
            } else {
                // error saving announcement on server — report and abort (no client-only fallback)
                if (resAnn) {
                    const errBody = await resAnn.json().catch(() => null);
                    const msg = (errBody && errBody.message) ? errBody.message : (resAnn.statusText || ('status ' + resAnn.status));
                    alert('ไม่สามารถบันทึกประกาศบนเซิร์ฟเวอร์: ' + msg);
                } else {
                    alert('ไม่สามารถติดต่อเซิร์ฟเวอร์เพื่อบันทึกประกาศ โปรดลองอีกครั้ง');
                }
                return;
            }
        } else {
            const name = (document.getElementById('add-modal-name') || {}).value || '';
            console.log('Add generic (UI only):', { type, name });
        }
        closeAddModal();
    } catch (err) {
        console.error(err);
        alert(err.message || 'เกิดข้อผิดพลาด');
    }
});


/* -------------------------
   6) การสลับแท็บ และ placeholder ของ edit/delete
   ------------------------- */
document.querySelectorAll('.tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const name = tab.dataset.tab;
        document.querySelectorAll('section.panel').forEach(p => p.style.display = 'none');
        const panel = document.getElementById('panel-' + name);
        if (panel) panel.style.display = '';
    });
});

// Implement edit and delete flows using the server endpoints we added
async function onEdit(type, id) {
    const parsedId = id ? String(id) : null;
    if (!parsedId) return alert('Invalid id');

    // set modal into edit mode and remember id
    addModal.dataset.type = type;
    addModal.dataset.editMode = 'true';
    addModal.dataset.editId = parsedId;
    addModalTitle.textContent = (type === 'university') ? 'แก้ไขมหาวิทยาลัย' : (type === 'faculty') ? 'แก้ไขคณะ' : (type === 'department') ? 'แก้ไขสาขา' : 'แก้ไขรายการ';

    // hide all subforms then show the one we need
    [formUniversity, formFaculty, formDepartment, document.getElementById('form-event'), document.getElementById('form-announcement')].forEach(el => { if (el) el.classList.add('hidden'); });

    if (type === 'university') {
        const current = _UNIS.find(u => String(u.id) === String(parsedId)) || {};
        formUniversity.classList.remove('hidden');
        uniNameInput.value = current.name || '';
        uniLocationInput.value = current.location || '';
        uniWebsiteInput.value = current.website || '';
        uniEmailInput.value = current.email || '';
        uniContactInput.value = current.phone || '';
    }

    if (type === 'faculty') {
        const current = _FACS.find(f => String(f.id) === String(parsedId)) || {};
        formFaculty.classList.remove('hidden');
        // ensure universities select is ready
        populateUniversitySelect(facUniversitySelect);
        facUniversitySelect.value = current.universityId || '';
        facNameInput.value = current.name || '';
        facEmailInput.value = current.email || '';
        facPhoneInput.value = current.phone || '';
    }

    if (type === 'department') {
        const current = _DEPS.find(d => String(d.id) === String(parsedId)) || {};
        formDepartment.classList.remove('hidden');
        populateUniversitySelect(deptUniversitySelect);
        deptUniversitySelect.value = current.universityId || '';
        // populate faculties for this university then select
        await populateFacultySelectForUniversity(deptFacultySelect, deptUniversitySelect.value || '');
        deptFacultySelect.value = current.facultyId || '';
        deptNameInput.value = current.name || '';
        deptEmailInput.value = current.email || '';
        deptPhoneInput.value = current.phone || '';
    }

    if (type === 'event') {
        // populate event form from data-* attributes on the row (we keep table compact)
        const btn = document.querySelector('#panel-events button.icon-btn[data-id="' + parsedId + '"]');
        const tr = btn ? btn.closest('tr') : null;
        if (document.getElementById('form-event') && tr) {
            document.getElementById('form-event').classList.remove('hidden');
            populateUniversitySelect(eventUniversitySelect);
            eventTitleInput.value = (tr.dataset.title || '').trim();
            eventDescriptionInput.value = (tr.dataset.description || '').trim();
            eventLocationInput.value = (tr.dataset.location || '').trim();
            try { if (tr.dataset.startTime) eventStartInput.value = (new Date(tr.dataset.startTime)).toISOString().slice(0,16); } catch(e) {}
            try { if (tr.dataset.endTime) eventEndInput.value = (new Date(tr.dataset.endTime)).toISOString().slice(0,16); } catch(e) {}
            if (tr.dataset.category) eventCategorySelect.value = tr.dataset.category;
            // select university option by displayed name
            if (tr.dataset.university) {
                const uniOption = Array.from(eventUniversitySelect.options).find(o => (o.textContent || '').trim() === tr.dataset.university.trim());
                if (uniOption) eventUniversitySelect.value = uniOption.value;
            }
            // populate faculties after university selected
            await populateFacultySelectForUniversity(eventFacultySelect, eventUniversitySelect.value || '');
            if (tr.dataset.faculty) {
                const facOption = Array.from(eventFacultySelect.options).find(o => (o.textContent || '').trim() === tr.dataset.faculty.trim());
                if (facOption) eventFacultySelect.value = facOption.value;
            }
            // set department select if possible
            if (tr.dataset.department) {
                const depOpt = Array.from((eventMajorInput.options || [])).find(o => (o.textContent || '').trim() === tr.dataset.department.trim());
                if (depOpt) eventMajorInput.value = depOpt.value;
                else eventMajorInput.value = tr.dataset.department;
            }
        }
    }

    if (type === 'announcement') {
        const btn = document.querySelector('#panel-announcements button.icon-btn[data-id="' + parsedId + '"]');
        const tr = btn ? btn.closest('tr') : null;
        const cells = tr ? Array.from(tr.querySelectorAll('td')) : [];
        if (document.getElementById('form-announcement')) {
            document.getElementById('form-announcement').classList.remove('hidden');
            annTitleInput.value = (cells[0] && cells[0].textContent) ? cells[0].textContent.trim() : '';
            annDescriptionInput.value = (cells[1] && cells[1].textContent) ? cells[1].textContent.trim() : '';
            if (cells[2] && cells[2].textContent) {
                populateUniversitySelect(annUniversitySelect);
                const uniName = cells[2].textContent.trim();
                const opt = Array.from(annUniversitySelect.options).find(o => (o.textContent || '').trim() === uniName);
                if (opt) annUniversitySelect.value = opt.value;
            }
            annFacultyInput.value = (cells[3] && cells[3].textContent) ? cells[3].textContent.trim() : '';
            annDepartmentInput.value = (cells[4] && cells[4].textContent) ? cells[4].textContent.trim() : '';
        }
    }

    // show modal
    document.documentElement.classList.add('modal-open');
    addModal.classList.remove('hidden');
    addModal.setAttribute('aria-hidden', 'false');
    setTimeout(() => { const first = addModal.querySelector('input, select'); if (first) first.focus(); }, 160);
}

async function onDelete(type, id) {
    const parsedId = id ? String(id) : null;
    if (!parsedId) return alert('Invalid id');
    if (!confirm('ยืนยันการลบ ' + type + ' id=' + parsedId + ' ?')) return;

    try {
        let url = null;
    if (type === 'university') url = '/admin/universities/' + parsedId;
    if (type === 'faculty') url = '/admin/faculties/' + parsedId;
    if (type === 'department') url = '/admin/departments/' + parsedId;
    if (type === 'event') url = '/admin/events/' + parsedId;
    if (type === 'announcement') url = '/admin/announcements/' + parsedId;
        if (!url) return alert('Unknown type');
        const res = await fetch(url, { method: 'DELETE' });
        if (!res.ok) throw new Error((await res.json().catch(()=>({message:res.statusText}))).message || 'Delete failed');
        alert('ลบเรียบร้อยแล้ว');
        return location.reload();
    } catch (err) {
        console.error(err);
        alert(err.message || 'เกิดข้อผิดพลาดในการลบ');
    }
}

// เปิดเผย helper แบบสาธารณะไว้ให้โค้ดอื่นเรียกใช้งานได้
window.onAdd = onAdd;
window.onEdit = onEdit;
window.onDelete = onDelete;
window.appendUniversityRow = appendUniversityRow;
window.appendFacultyRow = appendFacultyRow;
window.appendDepartmentRow = appendDepartmentRow;
window.appendEventRow = appendEventRow;
window.appendAnnouncementRow = appendAnnouncementRow;