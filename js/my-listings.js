/* ============================================
   ZatraMart — My Listings (manage Bazaar ads + Shop products, view enquiries)
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {
  if (window.KM_I18N) await window.KM_I18N.ready;
  const t = window.KM_I18N ? window.KM_I18N.t : (k) => k;
  const catName = (key) => t('catalog.category.' + key) !== ('catalog.category.' + key) ? t('catalog.category.' + key)
    : t('catalog.farmType.' + key) !== ('catalog.farmType.' + key) ? t('catalog.farmType.' + key)
    : t('catalog.crop.' + key) !== ('catalog.crop.' + key) ? t('catalog.crop.' + key) : key;
  const skillName = (key) => t('catalog.workerSkill.' + key);
  const esc = window.KM.esc;

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

  function statusLabel(key) { return t('listings.statusLabel.' + key); }

  function daysAgoLabel(days) {
    if (days === 0) return t('listings.postedToday');
    if (days === 1) return t('listings.postedYesterday');
    return t('listings.postedDaysAgo', { days });
  }

  function actionsFor(item, kind) {
    const btns = [];
    const chip = (action, label) => `<button class="btn-chip" data-action="${action}" data-kind="${kind}" data-id="${item.id}">${label}</button>`;

    if (kind === 'job') {
      if (item.status === 'open') {
        btns.push(chip('fulfilled', t('listings.markFulfilled')), chip('closed', t('listings.close')));
      }
    } else if (kind === 'worker') {
      if (item.status === 'available') btns.push(chip('busy', t('listings.markBusy')), chip('inactive', t('listings.goInactive')));
      else if (item.status === 'busy') btns.push(chip('available', t('listings.markAvailable')), chip('inactive', t('listings.goInactive')));
      else if (item.status === 'inactive') btns.push(chip('available', t('listings.goLiveAgain')));
    } else {
      if (item.status === 'active') {
        btns.push(chip('paused', t('listings.pause')));
        btns.push(kind === 'bazaar' && item.type === 'rent' ? chip('rented', t('listings.markRented')) : chip('sold', t('listings.markSold')));
      } else if (item.status === 'paused') {
        btns.push(chip('active', t('listings.resume')));
      }
    }
    btns.push(`<button class="btn-chip listing-delete-btn" data-kind="${kind}" data-id="${item.id}">${t('listings.delete')}</button>`);
    return btns.join('');
  }

  async function renderDashboardStats() {
    const [bazaarItems, products, enquiries] = await Promise.all([
      window.KM.getMyBazaarListings(), window.KM.getMySellerProducts(), window.KM.getReceivedEnquiries(),
    ]);
    const activeListings = bazaarItems.filter(b => b.status === 'active').length + products.filter(p => p.status === 'active').length;
    const totalPosted = bazaarItems.length + products.length;
    document.getElementById('dashboardStats').innerHTML = `
      <div class="dashboard-stat"><div class="stat-num">${activeListings}</div><div class="stat-label">${t('listings.activeListings')}</div></div>
      <div class="dashboard-stat"><div class="stat-num">${totalPosted}</div><div class="stat-label">${t('listings.totalListingsPosted')}</div></div>
      <div class="dashboard-stat"><div class="stat-num">${enquiries.length}</div><div class="stat-label">${t('listings.buyerEnquiries')}</div></div>
      <div class="dashboard-stat stat-soon"><div class="stat-num">${t('checkout.comingSoon')}</div><div class="stat-label">${t('listings.salesOrdersTracking')}</div></div>
    `;
  }

  async function renderMyStore() {
    const p = await window.KM.getMySellerProfile();
    const bannerName = document.getElementById('sellerPortalName');
    if (!p) {
      if (bannerName) bannerName.textContent = t('listings.sellerDashboard');
      storeBlock.innerHTML = `<p class="orders-empty" style="padding:20px 0;">${t('listings.noStoreSetup')} <a href="#" class="seller-bane-link">${t('listings.becomeSellerLink')}</a></p>`;
      return;
    }
    if (bannerName) bannerName.textContent = p.displayName;
    storeBlock.innerHTML = `
      <div class="my-listing-card" style="margin-bottom:10px;">
        <div class="my-listing-info" style="padding-top:16px;">
          <span class="my-listing-status status-active">${p.sellerType === 'business' ? t('listings.businessTrader') : t('listings.individualFarmer')}</span>
          <h4>🏪 ${esc(p.displayName)}</h4>
          ${p.description ? `<p>${esc(p.description)}</p>` : ''}
          <p>📍 ${esc(p.pickupCity)}, ${esc(p.pickupState)} · ${p.categories.map(c => catName(c)).join(', ')}</p>
          <div class="my-listing-actions">
            <a class="btn-chip" href="become-seller.html">${t('listings.editStoreDetails')}</a>
            <button class="btn-chip" id="deleteStoreBtn" style="border-color:#c0392b; color:#c0392b;">${t('listings.deleteStore')}</button>
          </div>
        </div>
      </div>`;
    document.getElementById('deleteStoreBtn').addEventListener('click', async () => {
      if (!confirm(t('listings.confirmDeleteStore'))) return;
      const ok = await window.KM.deleteSellerProfile();
      if (ok) { window.KM.toast(t('listings.storeDeletedToast')); render(); }
    });
  }

  async function renderBazaar() {
    const items = await window.KM.getMyBazaarListings();
    bazaarCount.textContent = items.length ? `(${items.length})` : '';
    bazaarList.innerHTML = items.length ? items.map(b => `
      <div class="my-listing-card">
        <img src="${esc(b.img)}" alt="${esc(b.name)}">
        <div class="my-listing-info">
          <span class="my-listing-status status-${b.status}">${statusLabel(b.status)}</span>
          <h4>${esc(b.name)}</h4>
          <p>₹${b.price.toLocaleString('en-IN')}${b.type === 'rent' ? ' ' + t('common.perDay') : ''} · ${esc(b.loc)} · ${daysAgoLabel(b.days)}</p>
          <div class="my-listing-actions">${actionsFor(b, 'bazaar')}</div>
        </div>
      </div>`).join('') : `<p class="orders-empty" style="padding:20px 0;">${t('listings.noBazaarListing')} <a href="bazaar.html">${t('listings.sellItemLink')}</a></p>`;
  }

  async function renderSeller() {
    const items = await window.KM.getMySellerProducts();
    shopProdCount.textContent = items.length ? `(${items.length})` : '';
    sellerList.innerHTML = items.length ? items.map(p => `
      <div class="my-listing-card">
        <img src="${esc(p.img)}" alt="${esc(p.name)}">
        <div class="my-listing-info">
          <span class="my-listing-status status-${p.status}">${statusLabel(p.status)}</span>
          <h4>${esc(p.name)}</h4>
          <p>₹${p.price.toLocaleString('en-IN')} · ${catName(p.cat)}</p>
          <div class="my-listing-actions">${actionsFor(p, 'product')}</div>
        </div>
      </div>`).join('') : `<p class="orders-empty" style="padding:20px 0;">${t('listings.noShopProduct')} <a href="#" class="seller-bane-link">${t('listings.listProductLink')}</a></p>`;
  }

  async function renderJobPosts() {
    const items = await window.KM.getMyJobPosts();
    jobPostCount2.textContent = items.length ? `(${items.length})` : '';
    jobList.innerHTML = items.length ? items.map(j => `
      <div class="my-listing-card">
        <div class="my-listing-info" style="padding-top:16px;">
          <span class="my-listing-status status-${j.status}">${statusLabel(j.status)}</span>
          <h4>${skillName(j.category)} · ${t('majdoor.workersNeeded', { n: j.workersNeeded })}</h4>
          <p>₹${j.dailyWage.toLocaleString('en-IN')}${t('majdoor.perDayPerWorker')} · ${esc(j.district)} · ${daysAgoLabel(j.days)}</p>
          <div class="my-listing-actions">${actionsFor(j, 'job')}</div>
        </div>
      </div>`).join('') : `<p class="orders-empty" style="padding:20px 0;">${t('listings.noJobPost')} <a href="majdoor.html">${t('listings.postJobLink')}</a></p>`;
  }

  async function renderWorkerProfile() {
    const w = await window.KM.getMyWorkerProfile();
    if (!w) {
      workerBlock.innerHTML = `<p class="orders-empty" style="padding:20px 0;">${t('listings.notRegisteredWorker')} <a href="majdoor.html">${t('listings.registerWorkerLink')}</a></p>`;
      return;
    }
    workerBlock.innerHTML = `
      <div class="my-listing-card">
        <div class="my-listing-info" style="padding-top:16px;">
          <span class="my-listing-status status-${w.status}">${statusLabel(w.status)}</span>
          <h4>${skillName(w.skill)}${w.isGroupLeader ? ` (${t('majdoor.groupLead', { size: w.groupSize })})` : ''}</h4>
          <p>₹${w.wage.toLocaleString('en-IN')}${t('common.perDay')} · ${esc(w.loc)} · ${t('common.experienceSuffix', { exp: w.exp })}</p>
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
        <p>${t('listings.enquiryAsked', { buyer: `<strong>${esc(e.buyer_name)}</strong>`, listing: `<strong>${esc(e.listing_name)}</strong>` })}</p>
        <p class="enquiry-msg">"${esc(e.message)}"</p>
        <a class="btn-chip" href="https://wa.me/91${encodeURIComponent(e.buyer_phone)}" target="_blank" rel="noopener">${t('listings.whatsappReply')}</a>
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
        if (ok) { window.KM.toast(t('listings.statusUpdatedToast')); render(); }
        return;
      }
      const delBtn = e.target.closest('.listing-delete-btn');
      if (delBtn) {
        if (!confirm(t('listings.confirmDelete'))) return;
        const { kind, id } = delBtn.dataset;
        const ok = await deleters[kind](id);
        if (ok) { window.KM.toast(t('listings.deletedToast')); render(); }
      }
    });
  }
  wireActions();

  async function render() {
    if (!checkLogin()) return;
    await Promise.all([renderDashboardStats(), renderMyStore(), renderBazaar(), renderSeller(), renderJobPosts(), renderWorkerProfile(), renderEnquiries()]);
  }
  render();

  document.addEventListener('km:langchange', render);
});
