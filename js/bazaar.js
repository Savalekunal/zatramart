/* ============================================
   ZatraMart — Bazaar (OLX-style classifieds) page script
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {
  if (window.KM_I18N) await window.KM_I18N.ready;
  const t = window.KM_I18N ? window.KM_I18N.t : (k) => k;
  const esc = window.KM.esc;
  const { bazaarCategories, bazaarCatLabels } = window.KM_DATA;
  let bazaarListings = window.KM_DATA.bazaarListings;

  const grid = document.getElementById('bazaarGrid');
  const filters = document.getElementById('bazaarFilters');
  const catGridEl = document.getElementById('bazaarCatGrid');
  const countEl = document.getElementById('bazaarCount');
  const searchInput = document.getElementById('bazaarSearchInput');

  let activeCat = 'all';
  let searchTerm = '';
  let activeMode = 'sell';

  /* ---------- Merge real, user-posted listings (Supabase) in front of the seed catalog ---------- */
  async function loadRealListings() {
    const real = await window.KM.getBazaarListings();
    if (real.length) bazaarListings = [...real, ...window.KM_DATA.bazaarListings];
    render();
  }

  /* ---------- Category pills row ---------- */
  function renderFilters() {
    filters.innerHTML = ['all', ...bazaarCategories.map(c => c.key)].map(key => {
      if (key === 'all') return `<button class="chip-filter ${activeCat === 'all' ? 'active' : ''}" data-cat="all">${t('bazaar.allCategories')}</button>`;
      const c = bazaarCategories.find(x => x.key === key);
      return `<button class="chip-filter ${activeCat === key ? 'active' : ''}" data-cat="${key}">${c.icon} ${t('catalog.bazaarCategory.' + c.key)}</button>`;
    }).join('');
    filters.querySelectorAll('.chip-filter').forEach(btn => {
      btn.addEventListener('click', () => setActiveCat(btn.dataset.cat));
    });
  }

  /* ---------- Icon grid ---------- */
  function renderCatGrid() {
    catGridEl.innerHTML = bazaarCategories.map(c => `
      <div class="olx-cat-item ${activeCat === c.key ? 'active' : ''}" data-cat="${c.key}">
        <span class="olx-cat-img"><img src="${c.img}" alt="${t('catalog.bazaarCategory.' + c.key)}" loading="lazy"></span>
        <span>${t('catalog.bazaarCategory.' + c.key)}</span>
      </div>`).join('');
    catGridEl.querySelectorAll('.olx-cat-item').forEach(item => {
      item.addEventListener('click', () => {
        setActiveCat(item.dataset.cat);
        document.getElementById('bazaarGrid').scrollIntoView({ behavior: 'smooth' });
      });
    });
  }
  renderCatGrid();

  function dateLabel(days) {
    if (days === 0) return t('bazaar.today');
    if (days === 1) return t('bazaar.yesterday');
    return t('product.daysAgo', { days });
  }

  function render() {
    let list = bazaarListings.filter(b => b.type === activeMode);
    if (activeCat !== 'all') list = list.filter(b => b.cat === activeCat);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(b => b.name.toLowerCase().includes(q) || b.loc.toLowerCase().includes(q));
    }
    countEl.textContent = t('bazaar.listingsCount', { count: list.length });
    grid.innerHTML = list.length ? list.map(b => {
      const wished = window.KM.isWishlisted(b.id);
      const priceStr = activeMode === 'rent' ? `₹${b.price.toLocaleString('en-IN')} <small>${t('common.perDay')}</small>` : `₹${b.price.toLocaleString('en-IN')}`;
      return `
      <div class="bazaar-card">
        <span class="tag ${b.featured ? 'featured' : ''}">${b.featured ? t('bazaar.featuredTag') : (activeMode === 'rent' ? t('bazaar.rentTag') : t('common.used'))}</span>
        <button class="bazaar-wish ${wished ? 'active' : ''}" data-wish="${b.id}" aria-label="Wishlist">${wished ? '♥' : '♡'}</button>
        <div class="bazaar-img-wrap" data-gallery="${b.id}">
          <img src="${esc(b.img)}" alt="${esc(b.name)}">
          ${b.images.length > 1 ? `<span class="bazaar-img-count">📷 ${b.images.length}</span>` : ''}
        </div>
        <div class="bazaar-info">
          <span class="price">${priceStr}${b.negotiable ? ` <small class="negotiable-badge">${t('shop.negotiable')}</small>` : ''}</span>
          <h4>${esc(b.name)}</h4>
          <p class="loc"><span>📍 ${esc(b.loc)} · ${esc(b.meta)}${b.condition ? ' · ' + esc(b.condition) : ''}</span><span class="bazaar-date">${dateLabel(b.days)}</span></p>
          <div class="price-row"><span></span><button class="btn-chip contact-seller-btn" data-contact="${b.id}">${t('common.contact')}</button></div>
        </div>
      </div>`;
    }).join('') : `<p class="no-results">${t('bazaar.noListings')}</p>`;

    grid.querySelectorAll('.contact-seller-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const b = list.find(x => x.id === btn.dataset.contact);
        if (!b) return;
        if (b.real && b.sellerId) {
          window.KM.openContactModal({ listingType: 'bazaar', listingId: b.id, listingName: b.name, sellerId: b.sellerId, sellerPhone: b.sellerPhone });
        } else {
          window.KM.toast(t('common.sellerContactToast'));
        }
      });
    });
    grid.querySelectorAll('[data-wish]').forEach(btn => {
      btn.addEventListener('click', () => {
        const active = window.KM.toggleWishlist(btn.dataset.wish);
        btn.classList.toggle('active', active);
        btn.textContent = active ? '♥' : '♡';
        window.KM.toast(active ? t('common.wishlistAddedToast') : t('common.wishlistRemovedToast'));
      });
    });
    grid.querySelectorAll('[data-gallery]').forEach(el => {
      el.addEventListener('click', () => openLightbox(list.find(b => b.id === el.dataset.gallery)));
    });
  }
  renderFilters();
  render();
  loadRealListings();

  /* ---------- Image lightbox (multi-image listings, e.g. wheat sacks) ---------- */
  const lightbox = document.getElementById('bazaarLightbox');
  const lightboxImg = document.getElementById('bazaarLightboxImg');
  const lightboxDots = document.getElementById('bazaarLightboxDots');
  const lightboxInfo = document.getElementById('bazaarLightboxInfo');
  let lightboxImages = [];
  let lightboxIndex = 0;

  function renderLightboxFrame() {
    lightboxImg.src = lightboxImages[lightboxIndex];
    lightboxDots.innerHTML = lightboxImages.map((_, i) => `<span class="${i === lightboxIndex ? 'active' : ''}"></span>`).join('');
  }
  function openLightbox(listing) {
    if (!listing) return;
    lightboxImages = listing.images;
    lightboxIndex = 0;
    lightboxInfo.innerHTML = `<h4>${esc(listing.name)}</h4><p>📍 ${esc(listing.loc)} · ${esc(listing.meta)}</p>`;
    renderLightboxFrame();
    lightbox.classList.add('open');
  }
  function closeLightbox() { lightbox.classList.remove('open'); }
  document.getElementById('bazaarLightboxClose').addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
  document.getElementById('bazaarLightboxPrev').addEventListener('click', () => {
    lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
    renderLightboxFrame();
  });
  document.getElementById('bazaarLightboxNext').addEventListener('click', () => {
    lightboxIndex = (lightboxIndex + 1) % lightboxImages.length;
    renderLightboxFrame();
  });

  /* ---------- Sale / Rent mode toggle ---------- */
  const modeTabs = document.getElementById('bazaarModeTabs');
  const postAdBtn = document.getElementById('postAdBtn');
  function setMode(mode) {
    activeMode = mode;
    modeTabs.querySelectorAll('.olx-mode-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.mode === mode));
    postAdBtn.textContent = mode === 'rent' ? t('bazaar.sellBtnRent') : t('bazaar.sellBtnSell');
    render();
  }
  modeTabs.querySelectorAll('.olx-mode-tab').forEach(btn => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });

  function setActiveCat(cat) {
    activeCat = cat;
    filters.querySelectorAll('.chip-filter').forEach(c => c.classList.toggle('active', c.dataset.cat === cat));
    catGridEl.querySelectorAll('.olx-cat-item').forEach(c => c.classList.toggle('active', c.dataset.cat === cat));
    render();
  }

  searchInput.addEventListener('input', () => { searchTerm = searchInput.value.trim(); render(); });

  // Lets the shared header search bar (used on every page) search Bazaar listings instead of
  // silently redirecting to the Shop catalog, which has nothing to do with classifieds.
  window.applyKMBazaarSearch = function (term) {
    searchTerm = term;
    searchInput.value = term;
    render();
    document.getElementById('bazaarGrid').scrollIntoView({ behavior: 'smooth' });
  };

  /* ---------- Post Ad modal (real listing, real photo upload to Supabase) ---------- */
  const postAdModal = document.getElementById('postAdModal');
  const postAdCat = document.getElementById('postAdCat');
  const postAdTypeToggle = document.getElementById('postAdTypeToggle');
  const postAdPriceLabel = document.getElementById('postAdPriceLabel');
  const postAdModalTitle = document.getElementById('postAdModalTitle');
  const postAdPhotos = document.getElementById('postAdPhotos');
  const postAdPreview = document.getElementById('postAdPreview');
  const postAdSubmit = document.getElementById('postAdSubmit');
  const overlayEl = document.getElementById('overlay');
  let postAdType = 'sell';

  function renderPostAdCatOptions() {
    postAdCat.innerHTML = bazaarCategories.map(c => `<option value="${c.key}">${c.icon} ${t('catalog.bazaarCategory.' + c.key)}</option>`).join('');
  }
  renderPostAdCatOptions();

  function openPostAdModal() {
    postAdType = activeMode;
    postAdTypeToggle.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.type === postAdType));
    postAdModalTitle.textContent = postAdType === 'rent' ? t('bazaar.postAdTitleRent') : t('bazaar.postAdTitle');
    postAdPriceLabel.textContent = postAdType === 'rent' ? t('bazaar.priceRent') : t('bazaar.price');
    postAdModal.classList.add('open');
    overlayEl.classList.add('show');
  }
  function closePostAdModal() { postAdModal.classList.remove('open'); overlayEl.classList.remove('show'); }

  document.getElementById('postAdBtn').addEventListener('click', (e) => {
    e.preventDefault();
    if (!window.KM.isLoggedIn()) {
      window.KM.setPendingAction(openPostAdModal);
      window.KM.openAuth();
      window.KM.toast(t('bazaar.loginToSellToast'));
      return;
    }
    openPostAdModal();
  });
  document.getElementById('postAdModalClose').addEventListener('click', closePostAdModal);

  postAdTypeToggle.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      postAdType = btn.dataset.type;
      postAdTypeToggle.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === btn));
      postAdPriceLabel.textContent = postAdType === 'rent' ? t('bazaar.priceRent') : t('bazaar.price');
    });
  });

  postAdPhotos.addEventListener('change', () => {
    postAdPreview.innerHTML = Array.from(postAdPhotos.files).slice(0, 5)
      .map(f => `<img src="${URL.createObjectURL(f)}" alt="">`).join('');
  });

  postAdSubmit.addEventListener('click', async () => {
    const name = document.getElementById('postAdName').value.trim();
    const cat = postAdCat.value;
    const price = parseFloat(document.getElementById('postAdPrice').value);
    const loc = document.getElementById('postAdLoc').value.trim();
    const meta = document.getElementById('postAdMeta').value.trim();
    const condition = document.getElementById('postAdCondition').value;
    const negotiable = document.getElementById('postAdNegotiable').checked;
    const files = postAdPhotos.files;
    if (!name) { window.KM.toast(t('bazaar.errNameRequired')); return; }
    if (!price || price <= 0) { window.KM.toast(t('bazaar.errPriceRequired')); return; }
    if (!loc) { window.KM.toast(t('bazaar.errLocRequired')); return; }
    if (!files.length) { window.KM.toast(t('bazaar.errPhotoRequired')); return; }
    postAdSubmit.disabled = true;
    postAdSubmit.textContent = t('bazaar.uploading');
    const images = await window.KM.uploadListingImages(files, 'bazaar');
    if (!images.length) { postAdSubmit.disabled = false; postAdSubmit.textContent = t('bazaar.postListing'); window.KM.toast(t('bazaar.errPhotoUploadFailed')); return; }
    const ok = await window.KM.addBazaarListing({
      id: 'bl' + Date.now(), name, cat, type: postAdType, rentUnit: postAdType === 'rent',
      price, loc, meta, condition, negotiable, images,
    });
    postAdSubmit.disabled = false;
    postAdSubmit.textContent = t('bazaar.postListing');
    if (!ok) return;
    window.KM.toast(t('bazaar.listingLiveToast'));
    closePostAdModal();
    document.getElementById('postAdName').value = '';
    document.getElementById('postAdPrice').value = '';
    document.getElementById('postAdLoc').value = '';
    document.getElementById('postAdMeta').value = '';
    postAdPhotos.value = '';
    postAdPreview.innerHTML = '';
    setMode(postAdType);
    await loadRealListings();
  });

  document.addEventListener('km:langchange', () => {
    renderFilters();
    renderCatGrid();
    render();
    renderPostAdCatOptions();
    postAdBtn.textContent = activeMode === 'rent' ? t('bazaar.sellBtnRent') : t('bazaar.sellBtnSell');
  });
});
