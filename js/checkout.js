/* ============================================
   ZatraMart — Checkout script
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  const loginGuard = document.getElementById('loginGuard');
  const emptyGuard = document.getElementById('emptyGuard');
  const checkoutFlow = document.getElementById('checkoutFlow');
  const checkoutSummaryAside = document.querySelector('.checkout-summary');
  const stepper = document.getElementById('checkoutStepper');

  let selectedAddress = null;
  let currentStep = 1;

  function money(n) { return '₹' + n.toLocaleString('en-IN'); }

  function computeCharges() {
    const cart = window.KM.getCart();
    const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const delivery = subtotal >= 499 || subtotal === 0 ? 0 : 49;
    const method = document.querySelector('input[name="pay"]:checked')?.value || 'card';
    const codCharge = method === 'cod' ? 25 : 0;
    const total = subtotal + delivery + codCharge;
    return { cart, subtotal, delivery, codCharge, total, method };
  }

  function renderSummary() {
    const { cart, subtotal, delivery, codCharge, total } = computeCharges();
    document.getElementById('summaryItems').innerHTML = cart.map(i => `
      <div class="summary-item">
        <img src="${i.img}" alt="${i.name}">
        <div class="summary-item-info"><h5>${i.name}</h5><span>Qty: ${i.qty} × ₹${i.price}</span></div>
        <strong>₹${(i.price * i.qty).toLocaleString('en-IN')}</strong>
      </div>`).join('');
    document.getElementById('summarySubtotal').textContent = money(subtotal);
    document.getElementById('summaryDelivery').textContent = delivery === 0 ? 'FREE' : money(delivery);
    document.getElementById('summaryCod').textContent = money(codCharge);
    document.getElementById('summaryTotal').textContent = money(total);
    document.getElementById('payAmount').textContent = total.toLocaleString('en-IN');
  }

  let orderPlaced = false;

  function checkGuards() {
    if (orderPlaced) return true;
    const cartEmpty = window.KM.getCart().length === 0;
    const loggedOut = !window.KM.isLoggedIn();
    loginGuard.hidden = !loggedOut;
    emptyGuard.hidden = loggedOut || !cartEmpty;
    const showFlow = !loggedOut && !cartEmpty;
    checkoutFlow.style.display = showFlow ? '' : 'none';
    checkoutSummaryAside.style.display = showFlow ? '' : 'none';
    stepper.style.display = showFlow ? '' : 'none';
    if (showFlow) renderSummary();
    return showFlow;
  }
  checkGuards();
  window.KM.onCartChange(checkGuards);
  window.KM.onAuthChange(checkGuards);

  document.getElementById('guardLoginBtn').addEventListener('click', () => window.KM.openAuth());

  /* ---------- Step navigation ---------- */
  function goToStep(n) {
    currentStep = n;
    document.querySelectorAll('.checkout-section').forEach(s => s.classList.remove('active'));
    document.getElementById(['sectionAddress', 'sectionPayment', 'sectionSuccess'][n - 1]).classList.add('active');
    stepper.querySelectorAll('.step').forEach(s => {
      const stepNum = +s.dataset.step;
      s.classList.toggle('active', stepNum === n);
      s.classList.toggle('done', stepNum < n);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- Saved addresses ---------- */
  async function renderAddresses() {
    const list = await window.KM.getAddresses();
    const wrap = document.getElementById('savedAddresses');
    const form = document.getElementById('addressForm');
    if (list.length === 0) {
      wrap.innerHTML = '';
      form.style.display = '';
      return;
    }
    if (!selectedAddress || !list.some(a => a.id === selectedAddress.id)) selectedAddress = list[list.length - 1];

    wrap.innerHTML = list.map((a, i) => `
      <label class="address-card ${selectedAddress.id === a.id ? 'active' : ''}">
        <input type="radio" name="savedAddr" value="${a.id}" ${selectedAddress.id === a.id ? 'checked' : ''}>
        <div>
          <strong>${a.type} — ${a.name}</strong>
          <p>${a.line}, ${a.city}, ${a.state} - ${a.pincode}</p>
          <span>📞 ${a.phone}</span>
        </div>
      </label>`).join('') + `
      <div class="address-card-actions">
        <button class="btn-chip add-new-addr-btn" id="addNewAddrBtn" type="button">+ Nayi Address Jodein</button>
        <button class="btn btn-primary" id="continueToPaymentBtn" type="button">Aage Badhein →</button>
      </div>`;
    form.style.display = 'none';

    wrap.querySelectorAll('input[name="savedAddr"]').forEach(radio => {
      radio.addEventListener('change', () => {
        selectedAddress = list.find(a => a.id === radio.value);
        renderAddresses();
      });
    });
    const addNewBtn = document.getElementById('addNewAddrBtn');
    if (addNewBtn) addNewBtn.addEventListener('click', () => { form.style.display = ''; });
    const continueBtn = document.getElementById('continueToPaymentBtn');
    if (continueBtn) continueBtn.addEventListener('click', () => goToStep(2));
  }
  renderAddresses();

  document.getElementById('saveAddressBtn').addEventListener('click', async () => {
    const name = document.getElementById('addrName').value.trim();
    const phone = document.getElementById('addrPhone').value.trim();
    const line = document.getElementById('addrLine').value.trim();
    const pincode = document.getElementById('addrPincode').value.trim();
    const city = document.getElementById('addrCity').value.trim();
    const state = document.getElementById('addrState').value.trim();
    const type = document.querySelector('#addrTypePick .role-chip.active')?.dataset.type || 'Home';

    if (!name || !/^\d{10}$/.test(phone) || !line || !/^\d{6}$/.test(pincode) || !city || !state) {
      window.KM.toast('⚠️ Kripya sabhi fields sahi se bharein');
      return;
    }
    selectedAddress = await window.KM.addAddress({ name, phone, line, pincode, city, state, type });
    if (!selectedAddress) return;
    window.KM.toast('✅ Address save ho gaya');
    await renderAddresses();
    goToStep(2);
  });

  document.querySelectorAll('#addrTypePick .role-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#addrTypePick .role-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    });
  });

  document.getElementById('backToAddressBtn').addEventListener('click', () => goToStep(1));

  /* ---------- Payment method switching ---------- */
  const payDetails = { card: document.getElementById('cardDetail'), upi: document.getElementById('upiDetail'), cod: document.getElementById('codDetail') };
  document.querySelectorAll('input[name="pay"]').forEach(radio => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.pay-option').forEach(o => o.classList.remove('active'));
      radio.closest('.pay-option').classList.add('active');
      Object.entries(payDetails).forEach(([key, el]) => { el.hidden = key !== radio.value; });
      renderSummary();
    });
  });

  /* Card number spacing */
  const cardNumber = document.getElementById('cardNumber');
  cardNumber.addEventListener('input', () => {
    cardNumber.value = cardNumber.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  });
  const cardExpiry = document.getElementById('cardExpiry');
  cardExpiry.addEventListener('input', () => {
    let v = cardExpiry.value.replace(/\D/g, '').slice(0, 4);
    if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
    cardExpiry.value = v;
  });

  /* ---------- Pay now (COD only — Card/UPI are "coming soon") ---------- */
  document.getElementById('payNowBtn').addEventListener('click', async () => {
    if (!selectedAddress) { window.KM.toast('⚠️ Pehle delivery address chunein'); goToStep(1); return; }
    const { subtotal, delivery, codCharge, total, cart } = computeCharges();

    const processing = document.getElementById('payProcessing');
    processing.classList.add('show');

    const now = Date.now();
    const methodLabel = '💵 Cash on Delivery';
    const order = {
      id: 'ORD' + now,
      items: cart,
      subtotal, delivery, codCharge, total,
      address: selectedAddress,
      paymentMethod: methodLabel,
      status: 'Placed',
      tracking: [
        { label: 'Order Placed', at: now },
        { label: 'Packed', at: now + 2 * 60 * 1000 },
        { label: 'Shipped', at: now + 5 * 60 * 1000 },
        { label: 'Out for Delivery', at: now + 8 * 60 * 1000 },
        { label: 'Delivered', at: now + 12 * 60 * 1000 },
      ],
    };
    await window.KM.addOrder(order);
    processing.classList.remove('show');
    orderPlaced = true;
    window.KM.clearCart();

    const eta = new Date(now + 4 * 24 * 60 * 60 * 1000);
    document.getElementById('orderSuccessBox').innerHTML = `
      <span class="success-tick">✅</span>
      <h2>Order Confirm Ho Gaya!</h2>
      <p>Dhanyavaad! Aapka order safaltapoorvak place ho gaya hai.</p>
      <div class="order-id-box">Order ID: <strong>${order.id}</strong></div>
      <p class="eta-note">📅 Estimated Delivery: <strong>${eta.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></p>
      <p class="eta-note">💰 Total Paid: <strong>${money(total)}</strong> via ${methodLabel}</p>
      <div class="success-actions">
        <a href="orders.html?id=${order.id}" class="btn btn-primary">📦 Order Track Karein</a>
        <a href="shop.html" class="btn btn-outline">Shopping Jaari Rakhein</a>
      </div>
    `;
    goToStep(3);
  });

});
