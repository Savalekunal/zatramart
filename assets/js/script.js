/* ============================================
   ZatraMart — Home page script
   (nav/cart/wishlist/mega-menu/auth live in js/common.js)
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {
  if (window.KM_I18N) await window.KM_I18N.ready;
  const t = window.KM_I18N ? window.KM_I18N.t : (k) => k;

  const { farmTypes, categories, crops, products, workers, yojanas, reels } = window.KM_DATA;

  /* ============================================
     RENDER — Top 10 Trending (homepage section)
     ============================================ */
  const trendingScroll = document.getElementById('trendingScroll');
  const top10 = [...products].sort((a, b) => (b.rating * b.rev) - (a.rating * a.rev)).slice(0, 10);
  function renderTrending() {
    trendingScroll.innerHTML = top10.map((p, i) => {
      const tagLabel = t('catalog.trendingTag.' + p.cat) === ('catalog.trendingTag.' + p.cat) ? t('catalog.trendingTag.default') : t('catalog.trendingTag.' + p.cat);
      const tagMeta = window.KM_DATA.trendingTagStyle ? window.KM_DATA.trendingTagStyle(p.cat) : { icon: '🌾', color: '#e8f7ee', text: '#0f7a3d' };
      return `
        <a href="product.html?id=${p.id}" class="trending-card">
          <span class="trending-badge">${i + 1}</span>
          <span class="trending-tag" style="background:${tagMeta.color}; color:${tagMeta.text};">${tagMeta.icon} ${tagLabel}</span>
          <img src="${p.img}" alt="${p.name}" loading="lazy">
          <h4>${p.name}</h4>
        </a>`;
    }).join('');
  }
  const trendingTagStyle = (cat) => ({
    seeds: { icon: '🌱', color: '#e8f7ee', text: '#0f7a3d' },
    fertilizer: { icon: '🌿', color: '#e8f7ee', text: '#0f7a3d' },
    pesticide: { icon: '🛡️', color: '#f2edfb', text: '#6d28d9' },
    irrigation: { icon: '💧', color: '#e6f3fb', text: '#0369a1' },
    motor: { icon: '⚡', color: '#fdf1e8', text: '#c2540a' },
    tools: { icon: '🔧', color: '#fdf1e8', text: '#c2540a' },
    machinery: { icon: '🚜', color: '#fdf1e8', text: '#c2540a' },
    metal: { icon: '🏗️', color: '#f1f2f4', text: '#4b5563' },
    solar: { icon: '☀️', color: '#fdf6e0', text: '#a16207' },
    organic: { icon: '🌾', color: '#e8f7ee', text: '#0f7a3d' },
    packaging: { icon: '📦', color: '#f1f2f4', text: '#4b5563' },
  }[cat] || { icon: '🌾', color: '#e8f7ee', text: '#0f7a3d' });
  window.KM_DATA.trendingTagStyle = trendingTagStyle;
  renderTrending();

  const trendingPrev = document.getElementById('trendingPrev');
  const trendingNext = document.getElementById('trendingNext');
  if (trendingPrev) trendingPrev.addEventListener('click', () => trendingScroll.scrollBy({ left: -420, behavior: 'smooth' }));
  if (trendingNext) trendingNext.addEventListener('click', () => trendingScroll.scrollBy({ left: 420, behavior: 'smooth' }));

  /* ============================================
     RENDER — Farm Types (homepage section)
     ============================================ */
  const farmTypeGrid = document.getElementById('farmTypeGrid');
  function renderFarmTypes() {
    farmTypeGrid.innerHTML = farmTypes.map(f => `
      <a href="shop.html?cat=${f.key}" class="cat-card farmtype-card">
        <img src="${f.img}" alt="${t('catalog.farmType.' + f.key)}">
        <span>${f.icon} ${t('catalog.farmType.' + f.key)}</span>
      </a>`).join('');
  }
  renderFarmTypes();

  /* ============================================
     RENDER — Categories (homepage section)
     ============================================ */
  const catGrid = document.getElementById('catGrid');
  function renderCategories() {
    catGrid.innerHTML = categories.map(c => `
      <a href="shop.html?cat=${c.key}" class="cat-card">
        <img src="${c.img}" alt="${t('catalog.category.' + c.key)}">
        <span>${c.icon} ${t('catalog.category.' + c.key)}</span>
        <small>${c.count} ${t('common.items')}</small>
      </a>`).join('');
  }
  renderCategories();

  /* ============================================
     RENDER — Shop By Crop (homepage section)
     ============================================ */
  const cropGrid = document.getElementById('cropGrid');
  function renderCrops() {
    cropGrid.innerHTML = crops.map(c => `
      <a href="shop.html?cat=${c.key}" class="olx-cat-item">
        <span class="olx-cat-icon">${c.icon}</span>
        <span>${t('catalog.crop.' + c.key)}</span>
      </a>`).join('');
  }
  renderCrops();

  /* ============================================
     RENDER — Today's Offer (teaser strip; full catalog lives on shop.html)
     ============================================ */
  const sizeKeyPriority = ['Pack Size', 'Weight', 'Size', 'Capacity', 'Power', 'Pack Count'];
  function sizeOf(p) {
    for (const k of sizeKeyPriority) {
      const v = p.specs[k];
      if (v && v !== '—') return v;
    }
    return t('common.standard');
  }
  const featuredGrid = document.getElementById('featuredGrid');
  const featured = [...products].sort((a, b) => b.rating - a.rating).slice(0, 8);
  function renderFeatured() {
    featuredGrid.innerHTML = featured.map(p => {
      const discount = Math.round(((p.old - p.price) / p.old) * 100);
      const savings = p.old - p.price;
      const wished = window.KM.isWishlisted(p.id);
      return `
        <div class="product-card">
          <div class="product-img">
            <a href="product.html?id=${p.id}" class="product-img-link">
              <img src="${p.img}" alt="${p.name}" loading="lazy">
            </a>
            <span class="discount-badge">${t('common.off', { pct: discount })}</span>
            <button class="wish-icon ${wished ? 'active' : ''}" data-wish="${p.id}" aria-label="Add to wishlist">${wished ? '♥' : '♡'}</button>
            <span class="offer-rating-badge">${p.rating} ★ <small>| ${p.rev}</small></span>
          </div>
          <div class="product-info">
            <a href="product.html?id=${p.id}" class="product-title-link"><h4>${p.name}</h4></a>
            <span class="offer-brand">${p.brand}</span>
            <div class="price-line">
              <span class="price-now">₹${p.price.toLocaleString('en-IN')}</span>
              <span class="price-old">₹${p.old.toLocaleString('en-IN')}</span>
            </div>
            <p class="offer-savings">🏷️ ${t('common.save', { amount: savings.toLocaleString('en-IN') })}</p>
            <label class="offer-size-label">${t('common.size')}
              <select class="offer-size-select"><option>${sizeOf(p)}</option></select>
            </label>
            <button class="add-cart-btn" data-add="${p.id}">🛒 ${t('common.addToCart')}</button>
          </div>
        </div>`;
    }).join('');

    featuredGrid.querySelectorAll('[data-add]').forEach(btn => {
      btn.addEventListener('click', () => {
        window.KM.addToCart(products.find(p => p.id === btn.dataset.add));
        window.KM.toast(t('common.addedToCartToast'));
      });
    });
    featuredGrid.querySelectorAll('[data-wish]').forEach(btn => {
      btn.addEventListener('click', () => {
        const active = window.KM.toggleWishlist(btn.dataset.wish);
        btn.classList.toggle('active', active);
        btn.textContent = active ? '♥' : '♡';
        window.KM.toast(active ? t('common.wishlistAddedToast') : t('common.wishlistRemovedToast'));
      });
    });
  }
  renderFeatured();

  /* ============================================
     RENDER — Reels
     ============================================ */
  const reelsRow = document.getElementById('reelsRow');
  reelsRow.innerHTML = reels.map(r => `
    <div class="reel-card" data-yt="${r.yt || ''}" data-title="${r.title}" data-by="${r.creator}">
      <img src="${r.img}" alt="${r.title}">
      <div class="reel-overlay">
        <span class="reel-play">▶</span>
        <div class="reel-info">
          <h5>${r.title}</h5>
          <p>@${r.creator.replace(/\s+/g, '')} · ❤️ ${r.likes}</p>
        </div>
      </div>
    </div>`).join('');

  /* ============================================
     RENDER — Majdoor (workers)
     ============================================ */
  const workerGrid = document.getElementById('workerGrid');
  const majdoorFilters = document.getElementById('majdoorFilters');
  let activeSkill = 'all';

  const usedSkills = [...new Set(workers.map(w => w.skill))];
  function renderMajdoorFilters() {
    majdoorFilters.innerHTML = ['all', ...usedSkills].map(s => `
      <button class="chip-filter light ${s === activeSkill ? 'active' : ''}" data-skill="${s}">
        ${s === 'all' ? '🌐 ' + t('search.all') : t('catalog.workerSkill.' + s)}
      </button>`).join('');
    majdoorFilters.querySelectorAll('.chip-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        activeSkill = btn.dataset.skill;
        renderMajdoorFilters();
        renderWorkers();
      });
    });
  }
  renderMajdoorFilters();

  function renderWorkers() {
    const list = activeSkill === 'all' ? workers : workers.filter(w => w.skill === activeSkill);
    workerGrid.innerHTML = list.map(w => `
      <div class="worker-card">
        <div class="worker-top">
          <img src="${w.img}" alt="${w.name}">
          <span class="worker-status ${w.available ? 'online' : 'offline'}">${w.available ? t('common.available') : t('common.busy')}</span>
        </div>
        <h4>${w.name}</h4>
        <p class="worker-skill">${t('catalog.workerSkill.' + w.skill)} · ${t('common.experienceSuffix', { exp: w.exp })}</p>
        <p class="worker-loc">📍 ${w.loc}</p>
        <div class="worker-bottom">
          <div>
            <span class="worker-stars">★ ${w.rating}</span>
            <span class="worker-wage">₹${w.wage}<small>${t('common.perDay')}</small></span>
          </div>
          <button class="btn-chip worker-contact">${t('common.bookNow')}</button>
        </div>
      </div>`).join('');

    workerGrid.querySelectorAll('.worker-contact').forEach(btn => {
      btn.addEventListener('click', () => window.KM.toast(t('common.workerContactToast')));
    });
  }
  renderWorkers();

  /* ============================================
     RENDER — Yojana (govt schemes)
     ============================================ */
  const yojanaGrid = document.getElementById('yojanaGrid');
  function renderYojanaGrid() {
    yojanaGrid.innerHTML = yojanas.map(y => `
      <div class="yojana-card">
        <div class="yojana-icon">${y.icon}</div>
        <h4>${y.name}</h4>
        <p class="yojana-benefit">${y.benefit}</p>
        <div class="yojana-docs">
          ${y.docs.map(d => `<span>📄 ${d}</span>`).join('')}
        </div>
        <button class="btn-chip yojana-btn">${t('common.learnMore')}</button>
      </div>`).join('');

    yojanaGrid.querySelectorAll('.yojana-btn').forEach(btn => {
      btn.addEventListener('click', () => window.KM.toast(t('common.yojanaMoreInfoToast')));
    });
  }
  renderYojanaGrid();

  /* ---------- Animated counters ---------- */
  const statNums = document.querySelectorAll('.stat-num');
  const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = +el.dataset.count;
      const suffix = el.dataset.suffix || '';
      const duration = 1600;
      const start = performance.now();
      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.floor(eased * target);
        el.textContent = value.toLocaleString('en-IN') + suffix;
        if (progress < 1) requestAnimationFrame(tick);
        else el.textContent = target.toLocaleString('en-IN') + suffix;
      }
      requestAnimationFrame(tick);
      statObserver.unobserve(el);
    });
  }, { threshold: 0.5 });
  statNums.forEach(el => statObserver.observe(el));

  /* ---------- Testimonial carousel ---------- */
  const testiCards = document.querySelectorAll('.testi-card');
  const testiDots = document.getElementById('testiDots');
  let testiIndex = 0;

  testiCards.forEach((_, i) => {
    const dot = document.createElement('span');
    if (i === 0) dot.classList.add('active');
    dot.addEventListener('click', () => goToTesti(i));
    testiDots.appendChild(dot);
  });
  const dotEls = testiDots.querySelectorAll('span');

  function goToTesti(i) {
    testiCards[testiIndex].classList.remove('active');
    dotEls[testiIndex].classList.remove('active');
    testiIndex = i;
    testiCards[testiIndex].classList.add('active');
    dotEls[testiIndex].classList.add('active');
  }
  setInterval(() => goToTesti((testiIndex + 1) % testiCards.length), 4500);

  /* ---------- Bazaar "Contact" buttons ---------- */
  document.querySelectorAll('.bazaar-card .btn-chip').forEach(btn => {
    btn.addEventListener('click', () => window.KM.toast(t('common.sellerContactToast')));
  });

  /* ---------- Re-render every dynamic section when the language changes ---------- */
  document.addEventListener('km:langchange', () => {
    renderTrending();
    renderFarmTypes();
    renderCategories();
    renderCrops();
    renderFeatured();
    renderMajdoorFilters();
    renderWorkers();
    renderYojanaGrid();
  });

});
