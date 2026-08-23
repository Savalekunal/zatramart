/* ============================================
   ZatraMart — Home page script
   (nav/cart/wishlist/mega-menu/auth live in js/common.js)
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  const { farmTypes, categories, crops, catLabels, products, workers, workerLabels, yojanas, reels } = window.KM_DATA;

  /* ============================================
     RENDER — Top 10 Trending (homepage section)
     ============================================ */
  const trendingTagByCat = {
    seeds: { icon: '🌱', label: 'High Yield', color: '#e8f7ee', text: '#0f7a3d' },
    fertilizer: { icon: '🌿', label: 'Growth Booster', color: '#e8f7ee', text: '#0f7a3d' },
    pesticide: { icon: '🛡️', label: 'Pest Control', color: '#f2edfb', text: '#6d28d9' },
    irrigation: { icon: '💧', label: 'Water Saver', color: '#e6f3fb', text: '#0369a1' },
    motor: { icon: '⚡', label: 'Power Boost', color: '#fdf1e8', text: '#c2540a' },
    tools: { icon: '🔧', label: 'Durable Build', color: '#fdf1e8', text: '#c2540a' },
    machinery: { icon: '🚜', label: 'Field Ready', color: '#fdf1e8', text: '#c2540a' },
    metal: { icon: '🏗️', label: 'Strong Build', color: '#f1f2f4', text: '#4b5563' },
    solar: { icon: '☀️', label: 'Zero Running Cost', color: '#fdf6e0', text: '#a16207' },
    organic: { icon: '🌾', label: 'Soil Health', color: '#e8f7ee', text: '#0f7a3d' },
    packaging: { icon: '📦', label: 'Safe Storage', color: '#f1f2f4', text: '#4b5563' },
  };
  function trendingTagFor(cat) {
    return trendingTagByCat[cat] || { icon: '🌾', label: 'Farm Essential', color: '#e8f7ee', text: '#0f7a3d' };
  }
  const trendingScroll = document.getElementById('trendingScroll');
  const top10 = [...products].sort((a, b) => (b.rating * b.rev) - (a.rating * a.rev)).slice(0, 10);
  trendingScroll.innerHTML = top10.map((p, i) => {
    const tag = trendingTagFor(p.cat);
    return `
      <a href="product.html?id=${p.id}" class="trending-card">
        <span class="trending-badge">${i + 1}</span>
        <span class="trending-tag" style="background:${tag.color}; color:${tag.text};">${tag.icon} ${tag.label}</span>
        <img src="${p.img}" alt="${p.name}" loading="lazy">
        <h4>${p.name}</h4>
      </a>`;
  }).join('');
  const trendingPrev = document.getElementById('trendingPrev');
  const trendingNext = document.getElementById('trendingNext');
  if (trendingPrev) trendingPrev.addEventListener('click', () => trendingScroll.scrollBy({ left: -420, behavior: 'smooth' }));
  if (trendingNext) trendingNext.addEventListener('click', () => trendingScroll.scrollBy({ left: 420, behavior: 'smooth' }));

  /* ============================================
     RENDER — Farm Types (homepage section)
     ============================================ */
  const farmTypeGrid = document.getElementById('farmTypeGrid');
  farmTypeGrid.innerHTML = farmTypes.map(f => `
    <a href="shop.html?cat=${f.key}" class="cat-card farmtype-card">
      <img src="${f.img}" alt="${f.name}">
      <span>${f.icon} ${f.name}</span>
    </a>`).join('');

  /* ============================================
     RENDER — Categories (homepage section)
     ============================================ */
  const catGrid = document.getElementById('catGrid');
  catGrid.innerHTML = categories.map(c => `
    <a href="shop.html?cat=${c.key}" class="cat-card">
      <img src="${c.img}" alt="${c.name}">
      <span>${c.icon} ${c.name}</span>
      <small>${c.count} items</small>
    </a>`).join('');

  /* ============================================
     RENDER — Shop By Crop (homepage section)
     ============================================ */
  const cropGrid = document.getElementById('cropGrid');
  cropGrid.innerHTML = crops.map(c => `
    <a href="shop.html?cat=${c.key}" class="olx-cat-item">
      <span class="olx-cat-icon">${c.icon}</span>
      <span>${c.name}</span>
    </a>`).join('');

  /* ============================================
     RENDER — Today's Offer (teaser strip; full catalog lives on shop.html)
     ============================================ */
  const sizeKeyPriority = ['Pack Size', 'Weight', 'Size', 'Capacity', 'Power', 'Pack Count'];
  function sizeOf(p) {
    for (const k of sizeKeyPriority) {
      const v = p.specs[k];
      if (v && v !== '—') return v;
    }
    return 'Standard';
  }
  const featuredGrid = document.getElementById('featuredGrid');
  const featured = [...products].sort((a, b) => b.rating - a.rating).slice(0, 8);
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
          <span class="discount-badge">${discount}% OFF</span>
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
          <p class="offer-savings">🏷️ Save ₹${savings.toLocaleString('en-IN')}</p>
          <label class="offer-size-label">Size
            <select class="offer-size-select"><option>${sizeOf(p)}</option></select>
          </label>
          <button class="add-cart-btn" data-add="${p.id}">🛒 Cart Mein Daalein</button>
        </div>
      </div>`;
  }).join('');

  featuredGrid.querySelectorAll('[data-add]').forEach(btn => {
    btn.addEventListener('click', () => window.KM.addToCart(products.find(p => p.id === btn.dataset.add)));
  });
  featuredGrid.querySelectorAll('[data-wish]').forEach(btn => {
    btn.addEventListener('click', () => {
      const active = window.KM.toggleWishlist(btn.dataset.wish);
      btn.classList.toggle('active', active);
      btn.textContent = active ? '♥' : '♡';
    });
  });

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
  majdoorFilters.innerHTML = ['all', ...usedSkills].map(s => `
    <button class="chip-filter light ${s === 'all' ? 'active' : ''}" data-skill="${s}">
      ${s === 'all' ? '🌐 Sabhi' : workerLabels[s]}
    </button>`).join('');

  function renderWorkers() {
    const list = activeSkill === 'all' ? workers : workers.filter(w => w.skill === activeSkill);
    workerGrid.innerHTML = list.map(w => `
      <div class="worker-card">
        <div class="worker-top">
          <img src="${w.img}" alt="${w.name}">
          <span class="worker-status ${w.available ? 'online' : 'offline'}">${w.available ? '🟢 Available' : '⚪ Busy'}</span>
        </div>
        <h4>${w.name}</h4>
        <p class="worker-skill">${w.label} · ${w.exp} anubhav</p>
        <p class="worker-loc">📍 ${w.loc}</p>
        <div class="worker-bottom">
          <div>
            <span class="worker-stars">★ ${w.rating}</span>
            <span class="worker-wage">₹${w.wage}<small>/din</small></span>
          </div>
          <button class="btn-chip worker-contact">Book Karein</button>
        </div>
      </div>`).join('');

    workerGrid.querySelectorAll('.worker-contact').forEach(btn => {
      btn.addEventListener('click', () => window.KM.toast('Majdoor ki jaankari WhatsApp par bheji ja rahi hai... 📲'));
    });
  }
  renderWorkers();

  majdoorFilters.querySelectorAll('.chip-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      activeSkill = btn.dataset.skill;
      majdoorFilters.querySelectorAll('.chip-filter').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      renderWorkers();
    });
  });

  /* ============================================
     RENDER — Yojana (govt schemes)
     ============================================ */
  const yojanaGrid = document.getElementById('yojanaGrid');
  yojanaGrid.innerHTML = yojanas.map(y => `
    <div class="yojana-card">
      <div class="yojana-icon">${y.icon}</div>
      <h4>${y.name}</h4>
      <p class="yojana-benefit">${y.benefit}</p>
      <div class="yojana-docs">
        ${y.docs.map(d => `<span>📄 ${d}</span>`).join('')}
      </div>
      <button class="btn-chip yojana-btn">Aur Jaanein →</button>
    </div>`).join('');

  yojanaGrid.querySelectorAll('.yojana-btn').forEach(btn => {
    btn.addEventListener('click', () => window.KM.toast('Yojana ki poori jaankari jald hi yahan milegi 📜'));
  });

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
    btn.addEventListener('click', () => window.KM.toast('Seller ki jaankari WhatsApp par bheji ja rahi hai... 📲'));
  });

});
