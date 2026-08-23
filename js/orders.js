/* ============================================
   ZatraMart — Orders (list + tracking) script
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {
  if (window.KM_I18N) await window.KM_I18N.ready;
  const t = window.KM_I18N ? window.KM_I18N.t : (k) => k;

  const loginGuard = document.getElementById('loginGuard');
  const listView = document.getElementById('ordersListView');
  const detailView = document.getElementById('orderDetailView');

  function checkLogin() {
    const loggedOut = !window.KM.isLoggedIn();
    loginGuard.hidden = !loggedOut;
    listView.style.display = loggedOut ? 'none' : '';
    if (loggedOut) detailView.style.display = 'none';
    return !loggedOut;
  }
  const guardLoginBtn = document.getElementById('guardLoginBtn');
  if (guardLoginBtn) guardLoginBtn.addEventListener('click', () => window.KM.openAuth());
  window.KM.onAuthChange(() => { if (checkLogin()) render(); });

  function money(n) { return '₹' + n.toLocaleString('en-IN'); }
  function fmtDate(iso) { return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }

  // Orders placed after the tracking-key change (see checkout.js) carry step.key ('placed',
  // 'packed', ...) and get a live-translated label. Orders placed before that change only have
  // step.label frozen in whatever language was active at checkout — shown as-is rather than
  // guessing a key from old English text.
  function stepLabel(step) { return step.key ? t('orders.status.' + step.key) : step.label; }
  function isDeliveredStep(step) { return step.key ? step.key === 'delivered' : step.label === 'Delivered'; }

  function currentStatus(order) {
    const now = Date.now();
    let step = order.tracking[0];
    order.tracking.forEach(s => { if (now >= s.at) step = s; });
    return step;
  }

  async function renderList() {
    const orders = await window.KM.getOrders();
    const wrap = document.getElementById('ordersList');
    if (orders.length === 0) {
      wrap.innerHTML = `
        <div class="orders-empty">
          <span>📦</span>
          <p>${t('orders.noOrdersYet')}</p>
          <a href="shop.html" class="btn btn-primary">${t('orders.startShoppingBtn')}</a>
        </div>`;
      return;
    }
    wrap.innerHTML = orders.map(o => {
      const step = currentStatus(o);
      const thumbs = o.items.slice(0, 4);
      const extra = o.items.length - thumbs.length;
      return `
      <div class="order-card" data-id="${o.id}">
        <div class="order-card-top">
          <div>
            <div class="order-card-id">${o.id}</div>
            <div class="order-card-date">${t('orders.placedOn', { date: fmtDate(o.date) })}</div>
          </div>
          <span class="order-status-badge ${isDeliveredStep(step) ? 'delivered' : ''}">${stepLabel(step)}</span>
        </div>
        <div class="order-card-items">
          ${thumbs.map(i => `<img src="${i.img}" alt="${i.name}">`).join('')}
          ${extra > 0 ? `<div class="order-card-more">+${extra}</div>` : ''}
        </div>
        <div class="order-card-bottom">
          <span class="order-card-total">${money(o.total)} · ${o.items.reduce((s, i) => s + i.qty, 0)} ${t('common.items')}</span>
          <span class="order-card-track">${t('orders.trackOrderLink')}</span>
        </div>
      </div>`;
    }).join('');

    wrap.querySelectorAll('.order-card').forEach(card => {
      card.addEventListener('click', () => { window.location.href = `orders.html?id=${card.dataset.id}`; });
    });
  }

  async function renderDetail(id) {
    const order = await window.KM.getOrder(id);
    if (!order) {
      detailView.innerHTML = `<p class="orders-empty">${t('orders.orderNotFound')}</p>`;
      detailView.style.display = '';
      listView.style.display = 'none';
      return;
    }
    listView.style.display = 'none';
    detailView.style.display = '';

    document.getElementById('detailOrderId').textContent = order.id;
    document.getElementById('detailOrderMeta').textContent = `${t('orders.placedOn', { date: fmtDate(order.date) })} · ${order.paymentMethod}`;
    const step = currentStatus(order);
    const badge = document.getElementById('detailStatusBadge');
    badge.textContent = stepLabel(step);
    badge.classList.toggle('delivered', isDeliveredStep(step));

    const now = Date.now();
    document.getElementById('trackingStepper').innerHTML = order.tracking.map(s => {
      const done = now >= s.at;
      const timeStr = done
        ? new Date(s.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
        : t('orders.expected', { time: new Date(s.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) });
      return `
        <div class="tracking-step ${done ? 'done' : ''}">
          <div class="tracking-dot">${done ? '✓' : ''}</div>
          <div class="tracking-step-info">
            <h5>${stepLabel(s)}</h5>
            <span>${timeStr}</span>
          </div>
        </div>`;
    }).join('');

    document.getElementById('detailItems').innerHTML = order.items.map(i => `
      <div class="order-line-item">
        <img src="${i.img}" alt="${i.name}">
        <div class="order-line-item-info">
          <h5>${i.name}</h5>
          <span>${t('checkout.qtyPrice', { qty: i.qty, price: i.price })}</span>
        </div>
        <strong>₹${(i.price * i.qty).toLocaleString('en-IN')}</strong>
      </div>`).join('') + `
      <div class="summary-row" style="margin-top:14px;"><span>${t('orders.subtotal')}</span><span>${money(order.subtotal)}</span></div>
      <div class="summary-row"><span>${t('orders.delivery')}</span><span>${order.delivery === 0 ? t('checkout.free') : money(order.delivery)}</span></div>
      ${order.codCharge ? `<div class="summary-row"><span>${t('orders.codCharge')}</span><span>${money(order.codCharge)}</span></div>` : ''}
      <div class="summary-row total"><span>${t('orders.totalPaid')}</span><span>${money(order.total)}</span></div>
    `;

    const a = order.address;
    document.getElementById('detailAddress').innerHTML = `
      <p><strong>${a.name}</strong> · 📞 ${a.phone}</p>
      <p>${a.line}, ${a.city}, ${a.state} - ${a.pincode} (${a.type})</p>
      <p style="margin-top:10px;">${t('orders.paymentLabel')} <strong>${order.paymentMethod}</strong></p>
    `;
  }

  async function render() {
    if (!checkLogin()) return;
    const id = new URLSearchParams(location.search).get('id');
    if (id) await renderDetail(id);
    else await renderList();
  }

  render();

  // Live-refresh tracking timestamps every 10s so the demo shows real progress over a few minutes
  setInterval(() => {
    const id = new URLSearchParams(location.search).get('id');
    if (id && window.KM.isLoggedIn()) renderDetail(id);
  }, 10000);

  document.addEventListener('km:langchange', render);

});
