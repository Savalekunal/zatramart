/* ============================================
   ZatraMart — Shop / Search Results page
   (nav/cart/wishlist/mega-menu/auth live in js/common.js)
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  const { farmTypes, categories, catLabels, products } = window.KM_DATA;
  let allProducts = products.slice();

  const productGrid = document.getElementById('productGrid');
  const filterCount = document.getElementById('filterCount');
  const filterCategoryList = document.getElementById('filterCategoryList');
  const filtersSidebar = document.getElementById('filtersSidebar');
  const filtersToggleBtn = document.getElementById('filtersToggleBtn');
  const sortSelect = document.getElementById('sortSelect');
  const priceRange = document.getElementById('priceRange');
  const priceRangeVal = document.getElementById('priceRangeVal');
  const urlParams = new URLSearchParams(location.search);
  const urlCat = urlParams.get('cat');
  const urlSearch = urlParams.get('search');

  function matchesCat(p, key) { return p.cat === key || (p.tags && p.tags.includes(key)); }

  let searchTerm = urlSearch || '';
  let selectedCats = new Set((urlCat && products.some(p => matchesCat(p, urlCat))) ? [urlCat] : []);
  let selectedRating = 0;
  let selectedDiscounts = new Set();
  let sellerFilters = new Set();
  let sortBy = 'featured';

  /* ---------- Crop-hub banner ---------- */
  const farmTypeKeys = new Set(farmTypes.map(f => f.key));
  const cropHubBanner = document.getElementById('cropHubBanner');
  const shopPlainHead = document.getElementById('shopPlainHead');
  if (urlCat && farmTypeKeys.has(urlCat) && !urlSearch) {
    const farmType = farmTypes.find(f => f.key === urlCat);
    document.getElementById('cropHubIcon').textContent = farmType.icon;
    document.getElementById('cropHubTitle').textContent = farmType.name;
    cropHubBanner.hidden = false;
    shopPlainHead.hidden = true;
    document.title = `${farmType.name} — Seeds, Fertilizer, Tools aur Zaroori Saman | ZatraMart`;
  }

  const usedCats = [...new Set(products.map(p => p.cat))];
  filterCategoryList.innerHTML = usedCats.map(c => `
    <label><input type="checkbox" data-cat-filter="${c}" ${selectedCats.has(c) ? 'checked' : ''}> ${catLabels[c]}</label>
  `).join('');

  const maxProductPrice = Math.ceil(Math.max(...products.map(p => p.price)) / 500) * 500;
  priceRange.max = maxProductPrice;
  priceRange.value = maxProductPrice;
  priceRangeVal.textContent = `₹${maxProductPrice.toLocaleString('en-IN')}+`;
  let priceMax = maxProductPrice;

  function productCardHTML(p) {
    const wished = window.KM.isWishlisted(p.id);

    if (p.isCommunity) {
      const name = window.KM.esc(p.name);
      const sellerName = window.KM.esc(p.sellerName || 'Community Seller');
      const condition = window.KM.esc(p.condition || '');
      return `
        <div class="product-card">
          <div class="product-img">
            <a href="product.html?id=${p.id}" class="product-img-link">
              <img src="${window.KM.esc(p.img)}" alt="${name}" loading="lazy">
            </a>
            <span class="seller-badge third">🏪 Community Seller</span>
            <button class="wish-icon ${wished ? 'active' : ''}" data-wish="${p.id}" aria-label="Add to wishlist">${wished ? '♥' : '♡'}</button>
          </div>
          <div class="product-info">
            <span class="product-cat-tag">${catLabels[p.cat] || p.cat}</span>
            <a href="product.html?id=${p.id}" class="product-title-link"><h4>${name}</h4></a>
            <p class="delivery-line">👤 ${sellerName}${condition ? ' · ' + condition : ''}</p>
            <div class="price-line">
              <span class="price-now">₹${p.price.toLocaleString('en-IN')}</span>
              ${p.negotiable ? '<small class="negotiable-badge">NEGOTIABLE</small>' : ''}
            </div>
            <div style="display:flex; gap:8px;">
              <button class="btn btn-primary" data-buy="${p.id}" style="flex:1; padding:9px; font-size:.84rem;">⚡ Buy Now</button>
              <button class="add-cart-btn" data-add="${p.id}" style="flex:1;">🛒 Add to Cart</button>
            </div>
          </div>
        </div>`;
    }

    const discount = Math.round(((p.old - p.price) / p.old) * 100);
    const days = 2 + (p.id.charCodeAt(p.id.length - 1) % 4);
    const eta = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return `
      <div class="product-card">
        <div class="product-img">
          <a href="product.html?id=${p.id}" class="product-img-link">
            <img src="${p.img}" alt="${p.name}" loading="lazy">
          </a>
          <span class="seller-badge ${p.seller === 'third' ? 'third' : ''}">${p.seller === 'third' ? 'Verified Seller' : 'ZatraMart Direct'}</span>
          <span class="discount-badge">${discount}% OFF</span>
          <button class="wish-icon ${wished ? 'active' : ''}" data-wish="${p.id}" aria-label="Add to wishlist">${wished ? '♥' : '♡'}</button>
        </div>
        <div class="product-info">
          <span class="product-cat-tag">${catLabels[p.cat]}</span>
          <a href="product.html?id=${p.id}" class="product-title-link"><h4>${p.name}</h4></a>
          <div class="stars-sm">★★★★★ <span>(${p.rating} · ${p.rev})</span></div>
          <div class="price-line">
            <span class="price-now">₹${p.price.toLocaleString('en-IN')}</span>
            <span class="price-old">₹${p.old.toLocaleString('en-IN')}</span>
          </div>
          <p class="delivery-line">🚚 FREE delivery <strong>${eta}</strong></p>
          <button class="add-cart-btn" data-add="${p.id}">🛒 Cart Mein Daalein</button>
        </div>
      </div>`;
  }

  function emptyStateHTML() {
    const suggestions = categories.slice(0, 3);
    // Distinguish "you searched for something specific and it's not here" from a plain empty filter result —
    // pretending a searched product exists somewhere is worse than saying plainly that it doesn't.
    const title = searchTerm
      ? `"${window.KM.esc(searchTerm)}" ke liye koi exact match nahi mila`
      : 'Yeh cheez jald ZatraMart par aa rahi hai 🌱';
    const sub = searchTerm
      ? 'Spelling check karein, ya neeche in categories mein dekhein:'
      : 'Abhi humare paas iske liye product nahi hai — tab tak yeh categories dekhein:';
    return `
      <div class="no-results">
        <p class="no-results-title">${title}</p>
        <p>${sub}</p>
        <div class="no-results-links">
          ${suggestions.map(c => `<a href="shop.html?cat=${c.key}" class="btn-chip">${c.icon} ${c.name}</a>`).join('')}
        </div>
      </div>`;
  }

  function renderProducts() {
    let list = allProducts;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || catLabels[p.cat].toLowerCase().includes(q));
    }
    if (selectedCats.size > 0) list = list.filter(p => [...selectedCats].some(c => matchesCat(p, c)));
    if (selectedRating > 0) list = list.filter(p => p.rating >= selectedRating);
    if (selectedDiscounts.size > 0) {
      const minDiscount = Math.min(...selectedDiscounts);
      list = list.filter(p => Math.round(((p.old - p.price) / p.old) * 100) >= minDiscount);
    }
    list = list.filter(p => p.price <= priceMax);
    if (sellerFilters.size > 0) list = list.filter(p => sellerFilters.has(p.seller));

    const sorted = [...list];
    if (sortBy === 'priceLow') sorted.sort((a, b) => a.price - b.price);
    else if (sortBy === 'priceHigh') sorted.sort((a, b) => b.price - a.price);
    else if (sortBy === 'rating') sorted.sort((a, b) => b.rating - a.rating);
    else if (sortBy === 'discount') sorted.sort((a, b) => {
      const da = Math.round(((a.old - a.price) / a.old) * 100);
      const db = Math.round(((b.old - b.price) / b.old) * 100);
      return db - da;
    });

    const singleFarmType = (!searchTerm && selectedCats.size === 1 && farmTypeKeys.has([...selectedCats][0])) ? [...selectedCats][0] : null;

    if (searchTerm) {
      filterCount.innerHTML = `"${window.KM.esc(searchTerm)}" ke liye ${sorted.length} products mile <button class="clear-search-btn" id="clearSearchBtn">✕ Clear Search</button>`;
    } else if (singleFarmType) {
      filterCount.textContent = `${catLabels[singleFarmType]} ke liye ${sorted.length} products mile — seeds, fertilizer, pesticide, tools aur zaroori saman`;
    } else {
      filterCount.textContent = `${sorted.length} products dikha rahe hain — total catalog mein ${allProducts.length} hain`;
    }

    productGrid.innerHTML = sorted.length ? sorted.map(productCardHTML).join('') : emptyStateHTML();

    productGrid.querySelectorAll('[data-add]').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = allProducts.find(p => p.id === btn.dataset.add);
        if (p) window.KM.addToCart({ id: p.id, name: p.name, price: p.price, img: p.img });
      });
    });
    productGrid.querySelectorAll('[data-buy]').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = allProducts.find(p => p.id === btn.dataset.buy);
        if (!p) return;
        window.KM.addToCart({ id: p.id, name: p.name, price: p.price, img: p.img });
        window.KM.openCart();
      });
    });
    productGrid.querySelectorAll('[data-wish]').forEach(btn => {
      btn.addEventListener('click', () => {
        const active = window.KM.toggleWishlist(btn.dataset.wish);
        btn.classList.toggle('active', active);
        btn.textContent = active ? '♥' : '♡';
      });
    });
    const clearBtn = document.getElementById('clearSearchBtn');
    if (clearBtn) clearBtn.addEventListener('click', () => {
      searchTerm = '';
      const si = document.getElementById('searchInput');
      if (si) si.value = '';
      renderProducts();
    });
  }
  renderProducts();

  filterCategoryList.addEventListener('change', (e) => {
    if (e.target.matches('[data-cat-filter]')) {
      const cat = e.target.dataset.catFilter;
      if (e.target.checked) selectedCats.add(cat); else selectedCats.delete(cat);
      renderProducts();
    }
  });

  document.querySelectorAll('input[name="ratingFilter"]').forEach(radio => {
    radio.addEventListener('change', () => { selectedRating = parseFloat(radio.value); renderProducts(); });
  });

  document.querySelectorAll('[data-discount]').forEach(cb => {
    cb.addEventListener('change', () => {
      const val = parseInt(cb.dataset.discount, 10);
      if (cb.checked) selectedDiscounts.add(val); else selectedDiscounts.delete(val);
      renderProducts();
    });
  });

  priceRange.addEventListener('input', () => {
    priceMax = parseInt(priceRange.value, 10);
    priceRangeVal.textContent = priceMax >= maxProductPrice ? `₹${maxProductPrice.toLocaleString('en-IN')}+` : `₹${priceMax.toLocaleString('en-IN')}`;
    renderProducts();
  });

  function toggleSeller(key, checked) { if (checked) sellerFilters.add(key); else sellerFilters.delete(key); renderProducts(); }
  document.getElementById('sellerDirect').addEventListener('change', (e) => toggleSeller('direct', e.target.checked));
  document.getElementById('sellerThird').addEventListener('change', (e) => toggleSeller('third', e.target.checked));

  sortSelect.addEventListener('change', () => { sortBy = sortSelect.value; renderProducts(); });

  document.getElementById('clearFiltersBtn').addEventListener('click', () => {
    searchTerm = ''; selectedCats.clear(); selectedRating = 0; selectedDiscounts.clear(); sellerFilters.clear();
    priceMax = maxProductPrice; priceRange.value = maxProductPrice;
    priceRangeVal.textContent = `₹${maxProductPrice.toLocaleString('en-IN')}+`;
    filterCategoryList.querySelectorAll('[data-cat-filter]').forEach(cb => cb.checked = false);
    document.querySelector('input[name="ratingFilter"][value="0"]').checked = true;
    document.querySelectorAll('[data-discount]').forEach(cb => cb.checked = false);
    document.getElementById('sellerDirect').checked = false;
    document.getElementById('sellerThird').checked = false;
    sortSelect.value = 'featured'; sortBy = 'featured';
    const si = document.getElementById('searchInput');
    if (si) si.value = '';
    cropHubBanner.hidden = true;
    shopPlainHead.hidden = false;
    renderProducts();
  });

  if (filtersToggleBtn) {
    filtersToggleBtn.addEventListener('click', () => {
      const show = filtersSidebar.classList.toggle('show');
      filtersToggleBtn.textContent = show ? '✕ Filters Band Karein' : '🔧 Filters';
    });
  }

  window.applyKMSearch = function (term) {
    searchTerm = term;
    selectedCats.clear();
    filterCategoryList.querySelectorAll('[data-cat-filter]').forEach(cb => cb.checked = false);
    cropHubBanner.hidden = true;
    shopPlainHead.hidden = false;
    renderProducts();
  };

  /* ---------- Community Sellers (real, user-submitted products via "Seller Bane") —
     merged straight into the main catalog grid so they get the same category filter,
     search and sort as every other product, instead of sitting in an unfiltered list. ---------- */
  async function loadSellerProducts() {
    const items = await window.KM.getSellerProducts();
    const mapped = items.map(p => ({
      id: p.id, name: p.name, cat: p.cat, price: p.price, img: p.img,
      seller: 'third', isCommunity: true,
      sellerName: p.sellerName, sellerPhone: p.sellerPhone, sellerId: p.sellerId,
      condition: p.condition, negotiable: p.negotiable,
    }));
    allProducts = [...products, ...mapped];
    renderProducts();
  }
  loadSellerProducts();
  window.KM.onSellerProductChange(loadSellerProducts);

});
