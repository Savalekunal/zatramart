/* ============================================
   ZatraMart — Sarkari Yojana page script
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  const { yojanas } = window.KM_DATA;

  const yojanaGrid = document.getElementById('yojanaGrid');
  yojanaGrid.innerHTML = yojanas.map((y, i) => `
    <div class="yojana-card" data-index="${i}">
      <div class="yojana-icon">${y.icon}</div>
      <h4>${y.name}</h4>
      <p class="yojana-benefit">${y.benefit}</p>
      <div class="yojana-docs">
        ${y.docs.map(d => `<span>📄 ${d}</span>`).join('')}
      </div>
      <button class="btn-chip yojana-btn" data-index="${i}">Aur Jaanein →</button>
    </div>`).join('');

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

      <h5>📝 Yojana Kya Hai</h5>
      <p class="yojana-modal-desc">${y.desc || ''}</p>

      <h5>✅ Eligibility</h5>
      <ul class="yojana-modal-list">
        ${(y.eligibility || []).map(e => `<li>${e}</li>`).join('')}
      </ul>

      <h5>📋 Apply Karne Ki Poori Procedure</h5>
      <ol class="yojana-modal-list yojana-modal-steps">
        ${(y.procedure || []).map(p => `<li>${p}</li>`).join('')}
      </ol>

      <h5>🪪 Zaroori Documents</h5>
      <div class="doc-chip-row">
        ${y.docs.map(d => `<span class="doc-chip">📄 ${d}</span>`).join('')}
      </div>

      ${y.applyLink ? `<a href="${y.applyLink}" target="_blank" rel="noopener" class="btn btn-primary btn-block yojana-apply-btn">Official Website Par Jaayein ↗</a>` : ''}
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

  yojanaGrid.querySelectorAll('.yojana-btn').forEach(btn => {
    btn.addEventListener('click', () => openModal(parseInt(btn.dataset.index, 10)));
  });
  yojanaGrid.querySelectorAll('.yojana-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.yojana-btn')) return;
      openModal(parseInt(card.dataset.index, 10));
    });
  });

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
});
