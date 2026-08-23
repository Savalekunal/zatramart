/* ============================================
   ZatraMart — Orders (list + tracking) script
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

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

  function currentStatus(order) {
    const now = Date.now();
    let status = order.tracking[0].label;
    order.tracking.forEach(step => { if (now >= step.at) status = step.label; });
    return status;
  }

  async function renderList() {
    const orders = await window.KM.getOrders();
    const wrap = document.getElementById('ordersList');
    if (orders.length === 0) {
      wrap.innerHTML = `
        <div class="orders-empty">
          <span>📦</span>
          <p>Abhi tak koi order nahi hai.</p>
          <a href="shop.html" class="btn btn-primary">Shopping Shuru Karein</a>
        </div>`;
      return;
    }
    wrap.innerHTML = orders.map(o => {
      const status = currentStatus(o);
      const thumbs = o.items.slice(0, 4);
      const extra = o.items.length - thumbs.length;
      return `
      <div class="order-card" data-id="${o.id}">
        <div class="order-card-top">
          <div>
            <div class="order-card-id">${o.id}</div>
            <div class="order-card-date">Placed on ${fmtDate(o.date)}</div>
          </div>
          <span class="order-status-badge ${status === 'Delivered' ? 'delivered' : ''}">${status}</span>
        </div>
        <div class="order-card-items">
          ${thumbs.map(i => `<img src="${i.img}" alt="${i.name}">`).join('')}
          ${extra > 0 ? `<div class="order-card-more">+${extra}</div>` : ''}
        </div>
        <div class="order-card-bottom">
          <span class="order-card-total">${money(o.total)} · ${o.items.reduce((s, i) => s + i.qty, 0)} items</span>
          <span class="order-card-track">Track Order →</span>
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
      detailView.innerHTML = '<p class="orders-empty">Order nahi mila.</p>';
      detailView.style.display = '';
      listView.style.display = 'none';
      return;
    }
    listView.style.display = 'none';
    detailView.style.display = '';

    document.getElementById('detailOrderId').textContent = order.id;
    document.getElementById('detailOrderMeta').textContent = `Placed on ${fmtDate(order.date)} · ${order.paymentMethod}`;
    const status = currentStatus(order);
    const badge = document.getElementById('detailStatusBadge');
    badge.textContent = status;
    badge.classList.toggle('delivered', status === 'Delivered');

    const now = Date.now();
    document.getElementById('trackingStepper').innerHTML = order.tracking.map(step => {
      const done = now >= step.at;
      const timeStr = done
        ? new Date(step.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
        : 'Expected ' + new Date(step.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      return `
        <div class="tracking-step ${done ? 'done' : ''}">
          <div class="tracking-dot">${done ? '✓' : ''}</div>
          <div class="tracking-step-info">
            <h5>${step.label}</h5>
            <span>${timeStr}</span>
          </div>
        </div>`;
    }).join('');

    document.getElementById('detailItems').innerHTML = order.items.map(i => `
      <div class="order-line-item">
        <img src="${i.img}" alt="${i.name}">
        <div class="order-line-item-info">
          <h5>${i.name}</h5>
          <span>Qty: ${i.qty} × ₹${i.price}</span>
        </div>
        <strong>₹${(i.price * i.qty).toLocaleString('en-IN')}</strong>
      </div>`).join('') + `
      <div class="summary-row" style="margin-top:14px;"><span>Subtotal</span><span>${money(order.subtotal)}</span></div>
      <div class="summary-row"><span>Delivery</span><span>${order.delivery === 0 ? 'FREE' : money(order.delivery)}</span></div>
      ${order.codCharge ? `<div class="summary-row"><span>COD Charge</span><span>${money(order.codCharge)}</span></div>` : ''}
      <div class="summary-row total"><span>Total Paid</span><span>${money(order.total)}</span></div>
    `;

    const a = order.address;
    document.getElementById('detailAddress').innerHTML = `
      <p><strong>${a.name}</strong> · 📞 ${a.phone}</p>
      <p>${a.line}, ${a.city}, ${a.state} - ${a.pincode} (${a.type})</p>
      <p style="margin-top:10px;">💳 Payment: <strong>${order.paymentMethod}</strong></p>
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

});
