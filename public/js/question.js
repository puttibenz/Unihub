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
		if(!title || !body) return;
		fetch('/api/posts', {
			method:'POST',
			headers:{'Content-Type':'application/json'},
			body: JSON.stringify({ title, body })
		}).then(r=>r.json()).then(data=>{
			if(data.error){ alert(data.error); return; }
			const article = document.createElement('article');
			article.className='question';
			article.setAttribute('data-id', data.id);
			article.innerHTML = `
				<div class="tags"></div>
				<div class="title">${escapeHtml(data.title)}</div>
				<div class="meta-row">
					<div class="meta">โดย ${escapeHtml(data.author||'Anonymous')}</div>
					<div class="meta">${escapeHtml(data.createdAt)}</div>
					<div class="meta">0 views</div>
				</div>
				<div class="q-stats">
					<div class="stat like-btn" data-likes="0">❤️ <span class="like-count">0</span></div>
					<div class="stat answers-count" data-answers="0">💬 <span class="ans-count">0</span> Answers</div>
					<button class="answer-toggle btn-outline" type="button">Answer</button>
				</div>
				<div class="body"><p>${escapeHtml(data.body)}</p></div>
				<div class="answers" data-expanded="false">
					<h4>คำตอบ</h4>
					<div class="no-answers">ยังไม่มีคำตอบ</div>
					<div class="answer-form-wrapper" hidden>
						<form class="answer-form" data-qid="${data.id}">
							<textarea class="answer-editor" name="answer" rows="3" placeholder="Write your answer..." required></textarea>
							<div class="answer-actions">
								<button type="button" class="btn-cancel-answer" data-action="cancel-answer">Cancel</button>
								<button type="submit" class="btn-post-answer">Post Answer</button>
							</div>
							<input type="text" name="author" class="answer-author-input" placeholder="ชื่อ (ตัวเลือก)" />
						</form>
					</div>
				</div>`;
			questionsList.insertBefore(article, questionsList.firstChild);
			qForm.reset();
			closeModal();
		}).catch(err=>{
			console.error(err);
			alert('Error creating question');
		});
	});

	// delegate answer form submissions
	document.body.addEventListener('submit', function(e){
		if (e.target && e.target.classList.contains('answer-form')) {
			e.preventDefault();
			const form = e.target;
			const qid = form.getAttribute('data-qid');
			const answerText = form.querySelector('textarea[name="answer"]').value.trim();
			if (!answerText) return;
			fetch(`/api/posts/${qid}/comments`, {
				method:'POST',
				headers:{'Content-Type':'application/json'},
				body: JSON.stringify({ body: answerText })
			}).then(r=>r.json()).then(data=>{
				if(data.error){ alert(data.error); return; }
				// Correct container for answers is the .answers block, not the wrapper of the form
				const answersBlock = form.closest('.answers');
				const wrapper = form.closest('.answer-form-wrapper');
				if(!answersBlock || !wrapper){ return; }
				// Remove placeholder 'no answers' (it's a sibling of wrapper)
				const noAns = answersBlock.querySelector('.no-answers');
				if (noAns) noAns.remove();
				const div = document.createElement('div');
				div.className = 'answer';
				div.innerHTML = `<div class="meta">${escapeHtml(data.author)} • ${escapeHtml(data.createdAt)}</div><div class="body">${escapeHtml(data.body)}</div>`;
				// Insert new answer before the form wrapper (so form stays at bottom)
				answersBlock.insertBefore(div, wrapper);
				form.reset();
				const questionEl = form.closest('.question');
				const ansCountEl = questionEl?.querySelector('.ans-count');
				if(ansCountEl){
					const current = parseInt(ansCountEl.textContent || '0',10) + 1;
					ansCountEl.textContent = current;
				}
			}).catch(err=>{
				console.error(err);
				alert('Error posting answer');
			});
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
