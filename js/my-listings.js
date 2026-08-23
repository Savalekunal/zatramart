/* ============================================
   ZatraMart — My Listings (manage Bazaar ads + Shop products, view enquiries)
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  const esc = window.KM.esc;
  const { bazaarCatLabels, catLabels, workerLabels } = window.KM_DATA;

  const loginGuard = document.getElementById('loginGuard');
  const view = document.getElementById('myListingsView');
  const enquiriesBlock = document.getElementById('enquiriesBlock');
  const enquiriesList = document.getElementById('enquiriesList');
  const bazaarList = document.getElementById('myBazaarList');
  const sellerList = document.getElementById('mySellerList');
  const jobList = document.getElementById('myJobPostList');
  const workerBlock = document.getElementById('myWorkerProfile');
  const storeBlock = document.getElementById('myStoreBlock');
  const bazaarCount = document.getElementById('bazaarListCount');
  const shopProdCount = document.getElementById('shopProdCount');
  const jobPostCount2 = document.getElementById('jobPostCount2');

  function checkLogin() {
    const loggedOut = !window.KM.isLoggedIn();
    loginGuard.hidden = !loggedOut;
    view.style.display = loggedOut ? 'none' : '';
    return !loggedOut;
  }
  const guardLoginBtn = document.getElementById('guardLoginBtn');
  if (guardLoginBtn) guardLoginBtn.addEventListener('click', () => window.KM.openAuth());
  window.KM.onAuthChange(() => { if (checkLogin()) render(); });

  const statusLabel = {
    active: 'Active', paused: 'Paused', sold: 'Sold', rented: 'Rented',
    open: 'Open', fulfilled: 'Fulfilled', closed: 'Closed',
    available: 'Available', busy: 'Busy', inactive: 'Inactive',
  };

  function daysAgoLabel(days) {
    if (days === 0) return 'Aaj posted';
    if (days === 1) return 'Kal posted';
    return `${days} din pehle posted`;
  }

  function actionsFor(item, kind) {
    const btns = [];
    const chip = (action, label) => `<button class="btn-chip" data-action="${action}" data-kind="${kind}" data-id="${item.id}">${label}</button>`;

    if (kind === 'job') {
      if (item.status === 'open') {
        btns.push(chip('fulfilled', '✅ Mark Fulfilled'), chip('closed', '✖ Close'));
      }
    } else if (kind === 'worker') {
      if (item.status === 'available') btns.push(chip('busy', '⏸ Mark Busy'), chip('inactive', '🚫 Go Inactive'));
      else if (item.status === 'busy') btns.push(chip('available', '▶ Mark Available'), chip('inactive', '🚫 Go Inactive'));
      else if (item.status === 'inactive') btns.push(chip('available', '▶ Go Live Again'));
    } else {
      if (item.status === 'active') {
        btns.push(chip('paused', '⏸ Pause'));
        btns.push(kind === 'bazaar' && item.type === 'rent' ? chip('rented', '🔑 Mark Rented') : chip('sold', '✅ Mark Sold'));
      } else if (item.status === 'paused') {
        btns.push(chip('active', '▶ Resume'));
      }
    }
    btns.push(`<button class="btn-chip listing-delete-btn" data-kind="${kind}" data-id="${item.id}">🗑 Delete</button>`);
    return btns.join('');
  }

  async function renderDashboardStats() {
    const [bazaarItems, products, enquiries] = await Promise.all([
      window.KM.getMyBazaarListings(), window.KM.getMySellerProducts(), window.KM.getReceivedEnquiries(),
    ]);
    const activeListings = bazaarItems.filter(b => b.status === 'active').length + products.filter(p => p.status === 'active').length;
    const totalPosted = bazaarItems.length + products.length;
    document.getElementById('dashboardStats').innerHTML = `
      <div class="dashboard-stat"><div class="stat-num">${activeListings}</div><div class="stat-label">Active Listings</div></div>
      <div class="dashboard-stat"><div class="stat-num">${totalPosted}</div><div class="stat-label">Total Listings Posted</div></div>
      <div class="dashboard-stat"><div class="stat-num">${enquiries.length}</div><div class="stat-label">Buyer Enquiries</div></div>
      <div class="dashboard-stat stat-soon"><div class="stat-num">Jald Aayega</div><div class="stat-label">💰 Sales / Orders Tracking</div></div>
    `;
  }

  async function renderMyStore() {
    const p = await window.KM.getMySellerProfile();
    const bannerName = document.getElementById('sellerPortalName');
    if (!p) {
      if (bannerName) bannerName.textContent = 'Seller Dashboard';
      storeBlock.innerHTML = `<p class="orders-empty" style="padding:20px 0;">Aapki koi dukaan set up nahi hai. <a href="#" class="seller-bane-link">🏪 Seller Bane →</a></p>`;
      return;
    }
    if (bannerName) bannerName.textContent = p.displayName;
    storeBlock.innerHTML = `
      <div class="my-listing-card" style="margin-bottom:10px;">
        <div class="my-listing-info" style="padding-top:16px;">
          <span class="my-listing-status status-active">${p.sellerType === 'business' ? '🏢 Business / Trader' : '🌾 Individual Farmer'}</span>
          <h4>🏪 ${esc(p.displayName)}</h4>
          ${p.description ? `<p>${esc(p.description)}</p>` : ''}
          <p>📍 ${esc(p.pickupCity)}, ${esc(p.pickupState)} · ${p.categories.map(c => catLabels[c] || c).join(', ')}</p>
          <div class="my-listing-actions">
            <a class="btn-chip" href="become-seller.html">✏️ Store Details Edit Karein</a>
            <button class="btn-chip" id="deleteStoreBtn" style="border-color:#c0392b; color:#c0392b;">🗑 Store Delete Karein</button>
          </div>
        </div>
      </div>`;
    document.getElementById('deleteStoreBtn').addEventListener('click', async () => {
      if (!confirm('Aapki store profile permanently delete ho jaayegi (aapke listed products khud delete nahi honge). Pakka?')) return;
      const ok = await window.KM.deleteSellerProfile();
      if (ok) { window.KM.toast('🗑 Store delete ho gayi'); render(); }
    });
  }

  async function renderBazaar() {
    const items = await window.KM.getMyBazaarListings();
    bazaarCount.textContent = items.length ? `(${items.length})` : '';
    bazaarList.innerHTML = items.length ? items.map(b => `
      <div class="my-listing-card">
        <img src="${esc(b.img)}" alt="${esc(b.name)}">
        <div class="my-listing-info">
          <span class="my-listing-status status-${b.status}">${statusLabel[b.status]}</span>
          <h4>${esc(b.name)}</h4>
          <p>₹${b.price.toLocaleString('en-IN')}${b.type === 'rent' ? ' /din' : ''} · ${esc(b.loc)} · ${daysAgoLabel(b.days)}</p>
          <div class="my-listing-actions">${actionsFor(b, 'bazaar')}</div>
        </div>
      </div>`).join('') : `<p class="orders-empty" style="padding:20px 0;">Koi Bazaar listing nahi hai. <a href="bazaar.html">Apna Saman Bechein →</a></p>`;
  }

  async function renderSeller() {
    const items = await window.KM.getMySellerProducts();
    shopProdCount.textContent = items.length ? `(${items.length})` : '';
    sellerList.innerHTML = items.length ? items.map(p => `
      <div class="my-listing-card">
        <img src="${esc(p.img)}" alt="${esc(p.name)}">
        <div class="my-listing-info">
          <span class="my-listing-status status-${p.status}">${statusLabel[p.status]}</span>
          <h4>${esc(p.name)}</h4>
          <p>₹${p.price.toLocaleString('en-IN')} · ${catLabels[p.cat] || p.cat}</p>
          <div class="my-listing-actions">${actionsFor(p, 'product')}</div>
        </div>
      </div>`).join('') : `<p class="orders-empty" style="padding:20px 0;">Koi Shop product list nahi kiya. <a href="#" class="seller-bane-link">Apna Product List Karein →</a></p>`;
  }

  async function renderJobPosts() {
    const items = await window.KM.getMyJobPosts();
    jobPostCount2.textContent = items.length ? `(${items.length})` : '';
    jobList.innerHTML = items.length ? items.map(j => `
      <div class="my-listing-card">
        <div class="my-listing-info" style="padding-top:16px;">
          <span class="my-listing-status status-${j.status}">${statusLabel[j.status]}</span>
          <h4>${workerLabels[j.category] || j.category} · ${j.workersNeeded} Majdoor</h4>
          <p>₹${j.dailyWage.toLocaleString('en-IN')}/din/majdoor · ${esc(j.district)} · ${daysAgoLabel(j.days)}</p>
          <div class="my-listing-actions">${actionsFor(j, 'job')}</div>
        </div>
      </div>`).join('') : `<p class="orders-empty" style="padding:20px 0;">Koi job post nahi hai. <a href="majdoor.html">+ Job Post Karein →</a></p>`;
  }

  async function renderWorkerProfile() {
    const w = await window.KM.getMyWorkerProfile();
    if (!w) {
      workerBlock.innerHTML = `<p class="orders-empty" style="padding:20px 0;">Aap majdoor ke roop mein register nahi hain. <a href="majdoor.html">Majdoor Ban Ke Register Karein →</a></p>`;
      return;
    }
    workerBlock.innerHTML = `
      <div class="my-listing-card">
        <div class="my-listing-info" style="padding-top:16px;">
          <span class="my-listing-status status-${w.status}">${statusLabel[w.status]}</span>
          <h4>${workerLabels[w.skill] || w.skill}${w.isGroupLeader ? ` (Group Lead · ${w.groupSize})` : ''}</h4>
          <p>₹${w.wage.toLocaleString('en-IN')}/din · ${esc(w.loc)} · ${w.exp} anubhav</p>
          <div class="my-listing-actions">${actionsFor(w, 'worker')}</div>
        </div>
      </div>`;
  }

  async function renderEnquiries() {
    const list = await window.KM.getReceivedEnquiries();
    if (!list.length) { enquiriesBlock.hidden = true; return; }
    enquiriesBlock.hidden = false;
    enquiriesList.innerHTML = list.map(e => `
      <div class="my-listing-enquiry">
        <p><strong>${esc(e.buyer_name)}</strong> ne <strong>${esc(e.listing_name)}</strong> ke baare mein poocha:</p>
        <p class="enquiry-msg">"${esc(e.message)}"</p>
        <a class="btn-chip" href="https://wa.me/91${encodeURIComponent(e.buyer_phone)}" target="_blank" rel="noopener">📲 WhatsApp par jawab dein</a>
      </div>`).join('');
  }

  function wireActions() {
    document.body.addEventListener('click', async (e) => {
      const statusUpdaters = {
        bazaar: window.KM.updateBazaarListingStatus, product: window.KM.updateSellerProductStatus,
        job: window.KM.updateJobPostStatus, worker: window.KM.updateWorkerStatus,
      };
      const deleters = {
        bazaar: window.KM.deleteBazaarListing, product: window.KM.deleteSellerProduct,
        job: window.KM.deleteJobPost, worker: window.KM.deleteWorkerProfile,
      };
      const actionBtn = e.target.closest('[data-action]');
      if (actionBtn) {
        const { action, kind, id } = actionBtn.dataset;
        const ok = await statusUpdaters[kind](id, action);
        if (ok) { window.KM.toast('✅ Status update ho gaya'); render(); }
        return;
      }
      const delBtn = e.target.closest('.listing-delete-btn');
      if (delBtn) {
        if (!confirm('Yeh permanently delete ho jaayega. Pakka?')) return;
        const { kind, id } = delBtn.dataset;
        const ok = await deleters[kind](id);
        if (ok) { window.KM.toast('🗑 Delete ho gaya'); render(); }
      }
    });
  }
  wireActions();

  async function render() {
    if (!checkLogin()) return;
    await Promise.all([renderDashboardStats(), renderMyStore(), renderBazaar(), renderSeller(), renderJobPosts(), renderWorkerProfile(), renderEnquiries()]);
  }
  render();
});
