document.addEventListener('DOMContentLoaded', function() {
	const qForm = document.getElementById('question-form');
	const questionsList = document.getElementById('questions-list');
	const askModal = document.getElementById('ask-modal');
	const openAskBtn = document.getElementById('open-ask-modal');
	let lastFocused;

	function openModal(){
		if(!askModal) return; 
		lastFocused = document.activeElement;
		askModal.classList.add('active');
		document.body.classList.add('modal-open');
		askModal.querySelector('#q-title')?.focus();
		askModal.setAttribute('aria-hidden','false');
	}
	function closeModal(){
		if(!askModal) return; 
		askModal.classList.remove('active');
		document.body.classList.remove('modal-open');
		askModal.setAttribute('aria-hidden','true');
		if(lastFocused) lastFocused.focus();
		qForm?.reset();
	}

	openAskBtn?.addEventListener('click', openModal);
	askModal?.addEventListener('click', function(e){
		if(e.target.matches('[data-close="modal"], .modal-overlay')) closeModal();
	});
	document.addEventListener('keydown', function(e){
		if(e.key === 'Escape' && askModal?.classList.contains('active')) closeModal();
	});

	function formatDate(d) {
		const dt = new Date(d);
		if (isNaN(dt)) return d;
		return dt.toISOString().slice(0,10);
	}

	qForm && qForm.addEventListener('submit', function(e){
		e.preventDefault();
		const title = document.getElementById('q-title').value.trim();
		const body = document.getElementById('q-body').value.trim();
		const author = document.getElementById('q-author').value.trim() || 'Anonymous';
		if (!title || !body) return;

		// create a new question element and prepend
		const id = 'q_' + Date.now();
		const article = document.createElement('article');
		article.className = 'question';
		article.setAttribute('data-id', id);
		article.innerHTML = `
			<div class="tags"></div>
			<div class="title">${escapeHtml(title)}</div>
			<div class="meta-row">
				<div class="meta">โดย ${escapeHtml(author)}</div>
				<div class="meta">${formatDate(new Date())}</div>
				<div class="meta">0 views</div>
			</div>
			<div class="q-stats">
				<div class="stat like-btn" data-likes="0">❤️ <span class="like-count">0</span></div>
				<div class="stat answers-count" data-answers="0">💬 <span class="ans-count">0</span> Answers</div>
			</div>
			<div class="body"><p>${escapeHtml(body)}</p></div>
			<div class="answers">
				<h4>คำตอบ</h4>
				<div class="no-answers">ยังไม่มีคำตอบ</div>
				<form class="answer-form" data-qid="${id}">
					<textarea name="answer" rows="2" placeholder="เขียนคำตอบ..." required></textarea>
					<input type="text" name="author" placeholder="ชื่อ (ตัวเลือก)" />
					<button type="submit">เพิ่มคำตอบ</button>
				</form>
			</div>
		`;

		// insert at top
		const first = questionsList.firstChild;
		questionsList.insertBefore(article, first);

		// clear form
		qForm.reset();
		closeModal();
	});

	// delegate answer form submissions
	document.body.addEventListener('submit', function(e){
		if (e.target && e.target.classList.contains('answer-form')) {
			e.preventDefault();
			const form = e.target;
			const qid = form.getAttribute('data-qid');
			const answerText = form.querySelector('textarea[name="answer"]').value.trim();
			const author = form.querySelector('input[name="author"]').value.trim() || 'Anonymous';
			if (!answerText) return;

			const parent = form.parentElement;
			// remove no-answers if exists
			const noAns = parent.querySelector('.no-answers');
			if (noAns) noAns.remove();

			const div = document.createElement('div');
			div.className = 'answer';
			div.innerHTML = `<div class="meta">${escapeHtml(author)} • ${formatDate(new Date())}</div><div class="body">${escapeHtml(answerText)}</div>`;
			parent.insertBefore(div, form);

			form.reset();

			// update answer count in stats row (if exists)
			const questionEl = form.closest('.question');
			const ansCountEl = questionEl?.querySelector('.ans-count');
			if(ansCountEl){
				const current = parseInt(ansCountEl.textContent || '0',10) + 1;
				ansCountEl.textContent = current;
			}
		}
	});

	// like button toggle (event delegation)
	document.body.addEventListener('click', function(e){
		// Like button
		const like = e.target.closest('.like-btn');
		if(like){
			let countSpan = like.querySelector('.like-count');
			let count = parseInt(countSpan.textContent||'0',10);
			if(like.classList.contains('liked')){ like.classList.remove('liked'); count = Math.max(0,count-1);} else { like.classList.add('liked'); count++; }
			countSpan.textContent = count;
			return;
		}

		// Answer toggle button
		const toggleBtn = e.target.closest('.answer-toggle');
		if(toggleBtn){
			const question = toggleBtn.closest('.question');
			if(!question) return;
			const answersBlock = question.querySelector('.answers');
			const wrapper = answersBlock.querySelector('.answer-form-wrapper');
			if(wrapper){
				const hidden = wrapper.hasAttribute('hidden');
				if(hidden){
					wrapper.removeAttribute('hidden');
					const textarea = wrapper.querySelector('.answer-editor');
					textarea && textarea.focus();
					toggleBtn.classList.add('active');
					answersBlock.setAttribute('data-expanded','true');
				} else {
					wrapper.setAttribute('hidden','');
					toggleBtn.classList.remove('active');
					answersBlock.setAttribute('data-expanded','false');
				}
			}
			return;
		}

		// Cancel answer
		if(e.target.matches('[data-action="cancel-answer"], .btn-cancel-answer')){
			const wrapper = e.target.closest('.answer-form-wrapper');
			if(wrapper){
				wrapper.setAttribute('hidden','');
				const q = wrapper.closest('.question');
				q?.querySelector('.answer-toggle')?.classList.remove('active');
				q?.querySelector('.answers')?.setAttribute('data-expanded','false');
			}
			return;
		}
	});

	function escapeHtml(str) {
		return String(str).replace(/[&<>"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]; });
	}
});
