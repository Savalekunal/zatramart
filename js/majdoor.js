/* ============================================
   ZatraMart — Majdoor Sewa (labour marketplace) page script
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {
  const esc = window.KM.esc;
  const { workerLabels } = window.KM_DATA;
  let workers = window.KM_DATA.workers;
  let jobPosts = [];

  const workerGrid = document.getElementById('workerGrid');
  const jobPostGrid = document.getElementById('jobPostGrid');
  const majdoorFilters = document.getElementById('majdoorFilters');
  const viewTabs = document.getElementById('majdoorViewTabs');
  const jobPostCount = document.getElementById('jobPostCount');
  const overlay = document.getElementById('overlay');
  let activeSkill = 'all';
  let activeView = 'workers';
  let searchTerm = '';
  let reviewStats = {};

  const skillKeys = Object.keys(workerLabels);

  const usedSkills = [...new Set(workers.map(w => w.skill))];
  majdoorFilters.innerHTML = ['all', ...usedSkills].map(s => `
    <button class="chip-filter light ${s === 'all' ? 'active' : ''}" data-skill="${s}">
      ${s === 'all' ? '🌐 Sabhi' : workerLabels[s]}
    </button>`).join('');

  /* ---------- Merge real, registered worker profiles in front of the seed roster ---------- */
  async function loadRealWorkers() {
    const [real, stats] = await Promise.all([window.KM.getWorkerProfiles(), window.KM.getAllWorkerReviewStats()]);
    workers = [...real, ...window.KM_DATA.workers];
    reviewStats = stats;
    renderWorkers();
  }
  async function loadJobPosts() {
    jobPosts = await window.KM.getJobPosts();
    jobPostCount.textContent = jobPosts.length ? `(${jobPosts.length})` : '';
    renderJobPosts();
  }

  function daysAgoLabel(days) {
    if (days === 0) return 'Aaj';
    if (days === 1) return 'Kal';
    return `${days} din pehle`;
  }

  function isVideoUrl(url) { return /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(url); }
  function mediaHTML(url) {
    return isVideoUrl(url)
      ? `<video src="${esc(url)}" muted playsinline controls></video>`
      : `<img src="${esc(url)}" alt="">`;
  }

  function bookWorker(w) {
    if (w.real && w.userId) {
      window.KM.openContactModal({ listingType: 'worker', listingId: w.id, listingName: `${w.name} (${workerLabels[w.skill] || w.skill})`, sellerId: w.userId, sellerPhone: w.workerPhone });
    } else {
      if (!window.KM.isLoggedIn()) { window.KM.openAuth(); window.KM.toast('Majdoor book karne ke liye pehle login karein 👤'); return; }
      window.KM.toast('Majdoor ki jaankari WhatsApp par bheji ja rahi hai... 📲');
    }
  }

  function renderWorkers() {
    let list = activeSkill === 'all' ? workers : workers.filter(w => w.skill === activeSkill);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(w => w.name.toLowerCase().includes(q) || (workerLabels[w.skill] || w.skill).toLowerCase().includes(q) || w.loc.toLowerCase().includes(q));
    }
    workerGrid.innerHTML = list.length ? list.map(w => {
      const stats = w.real ? reviewStats[w.id] : null;
      const ratingHTML = w.real
        ? (stats ? `<span class="worker-stars">★ ${stats.avg.toFixed(1)} <small>(${stats.count})</small></span>` : `<span class="worker-new-badge">🆕 Naya</span>`)
        : `<span class="worker-stars">★ ${w.rating || '5.0'}</span>`;
      return `
      <div class="worker-card">
        <div class="worker-top worker-clickable" data-view-worker="${w.id}">
          <img src="${esc(w.img) || 'https://images.unsplash.com/photo-1779518080522-cdc7cc1b505f?auto=format&fit=crop&w=440&q=70'}" alt="${esc(w.name)}">
          <span class="worker-status ${w.available ? 'online' : 'offline'}">${w.available ? '🟢 Available' : '⚪ Busy'}</span>
        </div>
        <h4 class="worker-clickable" data-view-worker="${w.id}">${esc(w.name)}${w.age ? `, ${w.age}` : ''}${w.isGroupLeader ? ` <small>(Group Lead · ${w.groupSize})</small>` : ''}</h4>
        <p class="worker-skill">${workerLabels[w.skill] || w.skill} · ${w.exp} anubhav</p>
        <p class="worker-loc">📍 ${esc(w.loc)}</p>
        <div class="worker-bottom">
          <div>
            ${ratingHTML}
            <span class="worker-wage">₹${w.wage}<small>/din</small></span>
          </div>
          ${w.available
            ? `<button class="btn-chip worker-contact" data-worker="${w.id}">Book Karein</button>`
            : `<span class="worker-busy-note">Abhi available nahi</span>`}
        </div>
      </div>`;
    }).join('') : `<p class="no-results">Is skill mein koi majdoor nahi mila.</p>`;

    workerGrid.querySelectorAll('.worker-contact').forEach(btn => {
      btn.addEventListener('click', () => {
        const w = list.find(x => x.id === btn.dataset.worker);
        if (w) bookWorker(w);
      });
    });
    workerGrid.querySelectorAll('[data-view-worker]').forEach(el => {
      el.addEventListener('click', () => {
        const w = list.find(x => x.id === el.dataset.viewWorker);
        if (w) openWorkerProfile(w);
      });
    });
  }

  function renderJobPosts() {
    let list = jobPosts;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(j => (workerLabels[j.category] || j.category).toLowerCase().includes(q) || j.district.toLowerCase().includes(q) || (j.village || '').toLowerCase().includes(q));
    }
    jobPostGrid.innerHTML = list.length ? list.map(j => `
      <div class="bazaar-card">
        <span class="tag">${j.workersNeeded} Majdoor Chahiye</span>
        ${j.images && j.images.length ? `<div class="bazaar-img-wrap">${mediaHTML(j.images[0])}</div>` : ''}
        <div class="bazaar-info" style="padding-top:16px;">
          <span class="price">₹${j.dailyWage.toLocaleString('en-IN')} <small>/din/majdoor</small></span>
          <h4>${workerLabels[j.category] || j.category}</h4>
          <p class="loc job-summary"><span>💰 ₹${j.dailyWage.toLocaleString('en-IN')}/din milega · 🛠 ${workerLabels[j.category] || j.category} ka kaam · ⏱ ${j.totalDays} din tak karna hai</span></p>
          <p class="loc"><span>📍 ${j.village ? esc(j.village) + ', ' : ''}${esc(j.district)} · ${new Date(j.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} se shuru</span><span class="bazaar-date">${daysAgoLabel(j.days)}</span></p>
          ${(j.foodProvided || j.transportProvided) ? `<p class="loc"><span>${j.foodProvided ? '🍽 Khaana' : ''} ${j.transportProvided ? '🚌 Transport' : ''}</span></p>` : ''}
          ${j.description ? `<p class="loc"><span>${esc(j.description)}</span></p>` : ''}
          <p class="loc"><span>👨‍🌾 Post kiya: <strong>${esc(j.farmerName)}</strong></span></p>
          <div class="price-row"><span></span><button class="btn-chip job-apply-btn" data-job="${j.id}">Apply / Contact</button></div>
        </div>
      </div>`).join('') : `<p class="no-results">${searchTerm ? `"${esc(searchTerm)}" ke liye koi job post nahi mila.` : 'Abhi koi active job post nahi hai.'}</p>`;

    jobPostGrid.querySelectorAll('.job-apply-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const j = list.find(x => x.id === btn.dataset.job);
        if (!j) return;
        window.KM.openContactModal({ listingType: 'job', listingId: j.id, listingName: `${workerLabels[j.category] || j.category} — ${j.workersNeeded} Majdoor`, sellerId: j.farmerId, sellerPhone: j.farmerPhone });
      });
    });
  }

  window.applyKMMajdoorSearch = function (term) {
    searchTerm = term;
    activeSkill = 'all';
    majdoorFilters.querySelectorAll('.chip-filter').forEach(c => c.classList.toggle('active', c.dataset.skill === 'all'));
    renderWorkers();
    renderJobPosts();
    (activeView === 'workers' ? workerGrid : jobPostGrid).scrollIntoView({ behavior: 'smooth' });
  };

  renderWorkers();
  loadRealWorkers();
  loadJobPosts();
  setView('workers'); // enforce initial visibility in JS — see the note in setView() on why the `hidden` attribute alone doesn't work here

  function setView(view) {
    activeView = view;
    viewTabs.querySelectorAll('.olx-mode-tab').forEach(t => t.classList.toggle('active', t.dataset.view === view));
    // .worker-grid/.bazaar-grid both set `display: grid`, which beats the browser's default
    // `[hidden] { display: none }` rule (equal specificity, author style wins) — so the `hidden`
    // attribute alone doesn't actually hide them, it just stops paint-visibility while keeping
    // layout, which is exactly the overlap seen in the screenshot. Set display directly instead.
    workerGrid.style.display = view === 'workers' ? '' : 'none';
    jobPostGrid.style.display = view === 'jobs' ? '' : 'none';
    majdoorFilters.style.display = view === 'workers' ? '' : 'none';
  }
  viewTabs.querySelectorAll('.olx-mode-tab').forEach(btn => {
    btn.addEventListener('click', () => setView(btn.dataset.view));
  });

  majdoorFilters.querySelectorAll('.chip-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      activeSkill = btn.dataset.skill;
      majdoorFilters.querySelectorAll('.chip-filter').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      renderWorkers();
    });
  });

  /* ---------- Job Post modal ---------- */
  const jobPostModal = document.getElementById('jobPostModal');
  const jobCategory = document.getElementById('jobCategory');
  const jobPostSubmit = document.getElementById('jobPostSubmit');
  jobCategory.innerHTML = skillKeys.map(k => `<option value="${k}">${workerLabels[k]}</option>`).join('');
  document.getElementById('jobStartDate').min = new Date().toISOString().slice(0, 10);

  function openJobPostModal() {
    jobPostModal.classList.add('open');
    overlay.classList.add('show');
  }
  function closeJobPostModal() { jobPostModal.classList.remove('open'); overlay.classList.remove('show'); }

  const jobPhotos = document.getElementById('jobPhotos');
  const jobPhotosPreview = document.getElementById('jobPhotosPreview');
  jobPhotos.addEventListener('change', () => {
    jobPhotosPreview.innerHTML = Array.from(jobPhotos.files).slice(0, 3).map(f => {
      const url = URL.createObjectURL(f);
      return f.type.startsWith('video/') ? `<video src="${url}" muted></video>` : `<img src="${url}" alt="">`;
    }).join('');
  });

  document.getElementById('postJobBtn').addEventListener('click', (e) => {
    e.preventDefault();
    if (!window.KM.isLoggedIn()) {
      window.KM.setPendingAction(openJobPostModal);
      window.KM.openAuth();
      window.KM.toast('Job post karne ke liye pehle login karein 👤');
      return;
    }
    openJobPostModal();
  });
  document.getElementById('jobPostModalClose').addEventListener('click', closeJobPostModal);

  jobPostSubmit.addEventListener('click', async () => {
    const category = jobCategory.value;
    const workersNeeded = parseInt(document.getElementById('jobWorkersNeeded').value, 10);
    const dailyWage = parseFloat(document.getElementById('jobDailyWage').value);
    const startDate = document.getElementById('jobStartDate').value;
    const totalDays = parseInt(document.getElementById('jobTotalDays').value, 10);
    const village = document.getElementById('jobVillage').value.trim();
    const district = document.getElementById('jobDistrict').value.trim();
    const foodProvided = document.getElementById('jobFood').checked;
    const transportProvided = document.getElementById('jobTransport').checked;
    const description = document.getElementById('jobDescription').value.trim();

    if (!workersNeeded || workersNeeded < 1 || workersNeeded > 100) { window.KM.toast('⚠️ Majdoor ki sankhya 1-100 ke beech honi chahiye'); return; }
    if (!dailyWage || dailyWage < 100) { window.KM.toast('⚠️ Daily wage kam se kam ₹100 honi chahiye'); return; }
    if (!startDate) { window.KM.toast('⚠️ Start date chunein'); return; }
    if (!totalDays || totalDays < 1) { window.KM.toast('⚠️ Total din sahi daalein'); return; }
    if (!district) { window.KM.toast('⚠️ District daalein'); return; }

    jobPostSubmit.disabled = true;
    jobPostSubmit.textContent = 'Post ho raha hai...';
    let images = [];
    if (jobPhotos.files.length) {
      jobPostSubmit.textContent = 'Photo/Video upload ho raha hai...';
      images = await window.KM.uploadListingImages(jobPhotos.files, 'jobs');
    }
    const ok = await window.KM.addJobPost({
      id: 'job' + Date.now(), category, workersNeeded, dailyWage, startDate, totalDays,
      foodProvided, transportProvided, description, village, district, images,
    });
    jobPostSubmit.disabled = false;
    jobPostSubmit.textContent = 'Job Post Karein';
    if (!ok) return;
    window.KM.toast('✅ Aapki job post live ho gayi!');
    closeJobPostModal();
    document.getElementById('jobWorkersNeeded').value = '1';
    document.getElementById('jobDailyWage').value = '';
    document.getElementById('jobStartDate').value = '';
    document.getElementById('jobTotalDays').value = '1';
    document.getElementById('jobVillage').value = '';
    document.getElementById('jobDistrict').value = '';
    document.getElementById('jobFood').checked = false;
    document.getElementById('jobTransport').checked = false;
    document.getElementById('jobDescription').value = '';
    jobPhotos.value = '';
    jobPhotosPreview.innerHTML = '';
    setView('jobs');
    await loadJobPosts();
  });

  /* ---------- Worker Registration modal (upsert — reopening pre-fills your existing profile) ---------- */
  const workerRegModal = document.getElementById('workerRegModal');
  const workerSkill = document.getElementById('workerSkill');
  const workerSecondaryWrap = document.getElementById('workerSecondarySkills');
  const workerGroupLeader = document.getElementById('workerGroupLeader');
  const workerGroupSizeWrap = document.getElementById('workerGroupSizeWrap');
  const workerRegSubmit = document.getElementById('workerRegSubmit');
  let editingWorkerId = null;

  workerSkill.innerHTML = skillKeys.map(k => `<option value="${k}">${workerLabels[k]}</option>`).join('');
  function renderSecondarySkillChips() {
    workerSecondaryWrap.innerHTML = skillKeys.filter(k => k !== workerSkill.value).map(k => `
      <button class="role-chip" type="button" data-skill="${k}">${workerLabels[k]}</button>`).join('');
    workerSecondaryWrap.querySelectorAll('.role-chip').forEach(chip => {
      chip.addEventListener('click', () => chip.classList.toggle('active'));
    });
  }
  renderSecondarySkillChips();
  workerSkill.addEventListener('change', renderSecondarySkillChips);
  workerGroupLeader.addEventListener('change', () => { workerGroupSizeWrap.hidden = !workerGroupLeader.checked; });

  const workerPhoto = document.getElementById('workerPhoto');
  const workerPhotoPreview = document.getElementById('workerPhotoPreview');
  let existingPhotoUrl = null;
  workerPhoto.addEventListener('change', () => {
    workerPhotoPreview.innerHTML = workerPhoto.files.length ? `<img src="${URL.createObjectURL(workerPhoto.files[0])}" alt="">` : '';
  });

  async function openWorkerRegModal() {
    const existing = await window.KM.getMyWorkerProfile();
    existingPhotoUrl = null;
    workerPhoto.value = '';
    if (existing) {
      editingWorkerId = existing.id;
      document.getElementById('workerName').value = existing.name || '';
      document.getElementById('workerAge').value = existing.age || '';
      existingPhotoUrl = existing.img || null;
      workerPhotoPreview.innerHTML = existingPhotoUrl ? `<img src="${existingPhotoUrl}" alt="">` : '';
      workerSkill.value = existing.skill;
      renderSecondarySkillChips();
      existing.secondarySkills.forEach(s => {
        const chip = workerSecondaryWrap.querySelector(`[data-skill="${s}"]`);
        if (chip) chip.classList.add('active');
      });
      document.getElementById('workerExp').value = parseInt(existing.exp, 10) || 1;
      document.getElementById('workerRate').value = existing.wage;
      document.getElementById('workerDistrict').value = existing.loc;
      workerGroupLeader.checked = existing.isGroupLeader;
      workerGroupSizeWrap.hidden = !existing.isGroupLeader;
      document.getElementById('workerGroupSize').value = existing.groupSize;
      workerRegSubmit.textContent = 'Profile Update Karein';
    } else {
      editingWorkerId = 'wp' + Date.now();
      document.getElementById('workerName').value = window.KM.getSession() ? window.KM.getSession().name : '';
      document.getElementById('workerAge').value = '';
      workerPhotoPreview.innerHTML = '';
      workerRegSubmit.textContent = 'Save & Go Live';
    }
    workerRegModal.classList.add('open');
    overlay.classList.add('show');
  }
  function closeWorkerRegModal() { workerRegModal.classList.remove('open'); overlay.classList.remove('show'); }

  document.getElementById('registerWorkerBtn').addEventListener('click', (e) => {
    e.preventDefault();
    if (!window.KM.isLoggedIn()) {
      window.KM.setPendingAction(openWorkerRegModal);
      window.KM.openAuth();
      window.KM.toast('Register karne ke liye pehle login karein 👤');
      return;
    }
    openWorkerRegModal();
  });
  document.getElementById('workerRegModalClose').addEventListener('click', closeWorkerRegModal);

  workerRegSubmit.addEventListener('click', async () => {
    const name = document.getElementById('workerName').value.trim();
    const age = parseInt(document.getElementById('workerAge').value, 10) || null;
    const primarySkill = workerSkill.value;
    const secondarySkills = Array.from(workerSecondaryWrap.querySelectorAll('.role-chip.active')).map(c => c.dataset.skill);
    const experienceYears = parseInt(document.getElementById('workerExp').value, 10);
    const dailyRate = parseFloat(document.getElementById('workerRate').value);
    const district = document.getElementById('workerDistrict').value.trim();
    const isGroupLeader = workerGroupLeader.checked;
    const groupSize = isGroupLeader ? parseInt(document.getElementById('workerGroupSize').value, 10) : 1;

    if (!name) { window.KM.toast('⚠️ Apna naam daalein'); return; }
    if (!dailyRate || dailyRate < 100) { window.KM.toast('⚠️ Daily rate kam se kam ₹100 honi chahiye'); return; }
    if (!district) { window.KM.toast('⚠️ District daalein'); return; }

    workerRegSubmit.disabled = true;
    workerRegSubmit.textContent = 'Save ho raha hai...';
    let photoUrl = existingPhotoUrl;
    if (workerPhoto.files.length) {
      const uploaded = await window.KM.uploadListingImages(workerPhoto.files, 'workers');
      if (uploaded.length) photoUrl = uploaded[0];
    }
    const ok = await window.KM.upsertWorkerProfile({
      id: editingWorkerId, name, age, photoUrl, primarySkill, secondarySkills, experienceYears, dailyRate, isGroupLeader, groupSize, district,
    });
    workerRegSubmit.disabled = false;
    workerRegSubmit.textContent = 'Save & Go Live';
    if (!ok) return;
    window.KM.toast('✅ Aap ab live hain Majdoor ke roop mein!');
    closeWorkerRegModal();
    setView('workers');
    await loadRealWorkers();
  });

  /* ---------- Worker Profile view (photo, real work history/reviews) ---------- */
  const workerProfileModal = document.getElementById('workerProfileModal');
  const workerProfileBody = document.getElementById('workerProfileBody');
  const fallbackWorkerImg = 'https://images.unsplash.com/photo-1779518080522-cdc7cc1b505f?auto=format&fit=crop&w=440&q=70';

  function closeWorkerProfileModal() { workerProfileModal.classList.remove('open'); overlay.classList.remove('show'); }
  document.getElementById('workerProfileModalClose').addEventListener('click', closeWorkerProfileModal);

  async function openWorkerProfile(w) {
    workerProfileBody.innerHTML = `<p class="orders-empty" style="padding:30px 0;">Load ho raha hai...</p>`;
    workerProfileModal.classList.add('open');
    overlay.classList.add('show');

    const reviews = w.real ? await window.KM.getWorkerReviews(w.id) : [];
    const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;
    const session = window.KM.isLoggedIn() ? window.KM.getSession() : null;
    const isSelf = w.real && session && w.userId === session.id;
    const myReview = session ? reviews.find(r => r.reviewerId === session.id) : null;

    const ratingSummary = w.real
      ? (avg ? `★ ${avg.toFixed(1)} <small>(${reviews.length} reviews)</small>` : '🆕 Naya Majdoor — abhi tak koi review nahi')
      : `★ ${w.rating || '5.0'}`;

    workerProfileBody.innerHTML = `
      <div class="worker-profile-head">
        <img class="worker-profile-photo" src="${esc(w.img) || fallbackWorkerImg}" alt="${esc(w.name)}">
        <div>
          <h3>${esc(w.name)}${w.age ? `, ${w.age}` : ''}${w.isGroupLeader ? ` (Group Lead · ${w.groupSize})` : ''}</h3>
          <p>${workerLabels[w.skill] || w.skill} · ${w.exp} anubhav</p>
          <p>📍 ${esc(w.loc)}</p>
          <p class="worker-profile-rating">${ratingSummary}</p>
        </div>
      </div>
      ${w.secondarySkills && w.secondarySkills.length ? `<p class="auth-note" style="margin-top:-8px;">Aur bhi kaam aata hai: ${w.secondarySkills.map(s => workerLabels[s] || s).join(', ')}</p>` : ''}
      <div class="worker-profile-stats">
        <div><strong>₹${w.wage}</strong><span>/din rate</span></div>
        <div><strong>${w.available ? '🟢 Available' : '⚪ Busy'}</strong><span>abhi status</span></div>
        <div><strong>${w.real ? reviews.length : '—'}</strong><span>reviews</span></div>
      </div>
      <button class="btn btn-primary btn-block" id="workerProfileBookBtn">📲 Book Karein</button>
      ${w.real ? `
      <div class="worker-reviews-section">
        <h4>⭐ Reviews (${reviews.length})</h4>
        ${reviews.length ? reviews.map(r => `
          <div class="worker-review-item">
            <div class="worker-review-head"><strong>${esc(r.reviewerName)}</strong><span>${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span></div>
            ${r.comment ? `<p>${esc(r.comment)}</p>` : ''}
          </div>`).join('') : `<p class="orders-empty" style="padding:14px 0;">Abhi koi review nahi hai — kaam karwane ke baad pehla review dein!</p>`}
      </div>
      ${isSelf ? '' : `
      <div class="worker-review-form">
        <h4>${myReview ? 'Apna Review Update Karein' : 'Review Dein'}</h4>
        <div class="worker-rate-picker" id="workerRatePicker">
          ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="rate-star" data-rate="${n}">★</button>`).join('')}
        </div>
        <textarea class="auth-field" id="workerReviewComment" rows="2" placeholder="Kaam kaisa tha? (optional)">${myReview && myReview.comment ? esc(myReview.comment) : ''}</textarea>
        <button class="btn btn-primary btn-block" id="workerReviewSubmit" type="button">${myReview ? 'Review Update Karein' : 'Review Submit Karein'}</button>
      </div>`}` : ''}
    `;

    document.getElementById('workerProfileBookBtn').addEventListener('click', () => bookWorker(w));

    if (w.real && !isSelf) {
      let selectedRating = myReview ? myReview.rating : 0;
      const picker = document.getElementById('workerRatePicker');
      function paintStars() {
        picker.querySelectorAll('.rate-star').forEach(s => s.classList.toggle('active', +s.dataset.rate <= selectedRating));
      }
      paintStars();
      picker.querySelectorAll('.rate-star').forEach(star => {
        star.addEventListener('click', () => { selectedRating = +star.dataset.rate; paintStars(); });
      });
      document.getElementById('workerReviewSubmit').addEventListener('click', async () => {
        if (!window.KM.isLoggedIn()) {
          window.KM.setPendingAction(() => openWorkerProfile(w));
          window.KM.openAuth();
          window.KM.toast('Review dene ke liye pehle login karein 👤');
          return;
        }
        if (!selectedRating) { window.KM.toast('⚠️ Pehle rating (stars) chunein'); return; }
        const comment = document.getElementById('workerReviewComment').value.trim();
        const submitBtn = document.getElementById('workerReviewSubmit');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Save ho raha hai...';
        const ok = await window.KM.addWorkerReview(w.id, selectedRating, comment);
        submitBtn.disabled = false;
        submitBtn.textContent = myReview ? 'Review Update Karein' : 'Review Submit Karein';
        if (!ok) return;
        window.KM.toast('✅ Review save ho gaya!');
        closeWorkerProfileModal();
        await loadRealWorkers();
      });
    }
  }
});
