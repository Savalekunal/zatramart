/* ============================================
   ZatraMart — Common Script (runs on every page)
   Handles: preloader, nav, mega-menu, cart, wishlist, auth, search, checkout entry
   ============================================ */

window.KM = (function () {

  function loadJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch (e) { return fallback; }
  }
  function saveJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

  // Escapes any user-submitted text (search terms, listing names, review comments, etc.)
  // before it's interpolated into an innerHTML template string — every real-data render
  // path across the site needs this, since none of it is trusted, server-escaped markup.
  function escapeHTML(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  let cart = loadJSON('km_cart', []);
  let wishlist = loadJSON('km_wishlist', []);
  let session = null; // cached {id, name, mobile, email, role} — hydrated from Supabase, see initAuth() below
  let pendingAction = null; // one queued action (e.g. "reopen Post Ad modal") to run right after a successful login

  const listeners = { cart: [], wishlist: [], auth: [], sellerProduct: [] };
  function emit(type) { listeners[type].forEach(fn => fn()); }

  const api = {
    esc: escapeHTML,
    onCartChange: (fn) => listeners.cart.push(fn),
    onWishlistChange: (fn) => listeners.wishlist.push(fn),
    onAuthChange: (fn) => listeners.auth.push(fn),
    onSellerProductChange: (fn) => listeners.sellerProduct.push(fn),
    getCart: () => cart,
    getWishlist: () => wishlist,
    isWishlisted: (id) => wishlist.includes(id),
    addToCart(product, qty) {
      qty = qty || 1;
      const existing = cart.find(i => i.id === product.id);
      if (existing) existing.qty += qty;
      else cart.push({ id: product.id, name: product.name, price: product.price, img: product.img, qty: qty });
      saveJSON('km_cart', cart);
      emit('cart');
      api.toast(`"${product.name}" cart mein add ho gaya! ✅`);
    },
    removeFromCart(index) {
      cart.splice(index, 1);
      saveJSON('km_cart', cart);
      emit('cart');
    },
    clearCart() { cart = []; saveJSON('km_cart', cart); emit('cart'); },
    toggleWishlist(id) {
      const i = wishlist.indexOf(id);
      if (i === -1) { wishlist.push(id); } else { wishlist.splice(i, 1); }
      saveJSON('km_wishlist', wishlist);
      emit('wishlist');
      return wishlist.includes(id);
    },
    toast(msg) { showToast(msg); },

    /* ---------- Auth ---------- */
    getSession: () => session,
    setSession(s) { session = s; },
    isLoggedIn: () => !!session,
    async clearSession() {
      await window.KM_SUPABASE.auth.signOut();
      session = null;
    },
    /* Queues one action to run automatically right after the next successful login/signup —
       so "Apna Saman Bechein" while logged out reopens the form instead of dropping the user on a toast. */
    setPendingAction(fn) { pendingAction = fn; },
    runPendingAction() {
      if (!pendingAction) return;
      const fn = pendingAction;
      pendingAction = null;
      fn();
    },

    /* ---------- Addresses (Supabase, RLS-scoped to the logged-in user) ---------- */
    async getAddresses() {
      if (!session) return [];
      const { data, error } = await window.KM_SUPABASE.from('addresses')
        .select('*').eq('user_id', session.id).order('created_at', { ascending: false });
      if (error) { console.error(error); return []; }
      return data;
    },
    async addAddress(addr) {
      addr.id = 'addr' + Date.now();
      const row = Object.assign({}, addr, { user_id: session.id });
      const { error } = await window.KM_SUPABASE.from('addresses').insert(row);
      if (error) { console.error(error); api.toast('⚠️ Address save nahi ho paaya, dobara try karein'); return null; }
      return addr;
    },

    /* ---------- Orders (Supabase, RLS-scoped to the logged-in user) ---------- */
    async getOrders() {
      if (!session) return [];
      const { data, error } = await window.KM_SUPABASE.from('orders')
        .select('*').eq('user_id', session.id).order('created_at', { ascending: false });
      if (error) { console.error(error); return []; }
      return data.map(rowToOrder);
    },
    async addOrder(order) {
      const row = orderToRow(order, session.id);
      const { error } = await window.KM_SUPABASE.from('orders').insert(row);
      if (error) { console.error(error); api.toast('⚠️ Order save nahi ho paaya, dobara try karein'); }
    },
    async getOrder(id) {
      const { data, error } = await window.KM_SUPABASE.from('orders').select('*').eq('id', id).maybeSingle();
      if (error || !data) { if (error) console.error(error); return null; }
      return rowToOrder(data);
    },

    /* ---------- Real photo uploads (Bazaar ads + seller products), Supabase Storage ---------- */
    async uploadListingImages(files, folder) {
      const urls = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const path = `${folder}/${session.id}/${Date.now()}-${i}-${safeName}`;
        const { error } = await window.KM_SUPABASE.storage.from('listing-photos').upload(path, file);
        if (error) { console.error(error); api.toast('⚠️ Ek photo upload nahi ho paayi, baaki try ho rahi hain'); continue; }
        const { data } = window.KM_SUPABASE.storage.from('listing-photos').getPublicUrl(path);
        urls.push(data.publicUrl);
      }
      return urls;
    },

    /* ---------- Bazaar listings (Supabase, public read / own write) ---------- */
    async getBazaarListings() {
      const { data, error } = await window.KM_SUPABASE.from('bazaar_listings').select('*').eq('status', 'active').order('created_at', { ascending: false });
      if (error) { console.error(error); return []; }
      return data.map(rowToBazaarListing);
    },
    async getMyBazaarListings() {
      if (!session) return [];
      const { data, error } = await window.KM_SUPABASE.from('bazaar_listings').select('*').eq('user_id', session.id).order('created_at', { ascending: false });
      if (error) { console.error(error); return []; }
      return data.map(rowToBazaarListing);
    },
    async addBazaarListing(listing) {
      const row = {
        id: listing.id, user_id: session.id, name: listing.name, cat: listing.cat, type: listing.type,
        rent_unit: listing.rentUnit || false, price: listing.price, loc: listing.loc, meta: listing.meta,
        condition: listing.condition || null, negotiable: listing.negotiable !== false,
        images: listing.images, seller_name: await sellerDisplayName(), seller_phone: session.mobile,
      };
      const { error } = await window.KM_SUPABASE.from('bazaar_listings').insert(row);
      if (error) { console.error(error); api.toast('⚠️ Listing post nahi ho paayi, dobara try karein'); return false; }
      return true;
    },
    async updateBazaarListingStatus(id, status) {
      const { error } = await window.KM_SUPABASE.from('bazaar_listings').update({ status }).eq('id', id).eq('user_id', session.id);
      if (error) { console.error(error); api.toast('⚠️ Status update nahi ho paaya'); return false; }
      return true;
    },
    async deleteBazaarListing(id) {
      const { error } = await window.KM_SUPABASE.from('bazaar_listings').delete().eq('id', id).eq('user_id', session.id);
      if (error) { console.error(error); api.toast('⚠️ Listing delete nahi ho paayi'); return false; }
      return true;
    },

    /* ---------- Seller-submitted catalog products (Supabase, public read / own write) ---------- */
    async getSellerProducts() {
      const { data, error } = await window.KM_SUPABASE.from('seller_products').select('*').eq('status', 'active').order('created_at', { ascending: false });
      if (error) { console.error(error); return []; }
      return data.map(rowToSellerProduct);
    },
    async getMySellerProducts() {
      if (!session) return [];
      const { data, error } = await window.KM_SUPABASE.from('seller_products').select('*').eq('user_id', session.id).order('created_at', { ascending: false });
      if (error) { console.error(error); return []; }
      return data.map(rowToSellerProduct);
    },
    async addSellerProduct(p) {
      const row = {
        id: p.id, user_id: session.id, name: p.name, cat: p.cat, price: p.price, description: p.description,
        condition: p.condition || null, negotiable: p.negotiable !== false,
        images: p.images, seller_name: await sellerDisplayName(), seller_phone: session.mobile,
      };
      const { error } = await window.KM_SUPABASE.from('seller_products').insert(row);
      if (error) { console.error(error); api.toast('⚠️ Product post nahi ho paaya, dobara try karein'); return false; }
      return true;
    },
    async updateSellerProductStatus(id, status) {
      const { error } = await window.KM_SUPABASE.from('seller_products').update({ status }).eq('id', id).eq('user_id', session.id);
      if (error) { console.error(error); api.toast('⚠️ Status update nahi ho paaya'); return false; }
      return true;
    },
    async deleteSellerProduct(id) {
      const { error } = await window.KM_SUPABASE.from('seller_products').delete().eq('id', id).eq('user_id', session.id);
      if (error) { console.error(error); api.toast('⚠️ Product delete nahi ho paaya'); return false; }
      return true;
    },

    /* ---------- Majdoor: farmer job posts (Supabase, public read / own write) ---------- */
    async getJobPosts() {
      const { data, error } = await window.KM_SUPABASE.from('job_posts').select('*').eq('status', 'open').order('created_at', { ascending: false });
      if (error) { console.error(error); return []; }
      return data.map(rowToJobPost);
    },
    async getMyJobPosts() {
      if (!session) return [];
      const { data, error } = await window.KM_SUPABASE.from('job_posts').select('*').eq('user_id', session.id).order('created_at', { ascending: false });
      if (error) { console.error(error); return []; }
      return data.map(rowToJobPost);
    },
    async addJobPost(job) {
      const row = {
        id: job.id, user_id: session.id, category: job.category, workers_needed: job.workersNeeded,
        daily_wage: job.dailyWage, start_date: job.startDate, total_days: job.totalDays,
        food_provided: job.foodProvided, transport_provided: job.transportProvided,
        description: job.description, village: job.village, district: job.district,
        images: job.images || [], farmer_name: session.name, farmer_phone: session.mobile,
      };
      const { error } = await window.KM_SUPABASE.from('job_posts').insert(row);
      if (error) { console.error(error); api.toast('⚠️ Job post nahi ho paayi, dobara try karein'); return false; }
      return true;
    },
    async updateJobPostStatus(id, status) {
      const { error } = await window.KM_SUPABASE.from('job_posts').update({ status }).eq('id', id).eq('user_id', session.id);
      if (error) { console.error(error); api.toast('⚠️ Status update nahi ho paaya'); return false; }
      return true;
    },
    async deleteJobPost(id) {
      const { error } = await window.KM_SUPABASE.from('job_posts').delete().eq('id', id).eq('user_id', session.id);
      if (error) { console.error(error); api.toast('⚠️ Job post delete nahi ho paayi'); return false; }
      return true;
    },

    /* ---------- Majdoor: worker/contractor profiles (Supabase, public read / own write, one per user) ---------- */
    async getWorkerProfiles() {
      const { data, error } = await window.KM_SUPABASE.from('worker_profiles').select('*').neq('status', 'inactive').order('created_at', { ascending: false });
      if (error) { console.error(error); return []; }
      return data.map(rowToWorkerProfile);
    },
    async getMyWorkerProfile() {
      if (!session) return null;
      const { data, error } = await window.KM_SUPABASE.from('worker_profiles').select('*').eq('user_id', session.id).maybeSingle();
      if (error) { console.error(error); return null; }
      return data ? rowToWorkerProfile(data) : null;
    },
    async upsertWorkerProfile(w) {
      const row = {
        id: w.id, user_id: session.id, name: w.name || session.name, age: w.age || null, photo_url: w.photoUrl || null,
        primary_skill: w.primarySkill, secondary_skills: w.secondarySkills || [],
        experience_years: w.experienceYears, daily_rate: w.dailyRate,
        is_group_leader: w.isGroupLeader || false, group_size: w.groupSize || 1,
        district: w.district, worker_phone: session.mobile,
      };
      const { error } = await window.KM_SUPABASE.from('worker_profiles').upsert(row, { onConflict: 'user_id' });
      if (error) { console.error(error); api.toast('⚠️ Registration save nahi ho paayi, dobara try karein'); return false; }
      return true;
    },
    async updateWorkerStatus(id, status) {
      const { error } = await window.KM_SUPABASE.from('worker_profiles').update({ status }).eq('id', id).eq('user_id', session.id);
      if (error) { console.error(error); api.toast('⚠️ Status update nahi ho paaya'); return false; }
      return true;
    },
    async deleteWorkerProfile(id) {
      const { error } = await window.KM_SUPABASE.from('worker_profiles').delete().eq('id', id).eq('user_id', session.id);
      if (error) { console.error(error); api.toast('⚠️ Profile delete nahi ho paaya'); return false; }
      return true;
    },

    /* ---------- Majdoor worker reviews (real, Supabase-backed — one per reviewer per worker) ---------- */
    async getAllWorkerReviewStats() {
      const { data, error } = await window.KM_SUPABASE.from('worker_reviews').select('worker_id, rating');
      if (error) { console.error(error); return {}; }
      const stats = {};
      data.forEach(r => {
        if (!stats[r.worker_id]) stats[r.worker_id] = { sum: 0, count: 0 };
        stats[r.worker_id].sum += r.rating;
        stats[r.worker_id].count += 1;
      });
      Object.values(stats).forEach(s => { s.avg = s.sum / s.count; });
      return stats;
    },
    async getWorkerReviews(workerId) {
      const { data, error } = await window.KM_SUPABASE.from('worker_reviews').select('*').eq('worker_id', workerId).order('created_at', { ascending: false });
      if (error) { console.error(error); return []; }
      return data.map(r => ({ id: r.id, reviewerId: r.reviewer_id, reviewerName: r.reviewer_name, rating: r.rating, comment: r.comment, createdAt: r.created_at }));
    },
    async addWorkerReview(workerId, rating, comment) {
      const row = { id: 'rev' + Date.now(), worker_id: workerId, reviewer_id: session.id, reviewer_name: session.name, rating, comment: comment || null };
      const { error } = await window.KM_SUPABASE.from('worker_reviews').upsert(row, { onConflict: 'worker_id,reviewer_id' });
      if (error) { console.error(error); api.toast('⚠️ Review save nahi ho paaya'); return false; }
      return true;
    },

    /* ---------- Shop product reviews (real, Supabase-backed — one per reviewer per product) ---------- */
    async getProductReviews(productId) {
      const { data, error } = await window.KM_SUPABASE.from('product_reviews').select('*').eq('product_id', productId).order('created_at', { ascending: false });
      if (error) { console.error(error); return []; }
      return data.map(r => ({ id: r.id, reviewerId: r.reviewer_id, reviewerName: r.reviewer_name, rating: r.rating, comment: r.comment, createdAt: r.created_at }));
    },
    async addProductReview(productId, rating, comment) {
      const row = { id: 'prev' + Date.now(), product_id: productId, reviewer_id: session.id, reviewer_name: session.name, rating, comment: comment || null };
      const { error } = await window.KM_SUPABASE.from('product_reviews').upsert(row, { onConflict: 'product_id,reviewer_id' });
      if (error) { console.error(error); api.toast('⚠️ Review save nahi ho paaya'); return false; }
      return true;
    },

    /* ---------- Seller business profile ("Become a Seller") ---------- */
    async getMySellerProfile() {
      if (!session) return null;
      const { data, error } = await window.KM_SUPABASE.from('seller_profiles').select('*').eq('user_id', session.id).maybeSingle();
      if (error) { console.error(error); return null; }
      return data ? rowToSellerProfile(data) : null;
    },
    async deleteSellerProfile() {
      const { error } = await window.KM_SUPABASE.from('seller_profiles').delete().eq('user_id', session.id);
      if (error) { console.error(error); api.toast('⚠️ Store delete nahi ho paayi, dobara try karein'); return false; }
      return true;
    },
    async isDisplayNameTaken(name) {
      const { data, error } = await window.KM_SUPABASE.from('seller_profiles').select('user_id').ilike('display_name', name).maybeSingle();
      if (error) { console.error(error); return false; }
      return !!data && data.user_id !== (session && session.id);
    },
    async upsertSellerProfile(p) {
      const row = {
        user_id: session.id, seller_type: p.sellerType, display_name: p.displayName, description: p.description || null,
        gstin: p.gstin || null, categories: p.categories || [],
        pickup_line: p.pickupLine, pickup_city: p.pickupCity, pickup_state: p.pickupState, pickup_pincode: p.pickupPincode,
      };
      const { error } = await window.KM_SUPABASE.from('seller_profiles').upsert(row, { onConflict: 'user_id' });
      if (error) {
        console.error(error);
        api.toast(error.code === '23505' ? '⚠️ Yeh store naam pehle se liya gaya hai' : '⚠️ Save nahi ho paaya, dobara try karein');
        return false;
      }
      return true;
    },

    /* ---------- Buyer enquiries ("Contact Seller") ---------- */
    async addEnquiry({ listingType, listingId, listingName, sellerId, message }) {
      const row = {
        id: 'enq' + Date.now(), listing_type: listingType, listing_id: listingId, listing_name: listingName,
        buyer_id: session.id, buyer_name: session.name, buyer_phone: session.mobile, seller_id: sellerId, message,
      };
      const { error } = await window.KM_SUPABASE.from('enquiries').insert(row);
      if (error) { console.error(error); api.toast('⚠️ Message bhejne mein dikkat hui'); return false; }
      return true;
    },
    async getReceivedEnquiries() {
      if (!session) return [];
      const { data, error } = await window.KM_SUPABASE.from('enquiries').select('*').eq('seller_id', session.id).order('created_at', { ascending: false });
      if (error) { console.error(error); return []; }
      return data;
    },
  };

  function rowToBazaarListing(row) {
    const days = Math.floor((Date.now() - new Date(row.created_at).getTime()) / 86400000);
    return {
      id: row.id, name: row.name, cat: row.cat, type: row.type, rentUnit: row.rent_unit, price: row.price,
      loc: row.loc, meta: row.meta || '', condition: row.condition, negotiable: row.negotiable, status: row.status,
      img: row.images[0], images: row.images, sellerId: row.user_id,
      sellerName: row.seller_name, sellerPhone: row.seller_phone, days, featured: false, real: true,
    };
  }
  function rowToSellerProduct(row) {
    return {
      id: row.id, cat: row.cat, name: row.name, price: row.price, description: row.description,
      condition: row.condition, negotiable: row.negotiable, status: row.status,
      img: row.images[0], images: row.images, sellerId: row.user_id,
      sellerName: row.seller_name, sellerPhone: row.seller_phone, createdAt: row.created_at,
    };
  }
  function rowToJobPost(row) {
    const days = Math.floor((Date.now() - new Date(row.created_at).getTime()) / 86400000);
    return {
      id: row.id, category: row.category, workersNeeded: row.workers_needed, dailyWage: row.daily_wage,
      startDate: row.start_date, totalDays: row.total_days, foodProvided: row.food_provided,
      transportProvided: row.transport_provided, description: row.description || '',
      village: row.village || '', district: row.district, images: row.images || [], status: row.status,
      farmerId: row.user_id, farmerName: row.farmer_name, farmerPhone: row.farmer_phone, days,
    };
  }
  function rowToWorkerProfile(row) {
    return {
      id: row.id, userId: row.user_id, name: row.name, age: row.age, img: row.photo_url, skill: row.primary_skill,
      secondarySkills: row.secondary_skills || [], exp: row.experience_years + ' saal', wage: row.daily_rate,
      isGroupLeader: row.is_group_leader, groupSize: row.group_size, status: row.status,
      loc: row.district, workerPhone: row.worker_phone, available: row.status === 'available', real: true,
    };
  }
  async function sellerDisplayName() {
    const { data } = await window.KM_SUPABASE.from('seller_profiles').select('display_name').eq('user_id', session.id).maybeSingle();
    return (data && data.display_name) || session.name;
  }
  function rowToSellerProfile(row) {
    return {
      sellerType: row.seller_type, displayName: row.display_name, description: row.description,
      gstin: row.gstin, categories: row.categories || [],
      pickupLine: row.pickup_line, pickupCity: row.pickup_city, pickupState: row.pickup_state, pickupPincode: row.pickup_pincode,
    };
  }

  function orderToRow(order, userId) {
    return {
      id: order.id, user_id: userId, items: order.items,
      subtotal: order.subtotal, delivery: order.delivery, cod_charge: order.codCharge, total: order.total,
      address: order.address, payment_method: order.paymentMethod, status: order.status, tracking: order.tracking,
    };
  }
  function rowToOrder(row) {
    return {
      id: row.id, date: row.created_at, items: row.items,
      subtotal: row.subtotal, delivery: row.delivery, codCharge: row.cod_charge, total: row.total,
      address: row.address, paymentMethod: row.payment_method, status: row.status, tracking: row.tracking,
    };
  }

  async function loadProfile(userId) {
    const { data, error } = await window.KM_SUPABASE.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) { console.error(error); return; }
    if (data) { session = data; emit('auth'); }
  }
  async function initAuth() {
    const { data: { session: authSession } } = await window.KM_SUPABASE.auth.getSession();
    if (authSession) await loadProfile(authSession.user.id);
    window.KM_SUPABASE.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') { session = null; emit('auth'); }
    });
  }
  initAuth();

  let toastTimer;
  function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }
  function bumpBadge(el) {
    if (!el) return;
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }

  function maskEmail(email) {
    const parts = (email || '').split('@');
    if (parts.length < 2) return email || '';
    const user = parts[0];
    const visible = user.slice(0, 2);
    return visible + '*'.repeat(Math.max(user.length - 2, 1)) + '@' + parts[1];
  }
  function readOtpBoxes(rowId) {
    const row = document.getElementById(rowId);
    if (!row) return '';
    const input = row.querySelector('.otp-single');
    return input ? input.value.trim() : '';
  }
  function clearOtpBoxes(rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;
    const input = row.querySelector('.otp-single');
    if (input) input.value = '';
  }

  document.addEventListener('DOMContentLoaded', () => {
    const DATA = window.KM_DATA;

    /* ---------- Preloader ---------- */
    const preloader = document.getElementById('preloader');
    if (preloader) {
      window.addEventListener('load', () => setTimeout(() => preloader.classList.add('hide'), 400));
      setTimeout(() => preloader.classList.add('hide'), 1800);
    }

    /* ---------- Sticky navbar + back to top + whatsapp float ---------- */
    const navbar = document.getElementById('navbar');
    const backToTop = document.getElementById('backToTop');
    const whatsappFloat = document.querySelector('.whatsapp-float');

    /* Category row auto-hide (Bazaar/Reels & Gyan/Majdoor/Yojana only — see body.nav-autohide
       in style.css). Slides away once you scroll down past it, reappears the moment you scroll
       back up — Home/Shop opt out since the category links matter there. */
    const navBarRow = document.querySelector('.nav-bar-row');
    const navAutohideOn = document.body.classList.contains('nav-autohide');
    let scrollTicking = false;
    // Collapsing this row removes ~60px of page height above the fold, which by itself
    // changes window.scrollY on the very next tick — the browser reports a lower scrollY
    // even though the user hasn't moved the wheel/trackpad at all. Left unhandled, that
    // self-inflicted change reads as "scrolled up", which immediately un-collapses the row,
    // which re-adds the 60px and reads as "scrolled down" again — an infinite feedback loop
    // that flickered the row open/closed every frame with the hero content bleeding through.
    // Fix: after every toggle, keep the direction baseline pinned to the live scrollY for a
    // cooldown window (long enough for the .35s transition + reflow to fully settle) so that
    // self-inflicted shift is absorbed silently instead of being read as new user input.
    let sampleY = window.scrollY;
    let sampleTime = performance.now();
    let cooldownUntil = 0;

    function handleScroll() {
      const y = window.scrollY;
      if (navbar) navbar.classList.toggle('scrolled', y > 40);
      if (backToTop) backToTop.classList.toggle('show', y > 600);
      if (whatsappFloat) whatsappFloat.classList.toggle('show', y > 350);
      if (navAutohideOn && navBarRow) {
        const now = performance.now();
        if (now < cooldownUntil) {
          sampleY = y;
          sampleTime = now;
        } else if (now - sampleTime > 120) {
          const delta = y - sampleY;
          if (Math.abs(delta) > 10) {
            const shouldCollapse = delta > 0 && y > 120;
            if (shouldCollapse !== navBarRow.classList.contains('nav-collapsed')) {
              navBarRow.classList.toggle('nav-collapsed', shouldCollapse);
              cooldownUntil = now + 450;
            }
          }
          sampleY = y;
          sampleTime = now;
        }
      }
      scrollTicking = false;
    }
    window.addEventListener('scroll', () => {
      if (!scrollTicking) {
        requestAnimationFrame(handleScroll);
        scrollTicking = true;
      }
    });
    if (backToTop) backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    /* ---------- Mobile menu ---------- */
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    const overlay = document.getElementById('overlay');
    const cartDrawer = document.getElementById('cartDrawer');
    const authModal = document.getElementById('authModal');

    function closeMobileMenu() {
      if (!hamburger) return;
      hamburger.classList.remove('open');
      navLinks.classList.remove('open');
      if (navbar) navbar.classList.remove('menu-above-overlay');
      if (!cartDrawer.classList.contains('open') && !authModal.classList.contains('open')) {
        overlay.classList.remove('show');
      }
    }
    if (hamburger) {
      hamburger.addEventListener('click', () => {
        const isOpen = navLinks.classList.toggle('open');
        hamburger.classList.toggle('open', isOpen);
        overlay.classList.toggle('show', isOpen);
        // #navLinks lives inside the sticky <header>, which has its own z-index and
        // therefore its own stacking context — no z-index on #navLinks itself can ever
        // paint above the blurred .overlay unless the header's own stacking is raised too.
        if (navbar) navbar.classList.toggle('menu-above-overlay', isOpen);
      });
      navLinks.querySelectorAll(':scope > a').forEach(a => a.addEventListener('click', closeMobileMenu));
    }

    /* ---------- Top nav category dropdowns (AgriBegri style) ---------- */
    if (DATA.navGroups) {
      DATA.navGroups.forEach(group => {
        const container = document.querySelector(`[data-dropfor="${group.key}"]`);
        if (!container) return;
        container.innerHTML = group.cols.map(col => `
          <div class="drop-col">
            <h6>${col.heading}</h6>
            ${col.items.map(key => {
              const meta = DATA.allCatMeta[key];
              if (!meta) return '';
              return `<a href="shop.html?cat=${key}" data-cat="${key}">${meta.icon} ${meta.name}</a>`;
            }).join('')}
          </div>`).join('');
      });
    }

    /* ---------- Agriculture cascading flyout menu ---------- */
    const agriPanel = document.getElementById('agriMenuPanel');
    if (agriPanel && DATA.agricultureMenu) {
      function agriHref(node) {
        if (node.link) {
          const idx = node.link.indexOf(':');
          const type = node.link.slice(0, idx);
          const val = node.link.slice(idx + 1);
          if (type === 'cat') return `shop.html?cat=${val}`;
          if (type === 'search') return `shop.html?search=${encodeURIComponent(val)}`;
        }
        return `shop.html?search=${encodeURIComponent(node.label)}`;
      }
      function renderAgriList(nodes) {
        return `<ul class="agri-list">${nodes.map(n => {
          const hasChildren = n.children && n.children.length > 0;
          return `<li class="agri-item ${hasChildren ? 'has-children' : ''}">
            <a href="${agriHref(n)}">${n.icon ? n.icon + ' ' : ''}${n.label}${hasChildren ? '<span class="agri-arrow">▸</span>' : ''}</a>
            ${hasChildren ? renderAgriList(n.children) : ''}
          </li>`;
        }).join('')}</ul>`;
      }
      agriPanel.innerHTML = renderAgriList(DATA.agricultureMenu);

      // Mobile: tap-to-expand accordion instead of hover-cascade
      agriPanel.addEventListener('click', (e) => {
        if (window.innerWidth > 900) return;
        const link = e.target.closest('.agri-item.has-children > a');
        if (link) {
          e.preventDefault();
          link.parentElement.classList.toggle('touch-open');
        }
      });
      const agriTrigger = document.querySelector('.agri-drop-wrap > a');
      if (agriTrigger) {
        agriTrigger.addEventListener('click', (e) => {
          if (window.innerWidth > 900) return;
          e.preventDefault();
          agriTrigger.closest('.agri-drop-wrap').classList.toggle('touch-open');
        });
      }
    }

    /* ---------- Cart drawer ---------- */
    const cartBtn = document.getElementById('cartBtn');
    const closeCartBtn = document.getElementById('closeCart');
    const cartItemsEl = document.getElementById('cartItems');
    const cartTotalEl = document.getElementById('cartTotal');
    const cartCountEl = document.getElementById('cartCount');
    const wishCountEl = document.getElementById('wishCount');

    function renderCartUI() {
      if (!cartItemsEl) return;
      const c = api.getCart();
      if (c.length === 0) {
        const emptyMsg = window.KM_I18N ? window.KM_I18N.t('cart.empty') : 'Cart khaali hai. Kuch achha khareedein!';
        cartItemsEl.innerHTML = `<p class="cart-empty">🌱 ${emptyMsg}</p>`;
        cartTotalEl.textContent = '₹0';
      } else {
        const n = c.reduce((s, i) => s + i.qty, 0);
        const countMsg = window.KM_I18N ? window.KM_I18N.t('cart.itemCount', { n }) : `${n} items in your cart`;
        cartItemsEl.innerHTML = `<p class="cart-item-count">${countMsg}</p>` + c.map((item, i) => `
          <div class="cart-item">
            <img src="${item.img}" alt="${item.name}">
            <div class="cart-item-info">
              <h5>${item.name}</h5>
              <span>₹${item.price} × ${item.qty}</span>
            </div>
            <button class="cart-item-remove" data-index="${i}">✕</button>
          </div>`).join('');
        const total = c.reduce((s, i) => s + i.price * i.qty, 0);
        cartTotalEl.textContent = '₹' + total.toLocaleString('en-IN');
        cartItemsEl.querySelectorAll('.cart-item-remove').forEach(btn => {
          btn.addEventListener('click', () => api.removeFromCart(+btn.dataset.index));
        });
      }
      const count = c.reduce((s, i) => s + i.qty, 0);
      if (cartCountEl) cartCountEl.textContent = count;
    }
    function renderWishUI() {
      if (wishCountEl) wishCountEl.textContent = api.getWishlist().length;
    }
    api.onCartChange(() => { renderCartUI(); bumpBadge(cartCountEl); });
    api.onWishlistChange(() => { renderWishUI(); bumpBadge(wishCountEl); });
    document.addEventListener('km:langchange', renderCartUI);
    renderCartUI();
    renderWishUI();

    function openCart() { cartDrawer.classList.add('open'); overlay.classList.add('show'); }
    function closeCartDrawer() {
      cartDrawer.classList.remove('open');
      if (navLinks) navLinks.classList.remove('open');
      if (hamburger) hamburger.classList.remove('open');
      if (!authModal.classList.contains('open')) overlay.classList.remove('show');
    }
    if (cartBtn) cartBtn.addEventListener('click', openCart);
    if (closeCartBtn) closeCartBtn.addEventListener('click', closeCartDrawer);
    api.closeCartDrawer = closeCartDrawer;
    api.openCart = openCart;

    /* ---------- Checkout entry point ---------- */
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => {
        if (api.getCart().length === 0) { api.toast('Cart khaali hai, pehle kuch add karein 🛒'); return; }
        if (!api.isLoggedIn()) {
          closeCartDrawer();
          openAuth();
          api.toast('Checkout ke liye pehle login karein 👤');
          return;
        }
        window.location.href = 'checkout.html';
      });
    }

    /* ---------- Auth modal ---------- */
    const loginBtn = document.getElementById('loginBtn');
    const authClose = document.getElementById('authClose');
    const authGuest = document.getElementById('authGuest');
    const authTabs = document.querySelectorAll('.auth-tab');
    const authPanels = { login: document.getElementById('panelLogin'), signup: document.getElementById('panelSignup') };
    const accountWrap = document.querySelector('.account-wrap');
    const accountMenu = document.getElementById('accountMenu');

    /* ---------- Seller Central entry points on the customer site (only shown to sellers) ---------- */
    const topbarRight = document.querySelector('.topbar-right');
    if (topbarRight && !document.getElementById('topbarSellerCentralLink')) {
      topbarRight.insertAdjacentHTML('afterbegin', `<a href="my-listings.html" id="topbarSellerCentralLink" class="hide-sm" hidden>🏪 Seller Central</a>`);
    }
    if (accountMenu) {
      const logoutLink = document.getElementById('logoutBtn');
      if (logoutLink && !document.getElementById('accountSellerCentralLink')) {
        logoutLink.insertAdjacentHTML('beforebegin', `<a href="my-listings.html" id="accountSellerCentralLink" hidden>🏪 Seller Central</a>`);
      }
    }

    /* ---------- Inject inline error / success states into the existing auth modal
       (markup is duplicated identically across all 10 pages, so this stays in one place) ---------- */
    if (document.getElementById('loginStepForm')) {
      document.querySelector('#loginStepForm .auth-input-row')?.insertAdjacentHTML('afterend', `
        <p class="auth-error" id="loginPhoneError"></p>`);
      const loginNote = document.querySelector('#loginStepForm .auth-note');
      if (loginNote) loginNote.classList.add('auth-note-highlight');
      document.getElementById('loginOtpRow')?.insertAdjacentHTML('afterend', `
        <p class="auth-error" id="loginOtpError"></p>`);
      document.getElementById('panelLogin')?.insertAdjacentHTML('beforeend', `
        <div class="auth-step auth-success" id="loginStepSuccess" hidden>
          <div class="auth-success-icon">✓</div>
          <p id="loginSuccessMsg"></p>
        </div>`);

      document.querySelector('#signupStepForm .auth-input-row')?.insertAdjacentHTML('afterend', `
        <p class="auth-error" id="signupPhoneError">Yeh number pehle se register hai — naya number try karein, ya <a href="#" id="signupPhoneErrorLoginLink">Login karein →</a></p>`);
      document.getElementById('signupEmail')?.insertAdjacentHTML('afterend', `
        <p class="auth-error" id="signupEmailError">Yeh email pehle se register hai — dusra email try karein.</p>`);
      document.getElementById('signupSendOtpBtn')?.insertAdjacentHTML('beforebegin', `
        <p class="auth-note-highlight">📧 OTP aapke email ID par bheja jaayega, SMS nahi.</p>`);
      document.getElementById('signupOtpRow')?.insertAdjacentHTML('afterend', `
        <p class="auth-error" id="signupOtpError"></p>`);
      document.getElementById('panelSignup')?.insertAdjacentHTML('beforeend', `
        <div class="auth-step auth-success" id="signupStepSuccess" hidden>
          <div class="auth-success-icon">✓</div>
          <p id="signupSuccessMsg"></p>
        </div>`);
    }

    function resetAuthSteps() {
      ['loginStepForm', 'signupStepForm'].forEach(id => { const el = document.getElementById(id); if (el) el.hidden = false; });
      ['loginStepOtp', 'signupStepOtp', 'loginStepSuccess', 'signupStepSuccess'].forEach(id => { const el = document.getElementById(id); if (el) el.hidden = true; });
      clearOtpBoxes('loginOtpRow');
      clearOtpBoxes('signupOtpRow');
      ['loginPhoneError', 'signupPhoneError', 'signupEmailError', 'loginOtpError', 'signupOtpError'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('show');
      });
      document.getElementById('signupPhone')?.classList.remove('input-error');
      document.getElementById('signupEmail')?.classList.remove('input-error');
      phoneTaken = false;
      emailTaken = false;
      const signupBtn = document.getElementById('signupSendOtpBtn');
      if (signupBtn) signupBtn.disabled = false;
    }
    let phoneTaken = false, emailTaken = false;
    function updateSignupSubmitState() {
      if (signupSendOtpBtn) signupSendOtpBtn.disabled = phoneTaken || emailTaken;
    }
    function openAuth() {
      if (api.isLoggedIn()) return;
      resetAuthSteps();
      authModal.classList.add('open');
      overlay.classList.add('show');
    }
    function closeAuth() { authModal.classList.remove('open'); if (!cartDrawer.classList.contains('open')) overlay.classList.remove('show'); }
    api.openAuth = openAuth;
    api.closeAuth = closeAuth;
    if (authClose) authClose.addEventListener('click', closeAuth);
    if (authGuest) authGuest.addEventListener('click', closeAuth);
    if (overlay) overlay.addEventListener('click', () => { closeAuth(); closeCartDrawer(); });

    authTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        authTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        Object.values(authPanels).forEach(p => p.classList.remove('active'));
        authPanels[tab.dataset.tab].classList.add('active');
      });
    });
    document.querySelectorAll('.role-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.role-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
    });

    /* ---------- Account menu / header state ---------- */
    function renderAccountUI() {
      const s = api.getSession();
      const loginBtnText = document.getElementById('loginBtnText');
      const accountMenuName = document.getElementById('accountMenuName');
      if (s) {
        if (loginBtnText) loginBtnText.textContent = s.name.split(' ')[0];
        if (accountMenuName) accountMenuName.textContent = window.KM_I18N ? window.KM_I18N.t('header.greeting', { name: s.name }) : `Hi, ${s.name} 👋`;
      } else {
        if (loginBtnText) loginBtnText.textContent = window.KM_I18N ? window.KM_I18N.t('header.login') : 'Login';
        document.querySelectorAll('#topbarSellerCentralLink, #accountSellerCentralLink').forEach(el => { el.hidden = true; });
      }
    }
    document.addEventListener('km:langchange', renderAccountUI);
    renderAccountUI();
    api.onAuthChange(renderAccountUI);

    /* ---------- Seller Central link — shown only once the account has an actual seller_profile
       (real store set up via "Become a Seller"), not just because "Seller" was picked as a
       signup label — that's a one-time, unchangeable choice and isn't a reliable "is a seller" signal. ---------- */
    async function renderSellerCentralLinks() {
      const hasSellerProfile = api.isLoggedIn() ? !!(await api.getMySellerProfile()) : false;
      document.querySelectorAll('#topbarSellerCentralLink, #accountSellerCentralLink').forEach(el => { el.hidden = !hasSellerProfile; });
    }
    renderSellerCentralLinks();
    api.onAuthChange(renderSellerCentralLinks);

    /* ---------- Seller Central nav greeting (only present on seller pages) ---------- */
    const sellerNavGreetEl = document.getElementById('sellerNavGreet');
    if (sellerNavGreetEl) {
      const renderSellerNavGreet = () => {
        const s = api.getSession();
        sellerNavGreetEl.textContent = s ? `👋 ${s.name.split(' ')[0]}` : '';
      };
      renderSellerNavGreet();
      api.onAuthChange(renderSellerNavGreet);
    }

    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        if (api.isLoggedIn()) { if (accountMenu) accountMenu.classList.toggle('show'); }
        else { openAuth(); }
      });
    }
    document.addEventListener('click', (e) => {
      if (accountMenu && accountMenu.classList.contains('show') && !e.target.closest('.account-wrap')) {
        accountMenu.classList.remove('show');
      }
    });
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await api.clearSession();
        if (accountMenu) accountMenu.classList.remove('show');
        renderAccountUI();
        api.toast('Aap logout ho gaye 👋');
      });
    }

    /* ----- Login: send OTP / verify (mobile -> email lookup -> Supabase OTP) ----- */
    let loginOtpEmail = null;
    const loginPhone = document.getElementById('loginPhone');
    const loginSendOtpBtn = document.getElementById('loginSendOtpBtn');
    const loginVerifyBtn = document.getElementById('loginVerifyBtn');
    const loginBackBtn = document.getElementById('loginBackBtn');
    const loginStepForm = document.getElementById('loginStepForm');
    const loginStepOtp = document.getElementById('loginStepOtp');
    const loginOtpSentMsg = document.getElementById('loginOtpSentMsg');

    if (loginSendOtpBtn) {
      loginSendOtpBtn.addEventListener('click', async () => {
        const mobile = (loginPhone.value || '').trim();
        if (!/^\d{10}$/.test(mobile)) { api.toast('⚠️ Sahi 10-digit mobile number daalein'); return; }
        loginSendOtpBtn.disabled = true;
        loginSendOtpBtn.textContent = 'Check ho raha hai...';
        const { data: email, error } = await window.KM_SUPABASE.rpc('get_email_by_mobile', { p_mobile: mobile });
        if (error) { loginSendOtpBtn.disabled = false; loginSendOtpBtn.textContent = 'OTP Bhejein'; api.toast('⚠️ Kuch gadbad hui, dobara try karein'); return; }
        if (!email) {
          loginSendOtpBtn.disabled = false;
          loginSendOtpBtn.textContent = 'OTP Bhejein';
          api.toast('Yeh number register nahi hai. Sign Up karein 👇');
          document.querySelector('.auth-tab[data-tab="signup"]').click();
          const sp = document.getElementById('signupPhone');
          if (sp) sp.value = mobile;
          return;
        }
        loginSendOtpBtn.textContent = 'OTP bhej rahe hain...';
        const { error: otpError } = await window.KM_SUPABASE.auth.signInWithOtp({ email });
        loginSendOtpBtn.disabled = false;
        loginSendOtpBtn.textContent = 'OTP Bhejein';
        if (otpError) {
          // Supabase rate-limits OTP sends to the same email (~60s) — surface this persistently
          // instead of a toast that fades, since "why didn't my OTP arrive" is exactly this case.
          const loginPhoneErrorEl = document.getElementById('loginPhoneError');
          loginPhoneErrorEl.textContent = otpError.message && otpError.message.toLowerCase().includes('rate')
            ? '⏱ Bahut jaldi dobara try kiya. ~60 second ruk kar phir try karein.'
            : '⚠️ OTP bhejne mein dikkat hui, dobara try karein';
          loginPhoneErrorEl.classList.add('show');
          return;
        }
        document.getElementById('loginPhoneError').classList.remove('show');
        loginOtpEmail = email;
        loginOtpSentMsg.innerHTML = `OTP aapke email <strong>${maskEmail(email)}</strong> par bheja gaya hai`;
        loginOtpError.classList.remove('show');
        loginOtpRowEl.classList.remove('input-error');
        loginStepForm.hidden = true;
        loginStepOtp.hidden = false;
        const firstBox = loginStepOtp.querySelector('.otp-box');
        if (firstBox) firstBox.focus();
      });
    }
    if (loginBackBtn) {
      loginBackBtn.addEventListener('click', () => {
        loginStepOtp.hidden = true;
        loginStepForm.hidden = false;
        clearOtpBoxes('loginOtpRow');
        document.getElementById('loginOtpError').classList.remove('show');
        document.getElementById('loginOtpRow').classList.remove('input-error');
      });
    }
    const loginOtpError = document.getElementById('loginOtpError');
    const loginOtpRowEl = document.getElementById('loginOtpRow');
    if (loginVerifyBtn) {
      loginVerifyBtn.addEventListener('click', async () => {
        const entered = readOtpBoxes('loginOtpRow');
        loginOtpError.classList.remove('show');
        loginOtpRowEl.classList.remove('input-error');
        if (entered.length < 4) { loginOtpError.textContent = '⚠️ Poora OTP daalein'; loginOtpError.classList.add('show'); loginOtpRowEl.classList.add('input-error'); return; }
        loginVerifyBtn.disabled = true;
        loginVerifyBtn.textContent = 'Verify ho raha hai...';
        const { data, error } = await window.KM_SUPABASE.auth.verifyOtp({ email: loginOtpEmail, token: entered, type: 'email' });
        loginVerifyBtn.disabled = false;
        loginVerifyBtn.textContent = 'Verify & Login';
        if (error || !data.session) {
          loginOtpError.textContent = '❌ Galat ya expired OTP, dobara try karein';
          loginOtpError.classList.add('show');
          loginOtpRowEl.classList.add('input-error');
          clearOtpBoxes('loginOtpRow');
          return;
        }
        await loadProfile(data.session.user.id);
        loginStepOtp.hidden = true;
        document.getElementById('loginSuccessMsg').textContent = `Login safal! Welcome back, ${session.name} 🎉`;
        document.getElementById('loginStepSuccess').hidden = false;
        // A returning user who picked "Seller" but never finished the business profile should
        // land back in onboarding on login too, not just once at signup — otherwise "I chose
        // Seller and nothing happened" keeps recurring on every later login.
        const isSeller = session.role && session.role.includes('Seller');
        const sellerProfile = isSeller ? await api.getMySellerProfile() : null;
        setTimeout(() => {
          closeAuth();
          if (isSeller && !sellerProfile) {
            window.location.href = 'become-seller.html';
          } else {
            api.runPendingAction();
          }
        }, 1400);
      });
    }

    /* ----- Signup: send OTP / verify (Supabase OTP creates the auth user, then we save the profile) ----- */
    let signupOtpEmail = null, signupOtpData = null;
    const signupSendOtpBtn = document.getElementById('signupSendOtpBtn');
    const signupVerifyBtn = document.getElementById('signupVerifyBtn');
    const signupBackBtn = document.getElementById('signupBackBtn');
    const signupStepForm = document.getElementById('signupStepForm');
    const signupStepOtp = document.getElementById('signupStepOtp');
    const signupOtpSentMsg = document.getElementById('signupOtpSentMsg');

    /* ----- Real-time "already registered" check, independently for mobile AND email, as soon
       as each is fully entered — so the button is disabled and the error is visible before the
       user even tries to submit. Either one being taken blocks submission; the button visually
       greys out (see .btn-primary:disabled) so it's obvious why it won't click. ----- */
    const signupPhoneInput = document.getElementById('signupPhone');
    const signupPhoneError = document.getElementById('signupPhoneError');
    const signupEmailInput = document.getElementById('signupEmail');
    const signupEmailError = document.getElementById('signupEmailError');
    document.getElementById('signupPhoneErrorLoginLink')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelector('.auth-tab[data-tab="login"]').click();
      if (loginPhone) loginPhone.value = signupPhoneInput.value.trim();
    });
    if (signupPhoneInput) {
      signupPhoneInput.addEventListener('input', () => {
        signupPhoneInput.classList.remove('input-error');
        signupPhoneError.classList.remove('show');
        phoneTaken = false;
        updateSignupSubmitState();
      });
      signupPhoneInput.addEventListener('blur', async () => {
        const mobile = signupPhoneInput.value.trim();
        if (!/^\d{10}$/.test(mobile)) return;
        const { data: existingEmail } = await window.KM_SUPABASE.rpc('get_email_by_mobile', { p_mobile: mobile });
        if (existingEmail) {
          signupPhoneInput.classList.add('input-error');
          signupPhoneError.classList.add('show');
          phoneTaken = true;
          updateSignupSubmitState();
        }
      });
    }
    if (signupEmailInput) {
      signupEmailInput.addEventListener('input', () => {
        signupEmailInput.classList.remove('input-error');
        signupEmailError.classList.remove('show');
        emailTaken = false;
        updateSignupSubmitState();
      });
      signupEmailInput.addEventListener('blur', async () => {
        const email = signupEmailInput.value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
        const { data: existingMobile } = await window.KM_SUPABASE.rpc('get_mobile_by_email', { p_email: email });
        if (existingMobile) {
          signupEmailInput.classList.add('input-error');
          signupEmailError.classList.add('show');
          emailTaken = true;
          updateSignupSubmitState();
        }
      });
    }

    if (signupSendOtpBtn) {
      signupSendOtpBtn.addEventListener('click', async () => {
        const name = (document.getElementById('signupName').value || '').trim();
        const mobile = (document.getElementById('signupPhone').value || '').trim();
        const email = (document.getElementById('signupEmail').value || '').trim();
        const role = document.querySelector('#panelSignup .role-chip.active')?.dataset.role || 'Kisan';
        if (!name) { api.toast('⚠️ Apna naam daalein'); return; }
        if (!/^\d{10}$/.test(mobile)) { api.toast('⚠️ Sahi 10-digit mobile number daalein'); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { api.toast('⚠️ Sahi email ID daalein'); return; }
        signupSendOtpBtn.disabled = true;
        signupSendOtpBtn.textContent = 'Check ho raha hai...';
        const [{ data: existingEmail, error: phoneLookupError }, { data: existingMobile, error: emailLookupError }] = await Promise.all([
          window.KM_SUPABASE.rpc('get_email_by_mobile', { p_mobile: mobile }),
          window.KM_SUPABASE.rpc('get_mobile_by_email', { p_email: email }),
        ]);
        if (phoneLookupError || emailLookupError) { signupSendOtpBtn.disabled = false; signupSendOtpBtn.textContent = 'Account Banayein'; api.toast('⚠️ Kuch gadbad hui, dobara try karein'); return; }
        if (existingEmail) {
          signupSendOtpBtn.textContent = 'Account Banayein';
          signupPhoneInput.classList.add('input-error');
          signupPhoneError.classList.add('show');
          phoneTaken = true;
          updateSignupSubmitState();
          return;
        }
        if (existingMobile) {
          signupSendOtpBtn.textContent = 'Account Banayein';
          signupEmailInput.classList.add('input-error');
          signupEmailError.classList.add('show');
          emailTaken = true;
          updateSignupSubmitState();
          return;
        }
        signupSendOtpBtn.textContent = 'OTP bhej rahe hain...';
        const { error: otpError } = await window.KM_SUPABASE.auth.signInWithOtp({ email });
        signupSendOtpBtn.disabled = false;
        signupSendOtpBtn.textContent = 'Account Banayein';
        if (otpError) {
          // Same rate-limit note as login — resend cooldown is per-email (~60s).
          signupEmailError.textContent = otpError.message && otpError.message.toLowerCase().includes('rate')
            ? '⏱ Bahut jaldi dobara try kiya. ~60 second ruk kar phir try karein.'
            : '⚠️ OTP bhejne mein dikkat hui, dobara try karein';
          signupEmailError.classList.add('show');
          return;
        }
        signupEmailError.classList.remove('show');
        signupOtpEmail = email;
        signupOtpData = { name, mobile, email, role };
        signupOtpSentMsg.innerHTML = `OTP aapke email <strong>${maskEmail(email)}</strong> par bheja gaya hai`;
        signupOtpError.classList.remove('show');
        signupOtpRowEl.classList.remove('input-error');
        signupStepForm.hidden = true;
        signupStepOtp.hidden = false;
        const firstBox = signupStepOtp.querySelector('.otp-box');
        if (firstBox) firstBox.focus();
      });
    }
    if (signupBackBtn) {
      signupBackBtn.addEventListener('click', () => {
        signupStepOtp.hidden = true;
        signupStepForm.hidden = false;
        clearOtpBoxes('signupOtpRow');
        document.getElementById('signupOtpError').classList.remove('show');
        document.getElementById('signupOtpRow').classList.remove('input-error');
      });
    }
    const signupOtpError = document.getElementById('signupOtpError');
    const signupOtpRowEl = document.getElementById('signupOtpRow');
    if (signupVerifyBtn) {
      signupVerifyBtn.addEventListener('click', async () => {
        const entered = readOtpBoxes('signupOtpRow');
        signupOtpError.classList.remove('show');
        signupOtpRowEl.classList.remove('input-error');
        if (entered.length < 4) { signupOtpError.textContent = '⚠️ Poora OTP daalein'; signupOtpError.classList.add('show'); signupOtpRowEl.classList.add('input-error'); return; }
        signupVerifyBtn.disabled = true;
        signupVerifyBtn.textContent = 'Verify ho raha hai...';
        const { data, error } = await window.KM_SUPABASE.auth.verifyOtp({ email: signupOtpEmail, token: entered, type: 'email' });
        if (error || !data.session) {
          signupVerifyBtn.disabled = false;
          signupVerifyBtn.textContent = 'Verify & Sign Up';
          signupOtpError.textContent = '❌ Galat ya expired OTP, dobara try karein';
          signupOtpError.classList.add('show');
          signupOtpRowEl.classList.add('input-error');
          clearOtpBoxes('signupOtpRow');
          return;
        }
        const profileRow = { id: data.session.user.id, name: signupOtpData.name, mobile: signupOtpData.mobile, email: signupOtpData.email, role: signupOtpData.role };
        const { error: insertError } = await window.KM_SUPABASE.from('profiles').insert(profileRow);
        signupVerifyBtn.disabled = false;
        signupVerifyBtn.textContent = 'Verify & Sign Up';
        if (insertError) { api.toast('⚠️ Profile save nahi ho paaya, dobara try karein'); return; }
        api.setSession(profileRow);
        emit('auth');
        signupStepOtp.hidden = true;
        document.getElementById('signupSuccessMsg').textContent = `Account ban gaya! Welcome, ${profileRow.name} 🎉`;
        document.getElementById('signupStepSuccess').hidden = false;
        // Choosing "Seller" at signup should actually lead into seller onboarding, not just
        // store a cosmetic label — this is what the previous version was missing.
        const chosenSeller = profileRow.role && profileRow.role.includes('Seller');
        setTimeout(() => {
          closeAuth();
          if (chosenSeller) {
            window.location.href = 'become-seller.html';
          } else {
            api.runPendingAction();
          }
        }, 1400);
      });
    }

    /* ---------- Language switcher (en / hinglish / mr / hi — see js/i18n.js) ---------- */
    const langSwitcher = document.getElementById('langSwitcher');
    if (langSwitcher && window.KM_I18N) {
      window.KM_I18N.ready.then(() => {
        langSwitcher.value = window.KM_I18N.getLocale();
      });
      langSwitcher.addEventListener('change', () => {
        window.KM_I18N.setLocale(langSwitcher.value);
      });
    }

    /* ---------- "Seller Bane" entry points — routes to real pages, not a popup ---------- */
    const sellerLinks = document.querySelectorAll('.seller-bane-link');
    if (sellerLinks.length) {
      async function goToSellerFlow(e) {
        if (e && e.preventDefault) e.preventDefault();
        if (!api.isLoggedIn()) {
          api.setPendingAction(() => { window.location.href = 'add-product.html'; });
          openAuth();
          api.toast('Product list karne ke liye pehle login karein 👤');
          return;
        }
        // First-ever "Seller Bane" click sets up the store profile (name/GST/pickup address)
        // as its own full page; once that exists, every later click goes straight to posting a product.
        const profile = await api.getMySellerProfile();
        if (!profile) {
          window.location.href = 'become-seller.html?next=post';
          return;
        }
        window.location.href = 'add-product.html';
      }
      sellerLinks.forEach(a => a.addEventListener('click', goToSellerFlow));
    }

    /* ---------- Contact Seller modal (shared across every page — real enquiry, not a fake toast) ---------- */
    document.body.insertAdjacentHTML('beforeend', `
      <div class="auth-modal" id="contactModal">
        <div class="auth-card">
          <button class="auth-close" id="contactModalClose" aria-label="Close">✕</button>
          <div class="auth-logo">📲 Seller Se Sampark Karein</div>
          <p class="auth-note" id="contactModalListingName" style="margin-top:-8px; font-weight:600; color:var(--text-dark); text-align:left;"></p>
          <label>Aapka Message</label>
          <textarea class="auth-field" id="contactMsg" rows="3" placeholder="e.g. Kya yeh available hai? Final price kya hoga?"></textarea>
          <button class="btn btn-primary btn-block" id="contactSendBtn" type="button">Message Bhejein aur WhatsApp Kholein</button>
        </div>
      </div>`);
    const contactModal = document.getElementById('contactModal');
    const contactMsg = document.getElementById('contactMsg');
    const contactSendBtn = document.getElementById('contactSendBtn');
    let contactCtx = null;

    function openContactModal(ctx) {
      if (!api.isLoggedIn()) {
        api.setPendingAction(() => openContactModal(ctx));
        openAuth();
        api.toast('Seller se baat karne ke liye pehle login karein 👤');
        return;
      }
      if (ctx.sellerId === api.getSession().id) { api.toast('Yeh aapki khud ki listing hai 🙂'); return; }
      contactCtx = ctx;
      document.getElementById('contactModalListingName').textContent = ctx.listingName;
      contactMsg.value = '';
      contactModal.classList.add('open');
      overlay.classList.add('show');
    }
    function closeContactModal() { contactModal.classList.remove('open'); overlay.classList.remove('show'); }
    api.openContactModal = openContactModal;
    document.getElementById('contactModalClose').addEventListener('click', closeContactModal);

    contactSendBtn.addEventListener('click', async () => {
      const message = contactMsg.value.trim();
      if (!message) { api.toast('⚠️ Message likhein'); return; }
      if (!contactCtx) return;
      contactSendBtn.disabled = true;
      contactSendBtn.textContent = 'Bhej rahe hain...';
      const ok = await api.addEnquiry({
        listingType: contactCtx.listingType, listingId: contactCtx.listingId, listingName: contactCtx.listingName,
        sellerId: contactCtx.sellerId, message,
      });
      contactSendBtn.disabled = false;
      contactSendBtn.textContent = 'Message Bhejein aur WhatsApp Kholein';
      if (!ok) return;
      closeContactModal();
      api.toast('✅ Message bhej diya gaya!');
      if (contactCtx.sellerPhone) {
        const waText = encodeURIComponent(`${message}\n\n(ZatraMart listing: ${contactCtx.listingName})`);
        window.open(`https://wa.me/91${contactCtx.sellerPhone}?text=${waText}`, '_blank');
      }
    });

    /* ---------- Search ---------- */
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    function doSearch() {
      const term = (searchInput.value || '').trim();
      if (!term) return;
      if (document.getElementById('productGrid') && typeof window.applyKMSearch === 'function') {
        window.applyKMSearch(term);
        document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
      } else if (document.getElementById('workerGrid') && typeof window.applyKMMajdoorSearch === 'function') {
        window.applyKMMajdoorSearch(term);
      } else if (document.getElementById('bazaarGrid') && typeof window.applyKMBazaarSearch === 'function') {
        window.applyKMBazaarSearch(term);
      } else {
        window.location.href = `shop.html?search=${encodeURIComponent(term)}`;
      }
    }
    if (searchBtn) searchBtn.addEventListener('click', doSearch);
    if (searchInput) searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });

    /* ---------- Generic scroll reveal (works on any page) ---------- */
    const revealEls = document.querySelectorAll('.reveal, .reveal-stagger');
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(el => revealObserver.observe(el));

    /* ---------- Video / reel modal (shared) ---------- */
    const videoModal = document.getElementById('videoModal');
    const videoClose = document.getElementById('videoClose');
    const videoPlayerWrap = document.getElementById('videoPlayerWrap');
    const videoInfo = document.getElementById('videoInfo');
    function closeVideoModal() {
      videoModal.classList.remove('show');
      if (videoPlayerWrap) videoPlayerWrap.innerHTML = ''; // stop playback
    }
    if (videoModal && videoPlayerWrap) {
      document.addEventListener('click', (e) => {
        const card = e.target.closest('.gyan-thumb, .reel-card');
        if (!card) return;
        const ytId = card.dataset.yt;
        const title = card.dataset.title || '';
        const by = card.dataset.by || '';
        if (ytId) {
          videoPlayerWrap.innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0" title="${title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
          if (videoInfo) videoInfo.innerHTML = title ? `<h5>${title}</h5>${by ? `<p>👤 ${by}</p>` : ''}` : '';
        } else {
          const t = window.KM_I18N ? window.KM_I18N.t : (k) => k;
          videoPlayerWrap.innerHTML = `<div class="video-fake">🎬<p>${t('video.comingSoon')}<br><small>${t('video.comingSoonSub')}</small></p></div>`;
          if (videoInfo) videoInfo.innerHTML = '';
        }
        videoModal.classList.add('show');
      });
      if (videoClose) videoClose.addEventListener('click', closeVideoModal);
      videoModal.addEventListener('click', (e) => { if (e.target === videoModal) closeVideoModal(); });
    }
  });

  return api;
})();
