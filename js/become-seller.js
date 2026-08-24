/* ============================================
   ZatraMart — Become a Seller (business profile, full page, 2-step)
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {
  if (window.KM_I18N) await window.KM_I18N.ready;
  const t = window.KM_I18N ? window.KM_I18N.t : (k) => k;
  const catName = (key) => t('catalog.category.' + key) !== ('catalog.category.' + key) ? t('catalog.category.' + key) : key;
  const { categories } = window.KM_DATA;

  const loginGuard = document.getElementById('loginGuard');
  const formView = document.getElementById('sellerPageForm');
  const successView = document.getElementById('sellerPageSuccess');
  const step1 = document.getElementById('sellerStep1');
  const step2 = document.getElementById('sellerStep2');
  const stepChips = document.querySelectorAll('#sellerSteps .step');

  function checkLogin() {
    const loggedOut = !window.KM.isLoggedIn();
    loginGuard.hidden = !loggedOut;
    formView.style.display = loggedOut ? 'none' : '';
    return !loggedOut;
  }
  const guardLoginBtn = document.getElementById('guardLoginBtn');
  if (guardLoginBtn) guardLoginBtn.addEventListener('click', () => window.KM.openAuth());
  window.KM.onAuthChange(() => { if (checkLogin()) init(); });

  function goToStep(n) {
    step1.hidden = n !== 1;
    step2.hidden = n !== 2;
    stepChips.forEach(s => s.classList.toggle('active', +s.dataset.step === n));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const sellerTypeToggle = document.getElementById('sellerTypeToggle');
  const sellerGstinWrap = document.getElementById('sellerGstinWrap');
  const sellerDisplayNameInput = document.getElementById('sellerDisplayName');
  const sellerDisplayNameError = document.getElementById('sellerDisplayNameError');
  const sellerCatChips = document.getElementById('sellerCatChips');
  const sellerCatError = document.getElementById('sellerCatError');
  const sellerStep1Next = document.getElementById('sellerStep1Next');
  const sellerStep2Back = document.getElementById('sellerStep2Back');
  const sellerBizSubmit = document.getElementById('sellerBizSubmit');
  let sellerType = 'individual';
  let displayNameTaken = false;
  let displayNameCheckPending = null;

  function renderCatChips() {
    const activeCats = Array.from(sellerCatChips.querySelectorAll('.role-chip.active')).map(c => c.dataset.cat);
    sellerCatChips.innerHTML = (categories || []).map(c => `<button class="role-chip ${activeCats.includes(c.key) ? 'active' : ''}" type="button" data-cat="${c.key}">${c.icon} ${catName(c.key)}</button>`).join('');
    sellerCatChips.querySelectorAll('.role-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        chip.classList.toggle('active');
        sellerCatError.classList.remove('show');
      });
    });
  }
  renderCatChips();

  sellerTypeToggle.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      sellerType = btn.dataset.type;
      sellerTypeToggle.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === btn));
      sellerGstinWrap.hidden = sellerType !== 'business';
    });
  });
  document.getElementById('sellerGstin').addEventListener('input', () => {
    document.getElementById('sellerGstin').classList.remove('input-error');
    document.getElementById('sellerGstinError').classList.remove('show');
  });
  sellerDisplayNameInput.addEventListener('input', () => {
    displayNameTaken = false;
    sellerDisplayNameInput.classList.remove('input-error');
    sellerDisplayNameError.classList.remove('show');
  });
  function checkDisplayNameAvailability() {
    const name = sellerDisplayNameInput.value.trim();
    if (name.length < 3) return Promise.resolve();
    displayNameCheckPending = window.KM.isDisplayNameTaken(name).then(taken => {
      displayNameTaken = taken;
      sellerDisplayNameInput.classList.toggle('input-error', taken);
      sellerDisplayNameError.classList.toggle('show', taken);
      displayNameCheckPending = null;
    });
    return displayNameCheckPending;
  }
  sellerDisplayNameInput.addEventListener('blur', checkDisplayNameAvailability);

  sellerStep1Next.addEventListener('click', async () => {
    // Wait out any in-flight name-availability check first — clicking "Aage Badhein" right after
    // typing (without ever blurring the field) was the main reason this used to silently do nothing:
    // the async check hadn't resolved yet, so a taken name slipped through unnoticed.
    if (displayNameCheckPending) await displayNameCheckPending;
    else await checkDisplayNameAvailability();

    const displayName = sellerDisplayNameInput.value.trim();
    const gstin = document.getElementById('sellerGstin').value.trim().toUpperCase();
    const catsSelected = sellerCatChips.querySelectorAll('.role-chip.active').length;
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

    if (displayName.length < 3) {
      sellerDisplayNameError.textContent = t('seller.storeNameMinLength');
      sellerDisplayNameError.classList.add('show');
      sellerDisplayNameInput.classList.add('input-error');
      return;
    }
    if (displayNameTaken) {
      sellerDisplayNameError.textContent = t('seller.nameTaken');
      sellerDisplayNameError.classList.add('show');
      return;
    }
    if (sellerType === 'business' && !gstinRegex.test(gstin)) {
      document.getElementById('sellerGstinError').classList.add('show');
      document.getElementById('sellerGstin').classList.add('input-error');
      return;
    }
    if (!catsSelected) {
      sellerCatError.classList.add('show');
      return;
    }
    goToStep(2);
  });
  sellerStep2Back.addEventListener('click', () => goToStep(1));

  async function init() {
    if (!checkLogin()) return;
    const existing = await window.KM.getMySellerProfile();
    if (existing) {
      sellerType = existing.sellerType;
      sellerTypeToggle.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.type === sellerType));
      sellerGstinWrap.hidden = sellerType !== 'business';
      sellerDisplayNameInput.value = existing.displayName;
      document.getElementById('sellerDescription').value = existing.description || '';
      document.getElementById('sellerGstin').value = existing.gstin || '';
      sellerCatChips.querySelectorAll('.role-chip').forEach(chip => {
        chip.classList.toggle('active', existing.categories.includes(chip.dataset.cat));
      });
      document.getElementById('sellerPickupLine').value = existing.pickupLine;
      document.getElementById('sellerPickupCity').value = existing.pickupCity;
      document.getElementById('sellerPickupState').value = existing.pickupState;
      document.getElementById('sellerPickupPincode').value = existing.pickupPincode;
      sellerBizSubmit.textContent = t('seller.updateBtn');
      document.getElementById('sellerPageTitle').textContent = t('seller.editStoreTitle');
    }
  }
  init();

  sellerBizSubmit.addEventListener('click', async () => {
    const displayName = sellerDisplayNameInput.value.trim();
    const description = document.getElementById('sellerDescription').value.trim();
    const gstin = document.getElementById('sellerGstin').value.trim().toUpperCase();
    const catsSelected = Array.from(sellerCatChips.querySelectorAll('.role-chip.active')).map(c => c.dataset.cat);
    const pickupLine = document.getElementById('sellerPickupLine').value.trim();
    const pickupCity = document.getElementById('sellerPickupCity').value.trim();
    const pickupState = document.getElementById('sellerPickupState').value.trim();
    const pickupPincode = document.getElementById('sellerPickupPincode').value.trim();
    const addressError = document.getElementById('sellerAddressError');
    const pincodeError = document.getElementById('sellerPincodeError');
    addressError.classList.remove('show');
    pincodeError.classList.remove('show');
    document.getElementById('sellerPickupPincode').classList.remove('input-error');

    if (!pickupLine || !pickupCity || !pickupState) {
      addressError.classList.add('show');
      return;
    }
    if (!/^\d{6}$/.test(pickupPincode)) {
      pincodeError.classList.add('show');
      document.getElementById('sellerPickupPincode').classList.add('input-error');
      return;
    }

    sellerBizSubmit.disabled = true;
    sellerBizSubmit.textContent = t('product.savingReview');
    const ok = await window.KM.upsertSellerProfile({
      sellerType, displayName, description, gstin: sellerType === 'business' ? gstin : null,
      categories: catsSelected, pickupLine, pickupCity, pickupState, pickupPincode,
    });
    sellerBizSubmit.disabled = false;
    sellerBizSubmit.textContent = t('seller.saveSubmitBtn');
    if (!ok) return; // upsertSellerProfile already toasts the specific reason (e.g. name taken, network error)

    formView.style.display = 'none';
    successView.style.display = '';
    document.getElementById('sellerPageSuccessMsg').textContent = t('seller.storeCreatedMsg', { name: displayName });
  });

  document.addEventListener('km:langchange', renderCatChips);
});
