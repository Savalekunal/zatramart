/* ============================================
   ZatraMart — Product Detail Page script
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  const { products, catLabels } = window.KM_DATA;
  const id = new URLSearchParams(location.search).get('id');
  const product = products.find(p => p.id === id);

  if (!product) {
    // Community/seller-submitted products don't have a detail page of their own yet — rather
    // than silently showing an unrelated catalog product (very misleading), say so plainly.
    document.getElementById('pageTitle').textContent = 'Product Nahi Mila | ZatraMart';
    document.getElementById('top').innerHTML = `
      <div class="container" style="padding:80px 20px; text-align:center;">
        <p class="no-results-title">😕 Yeh product nahi mila</p>
        <p style="margin-bottom:20px;">Ho sakta hai yeh listing hata di gayi ho, ya link galat ho.</p>
        <a href="shop.html" class="btn btn-primary">🛒 Shop Par Jaayein</a>
      </div>`;
    return;
  }

  document.getElementById('pageTitle').textContent = product.name + ' | ZatraMart';

  const discount = Math.round(((product.old - product.price) / product.old) * 100);

  /* ---------- Breadcrumb ---------- */
  document.getElementById('breadcrumb').innerHTML = `
    <a href="index.html">Home</a> <span>/</span>
    <a href="shop.html?cat=${product.cat}">${catLabels[product.cat]}</a> <span>/</span>
    <span class="crumb-current">${product.name}</span>
  `;

  /* ---------- Gallery ---------- */
  const gallery = document.getElementById('pdpGallery');
  gallery.innerHTML = `
    <div class="pdp-thumbs" id="pdpThumbs">
      ${product.images.map((src, i) => `
        <button class="pdp-thumb ${i === 0 ? 'active' : ''}" data-i="${i}"><img src="${src}" alt="thumb ${i + 1}"></button>
      `).join('')}
    </div>
    <div class="pdp-main-img">
      <span class="seller-badge ${product.seller === 'third' ? 'third' : ''}">${product.seller === 'third' ? 'Verified Seller' : 'ZatraMart Direct'}</span>
      <span class="discount-badge">${discount}% OFF</span>
      <img src="${product.images[0]}" id="pdpMainImg" alt="${product.name}">
    </div>
  `;
  gallery.querySelectorAll('.pdp-thumb').forEach(btn => {
    btn.addEventListener('click', () => {
      gallery.querySelectorAll('.pdp-thumb').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('pdpMainImg').src = product.images[+btn.dataset.i];
    });
  });

  /* ---------- Info panel ---------- */
  // A manufacturer/brand name is only ever shown once that brand's assets are AUTHORIZED
  // (real agreement on file — see brandAuthorizationStatus in data.js). Everything else stays
  // under ZatraMart's own generic listing, same as today.
  const brandLine = (product.brandAuthorizationStatus === 'AUTHORIZED' && product.authorizedBrand)
    ? `<span class="pdp-brand">${product.authorizedBrand}</span>`
    : `<span class="pdp-brand">${product.brand}</span>`;
  const sellerRating = (Math.max(3.8, product.rating - 0.2)).toFixed(1);
  document.getElementById('pdpInfo').innerHTML = `
    ${brandLine}
    <h1 class="pdp-title">${product.name}</h1>
    <div class="pdp-rating-badge">
      <span>${product.rating} ★</span>
      <small>${product.rev.toLocaleString('en-IN')} Ratings</small>
    </div>

    <div class="pdp-price-row">
      <span class="pdp-price">₹${product.price.toLocaleString('en-IN')}</span>
      <span class="pdp-mrp">₹${product.old.toLocaleString('en-IN')}</span>
      <span class="pdp-discount">${discount}% OFF</span>
    </div>
    <p class="pdp-tax-note">inclusive of all taxes</p>

    <div class="pdp-offers">
      <h5>🏷️ Best Offers</h5>
      <ul>
        <li><strong>Bank Offer:</strong> 10% instant discount on ZatraMart UPI payments</li>
        <li><strong>Coupon:</strong> Flat ₹50 off on prepaid orders above ₹999 — code <strong>KISAN50</strong></li>
        <li><strong>Delivery:</strong> Free delivery on orders above ₹499</li>
      </ul>
    </div>

    <div class="pdp-qty">
      <span>Quantity</span>
      <div class="qty-stepper">
        <button id="qtyMinus" aria-label="Decrease">−</button>
        <span id="qtyVal">1</span>
        <button id="qtyPlus" aria-label="Increase">+</button>
      </div>
    </div>

    <div class="pdp-delivery">
      <h5>📍 Delivery Options</h5>
      <div class="delivery-check-row">
        <input type="text" maxlength="6" id="pincodeInput" placeholder="Enter pincode">
        <button class="btn-chip" id="checkPincodeBtn">Check</button>
      </div>
      <p class="delivery-result" id="deliveryResult"></p>
    </div>

    <div class="pdp-seller">
      <span>Sold by: <strong>${product.brand}</strong></span>
      <span class="pdp-seller-rating">★ ${sellerRating} Seller Rating</span>
    </div>

    <div class="pdp-actions">
      <button class="pdp-wish-btn" id="pdpWishBtn" aria-label="Wishlist">♡</button>
      <button class="btn btn-outline pdp-add" id="pdpAddBtn">🛒 Add to Cart</button>
      <button class="btn btn-primary pdp-buy" id="pdpBuyBtn">⚡ Buy Now</button>
    </div>

    <div class="pdp-trust-row">
      <span>✅ 100% Genuine</span>
      <span>↩️ 7 Day Return</span>
      <span>🔒 Secure Payment</span>
    </div>
  `;

  /* Quantity stepper */
  let qty = 1;
  const qtyVal = document.getElementById('qtyVal');
  document.getElementById('qtyMinus').addEventListener('click', () => { if (qty > 1) { qty--; qtyVal.textContent = qty; } });
  document.getElementById('qtyPlus').addEventListener('click', () => { if (qty < 20) { qty++; qtyVal.textContent = qty; } });

  /* Delivery check (UI simulation) */
  document.getElementById('checkPincodeBtn').addEventListener('click', () => {
    const val = document.getElementById('pincodeInput').value.trim();
    const result = document.getElementById('deliveryResult');
    if (!/^\d{6}$/.test(val)) {
      result.textContent = '⚠️ Sahi 6-digit pincode daalein';
      result.className = 'delivery-result warn';
      return;
    }
    const days = 2 + (parseInt(val[5], 10) % 4);
    const d = new Date();
    d.setDate(d.getDate() + days);
    const dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    result.innerHTML = `✅ Delivery by <strong>${dateStr}</strong> · Cash on Delivery available`;
    result.className = 'delivery-result ok';
  });

  /* Wishlist button state */
  const wishBtn = document.getElementById('pdpWishBtn');
  function syncWish() {
    const active = window.KM.isWishlisted(product.id);
    wishBtn.classList.toggle('active', active);
    wishBtn.textContent = active ? '♥' : '♡';
  }
  syncWish();
  wishBtn.addEventListener('click', () => { window.KM.toggleWishlist(product.id); syncWish(); });

  /* Add to cart / buy now */
  document.getElementById('pdpAddBtn').addEventListener('click', () => window.KM.addToCart(product, qty));
  document.getElementById('pdpBuyBtn').addEventListener('click', () => {
    window.KM.addToCart(product, qty);
    window.KM.openCart();
  });

  /* ---------- Details / specs ---------- */
  document.getElementById('pdpDetails').innerHTML = `
    <div class="section-head pdp-section-head"><h2>Product Details</h2></div>
    <p class="pdp-desc">${product.desc}</p>
    <table class="pdp-specs">
      ${Object.entries(product.specs).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}
    </table>
  `;

  /* ---------- Reviews ---------- */
  function ratingDistribution(r) {
    if (r >= 4.6) return { 5: 74, 4: 18, 3: 5, 2: 2, 1: 1 };
    if (r >= 4.3) return { 5: 60, 4: 26, 3: 8, 2: 4, 1: 2 };
    if (r >= 4.0) return { 5: 48, 4: 30, 3: 12, 2: 6, 1: 4 };
    return { 5: 34, 4: 30, 3: 18, 2: 10, 1: 8 };
  }
  const dist = ratingDistribution(product.rating);
  const esc = window.KM.esc;

  function seedReviewCards() {
    return product.reviews.map(r => `
      <div class="review-card">
        <div class="review-head">
          <span class="review-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
          <span class="review-verified">✅ Verified Buyer</span>
        </div>
        <p class="review-text">"${r.text}"</p>
        <div class="review-meta"><strong>${r.name}</strong> · ${r.loc} · ${r.days} din pehle · 👍 Helpful (${r.helpful})</div>
      </div>`).join('');
  }
  function realReviewCards(reviews) {
    return reviews.map(r => `
      <div class="review-card">
        <div class="review-head">
          <span class="review-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
          <span class="review-verified">🌾 ZatraMart User</span>
        </div>
        ${r.comment ? `<p class="review-text">"${esc(r.comment)}"</p>` : ''}
        <div class="review-meta"><strong>${esc(r.reviewerName)}</strong></div>
      </div>`).join('');
  }

  document.getElementById('pdpReviews').innerHTML = `
    <div class="section-head pdp-section-head"><h2>Ratings &amp; Reviews</h2></div>
    <div class="review-summary">
      <div class="review-score">
        <span class="score-num">${product.rating}<small>/5</small></span>
        <span class="score-stars">★★★★★</span>
        <span class="score-count">${product.rev.toLocaleString('en-IN')} Ratings</span>
      </div>
      <div class="review-bars">
        ${[5, 4, 3, 2, 1].map(star => `
          <div class="review-bar-row">
            <span>${star}★</span>
            <div class="bar-track"><div class="bar-fill" style="width:${dist[star]}%"></div></div>
            <span>${dist[star]}%</span>
          </div>`).join('')}
      </div>
    </div>
    <div class="review-list" id="pdpReviewList">${seedReviewCards()}</div>

    <div class="worker-review-form" id="pdpReviewForm" style="max-width:520px; margin-top:24px;">
      <h4>Apna Review Dein</h4>
      <div class="worker-rate-picker" id="pdpRatePicker">
        ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="rate-star" data-rate="${n}">★</button>`).join('')}
      </div>
      <textarea class="auth-field" id="pdpReviewComment" rows="2" placeholder="Product kaisa laga? (optional)"></textarea>
      <button class="btn btn-primary btn-block" id="pdpReviewSubmit" type="button">Review Submit Karein</button>
    </div>
  `;

  /* ---------- Real, logged-in-user reviews (merged in front of the seed reviews) ---------- */
  const pdpRatePicker = document.getElementById('pdpRatePicker');
  const pdpReviewComment = document.getElementById('pdpReviewComment');
  const pdpReviewSubmit = document.getElementById('pdpReviewSubmit');
  let selectedRating = 0;
  let myExistingReview = null;

  function paintStars() {
    pdpRatePicker.querySelectorAll('.rate-star').forEach(s => s.classList.toggle('active', +s.dataset.rate <= selectedRating));
  }
  pdpRatePicker.querySelectorAll('.rate-star').forEach(star => {
    star.addEventListener('click', () => { selectedRating = +star.dataset.rate; paintStars(); });
  });

  async function loadProductReviews() {
    const reviews = await window.KM.getProductReviews(product.id);
    document.getElementById('pdpReviewList').innerHTML = realReviewCards(reviews) + seedReviewCards();

    const session = window.KM.isLoggedIn() ? window.KM.getSession() : null;
    myExistingReview = session ? reviews.find(r => r.reviewerId === session.id) : null;
    selectedRating = myExistingReview ? myExistingReview.rating : 0;
    pdpReviewComment.value = (myExistingReview && myExistingReview.comment) || '';
    pdpReviewSubmit.textContent = myExistingReview ? 'Review Update Karein' : 'Review Submit Karein';
    paintStars();
  }
  loadProductReviews();

  pdpReviewSubmit.addEventListener('click', async () => {
    if (!window.KM.isLoggedIn()) {
      window.KM.setPendingAction(loadProductReviews);
      window.KM.openAuth();
      window.KM.toast('Review dene ke liye pehle login karein 👤');
      return;
    }
    if (!selectedRating) { window.KM.toast('⚠️ Pehle rating (stars) chunein'); return; }
    const comment = pdpReviewComment.value.trim();
    pdpReviewSubmit.disabled = true;
    pdpReviewSubmit.textContent = 'Save ho raha hai...';
    const ok = await window.KM.addProductReview(product.id, selectedRating, comment);
    pdpReviewSubmit.disabled = false;
    if (!ok) { pdpReviewSubmit.textContent = myExistingReview ? 'Review Update Karein' : 'Review Submit Karein'; return; }
    window.KM.toast('✅ Review save ho gaya!');
    await loadProductReviews();
  });

  /* ---------- Similar products ---------- */
  function miniCard(p) {
    const d = Math.round(((p.old - p.price) / p.old) * 100);
    const wished = window.KM.isWishlisted(p.id);
    return `
      <div class="product-card">
        <div class="product-img">
          <a href="product.html?id=${p.id}" class="product-img-link"><img src="${p.img}" alt="${p.name}" loading="lazy"></a>
          <span class="seller-badge ${p.seller === 'third' ? 'third' : ''}">${p.seller === 'third' ? 'Verified Seller' : 'ZatraMart Direct'}</span>
          <span class="discount-badge">${d}% OFF</span>
          <button class="wish-icon ${wished ? 'active' : ''}" data-wish="${p.id}">${wished ? '♥' : '♡'}</button>
        </div>
        <div class="product-info">
          <span class="product-cat-tag">${catLabels[p.cat]}</span>
          <a href="product.html?id=${p.id}" class="product-title-link"><h4>${p.name}</h4></a>
          <div class="stars-sm">★★★★★ <span>(${p.rating} · ${p.rev})</span></div>
          <div class="price-line">
            <span class="price-now">₹${p.price.toLocaleString('en-IN')}</span>
            <span class="price-old">₹${p.old.toLocaleString('en-IN')}</span>
          </div>
          <button class="add-cart-btn" data-add="${p.id}">🛒 Cart Mein Daalein</button>
        </div>
      </div>`;
  }

  function bindCards(container) {
    container.querySelectorAll('[data-add]').forEach(btn => {
      btn.addEventListener('click', () => window.KM.addToCart(products.find(p => p.id === btn.dataset.add)));
    });
    container.querySelectorAll('[data-wish]').forEach(btn => {
      btn.addEventListener('click', () => {
        const active = window.KM.toggleWishlist(btn.dataset.wish);
        btn.classList.toggle('active', active);
        btn.textContent = active ? '♥' : '♡';
      });
    });
  }

  const similar = products.filter(p => p.cat === product.cat && p.id !== product.id).slice(0, 4);
  const fillers = similar.length < 4 ? products.filter(p => p.id !== product.id && !similar.includes(p)).slice(0, 4 - similar.length) : [];
  const similarGrid = document.getElementById('similarGrid');
  similarGrid.innerHTML = similar.concat(fillers).map(miniCard).join('');
  bindCards(similarGrid);

  /* ---------- Recently viewed ---------- */
  function loadRecent() { try { return JSON.parse(localStorage.getItem('km_recent') || '[]'); } catch (e) { return []; } }
  function saveRecent(list) { localStorage.setItem('km_recent', JSON.stringify(list)); }

  let recent = loadRecent().filter(rid => rid !== product.id);
  recent.unshift(product.id);
  recent = recent.slice(0, 8);
  saveRecent(recent);

  const recentIds = recent.filter(rid => rid !== product.id);
  const recentSection = document.getElementById('recentSection');
  if (recentIds.length === 0) {
    recentSection.style.display = 'none';
  } else {
    const recentProducts = recentIds.map(rid => products.find(p => p.id === rid)).filter(Boolean).slice(0, 4);
    const recentGrid = document.getElementById('recentGrid');
    recentGrid.innerHTML = recentProducts.map(miniCard).join('');
    bindCards(recentGrid);
  }

  window.scrollTo(0, 0);
});
