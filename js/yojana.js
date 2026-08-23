/* ============================================
   ZatraMart — Sarkari Yojana page script
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {
  if (window.KM_I18N) await window.KM_I18N.ready;
  const t = window.KM_I18N ? window.KM_I18N.t : (k) => k;
  const { yojanas } = window.KM_DATA;

  const yojanaGrid = document.getElementById('yojanaGrid');
  function renderGrid() {
    yojanaGrid.innerHTML = yojanas.map((y, i) => `
      <div class="yojana-card" data-index="${i}">
        <div class="yojana-icon">${y.icon}</div>
        <h4>${y.name}</h4>
        <p class="yojana-benefit">${y.benefit}</p>
        <div class="yojana-docs">
          ${y.docs.map(d => `<span>📄 ${d}</span>`).join('')}
        </div>
        <button class="btn-chip yojana-btn" data-index="${i}">${t('common.learnMore')}</button>
      </div>`).join('');
    wireGridEvents();
  }

  const modal = document.getElementById('yojanaModal');
  const modalBody = document.getElementById('yojanaModalBody');
  const closeBtn = document.getElementById('yojanaModalClose');
  const prevBtn = document.getElementById('yojanaPrevBtn');
  const nextBtn = document.getElementById('yojanaNextBtn');
  let currentIndex = 0;

  function renderModal(index) {
    currentIndex = (index + yojanas.length) % yojanas.length;
    const y = yojanas[currentIndex];
    modalBody.innerHTML = `
      <div class="yojana-modal-icon">${y.icon}</div>
      <h3>${y.name}</h3>
      <p class="yojana-modal-benefit">💰 ${y.benefit}</p>

      <h5>${t('yojana.whatIsIt')}</h5>
      <p class="yojana-modal-desc">${y.desc || ''}</p>

      <h5>${t('yojana.eligibility')}</h5>
      <ul class="yojana-modal-list">
        ${(y.eligibility || []).map(e => `<li>${e}</li>`).join('')}
      </ul>

      <h5>${t('yojana.procedure')}</h5>
      <ol class="yojana-modal-list yojana-modal-steps">
        ${(y.procedure || []).map(p => `<li>${p}</li>`).join('')}
      </ol>

      <h5>${t('yojana.requiredDocs')}</h5>
      <div class="doc-chip-row">
        ${y.docs.map(d => `<span class="doc-chip">📄 ${d}</span>`).join('')}
      </div>

      ${y.applyLink ? `<a href="${y.applyLink}" target="_blank" rel="noopener" class="btn btn-primary btn-block yojana-apply-btn">${t('yojana.officialWebsite')}</a>` : ''}
    `;
  }

  function openModal(index) {
    renderModal(index);
    modal.classList.add('show');
    document.getElementById('overlay')?.classList.add('show');
  }
  function closeModal() {
    modal.classList.remove('show');
    document.getElementById('overlay')?.classList.remove('show');
  }

  function wireGridEvents() {
    yojanaGrid.querySelectorAll('.yojana-btn').forEach(btn => {
      btn.addEventListener('click', () => openModal(parseInt(btn.dataset.index, 10)));
    });
    yojanaGrid.querySelectorAll('.yojana-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.yojana-btn')) return;
        openModal(parseInt(card.dataset.index, 10));
      });
    });
  }
  renderGrid();

  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  prevBtn.addEventListener('click', () => renderModal(currentIndex - 1));
  nextBtn.addEventListener('click', () => renderModal(currentIndex + 1));
  document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('show')) return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'ArrowRight') renderModal(currentIndex + 1);
    if (e.key === 'ArrowLeft') renderModal(currentIndex - 1);
  });

  document.addEventListener('km:langchange', () => {
    renderGrid();
    if (modal.classList.contains('show')) renderModal(currentIndex);
  });
});
