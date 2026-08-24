/* ============================================
   ZatraMart — Add Product (Seller Bane product submission, full page, 2-step)
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {
  if (window.KM_I18N) await window.KM_I18N.ready;
  const t = window.KM_I18N ? window.KM_I18N.t : (k) => k;
  const catName = (key) => t('catalog.category.' + key) !== ('catalog.category.' + key) ? t('catalog.category.' + key) : key;
  const { categories } = window.KM_DATA;

  const loginGuard = document.getElementById('loginGuard');
  const formView = document.getElementById('addProdForm');
  const successView = document.getElementById('addProdSuccess');
  const step1 = document.getElementById('addProdStep1');
  const step2 = document.getElementById('addProdStep2');
  const stepChips = document.querySelectorAll('#addProdSteps .step');

  function checkLogin() {
    const loggedOut = !window.KM.isLoggedIn();
    loginGuard.hidden = !loggedOut;
    formView.style.display = loggedOut ? 'none' : '';
    return !loggedOut;
  }
  const guardLoginBtn = document.getElementById('guardLoginBtn');
  if (guardLoginBtn) guardLoginBtn.addEventListener('click', () => window.KM.openAuth());
  window.KM.onAuthChange(() => { checkLogin(); });

  function goToStep(n) {
    step1.hidden = n !== 1;
    step2.hidden = n !== 2;
    stepChips.forEach(s => s.classList.toggle('active', +s.dataset.step === n));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const prodCat = document.getElementById('prodCat');
  function renderCatOptions() {
    const prevValue = prodCat.value;
    prodCat.innerHTML = (categories || []).map(c => `<option value="${c.key}">${c.icon} ${catName(c.key)}</option>`).join('');
    if (prevValue) prodCat.value = prevValue;
  }
  renderCatOptions();

  const prodNameInput = document.getElementById('prodName');
  const prodNameError = document.getElementById('prodNameError');
  const prodPriceInput = document.getElementById('prodPrice');
  const prodPriceError = document.getElementById('prodPriceError');
  const addProdStep1Next = document.getElementById('addProdStep1Next');
  const addProdStep2Back = document.getElementById('addProdStep2Back');
  const addProdSubmit = document.getElementById('addProdSubmit');
  const prodPhotos = document.getElementById('prodPhotos');
  const prodPhotosPreview = document.getElementById('prodPhotosPreview');
  const prodPhotosError = document.getElementById('prodPhotosError');

  prodNameInput.addEventListener('input', () => {
    prodNameInput.classList.remove('input-error');
    prodNameError.classList.remove('show');
  });
  prodPriceInput.addEventListener('input', () => {
    prodPriceInput.classList.remove('input-error');
    prodPriceError.classList.remove('show');
  });

  addProdStep1Next.addEventListener('click', () => {
    const name = prodNameInput.value.trim();
    const price = parseFloat(prodPriceInput.value);
    let ok = true;
    if (!name) {
      prodNameError.classList.add('show');
      prodNameInput.classList.add('input-error');
      ok = false;
    }
    if (!price || price <= 0) {
      prodPriceError.classList.add('show');
      prodPriceInput.classList.add('input-error');
      ok = false;
    }
    if (!ok) return;
    goToStep(2);
  });
  addProdStep2Back.addEventListener('click', () => goToStep(1));

  prodPhotos.addEventListener('change', () => {
    prodPhotosError.classList.remove('show');
    prodPhotosPreview.innerHTML = Array.from(prodPhotos.files).slice(0, 5)
      .map(f => `<img src="${URL.createObjectURL(f)}" alt="">`).join('');
  });

  function resetForm() {
    prodNameInput.value = '';
    document.getElementById('prodDesc').value = '';
    prodPriceInput.value = '';
    document.getElementById('prodCondition').value = 'New';
    document.getElementById('prodNegotiable').checked = true;
    prodCat.selectedIndex = 0;
    prodPhotos.value = '';
    prodPhotosPreview.innerHTML = '';
    goToStep(1);
    formView.style.display = '';
    successView.style.display = 'none';
  }

  addProdSubmit.addEventListener('click', async () => {
    const name = prodNameInput.value.trim();
    const cat = prodCat.value;
    const price = parseFloat(prodPriceInput.value);
    const description = document.getElementById('prodDesc').value.trim();
    const condition = document.getElementById('prodCondition').value;
    const negotiable = document.getElementById('prodNegotiable').checked;
    const files = prodPhotos.files;

    if (!files.length) {
      prodPhotosError.classList.add('show');
      return;
    }

    addProdSubmit.disabled = true;
    addProdSubmit.textContent = t('bazaar.uploading');
    const images = await window.KM.uploadListingImages(files, 'products');
    if (!images.length) {
      addProdSubmit.disabled = false;
      addProdSubmit.textContent = t('addProduct.postBtn');
      window.KM.toast(t('addProduct.uploadFailedToast'));
      return;
    }
    const ok = await window.KM.addSellerProduct({ id: 'sp' + Date.now(), name, cat, price, description, condition, negotiable, images });
    addProdSubmit.disabled = false;
    addProdSubmit.textContent = t('addProduct.postBtn');
    if (!ok) return;

    formView.style.display = 'none';
    successView.style.display = '';
    document.getElementById('addProdSuccessMsg').textContent = t('addProduct.liveMsg', { name });
  });

  document.getElementById('addAnotherBtn').addEventListener('click', resetForm);

  checkLogin();

  document.addEventListener('km:langchange', renderCatOptions);
});
