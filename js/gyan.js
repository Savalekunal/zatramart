/* ============================================
   ZatraMart — Kisan Gyan (reels + videos) page script
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  const t = window.KM_I18N ? window.KM_I18N.t : (k) => k;
  const { reels, gyanVideos } = window.KM_DATA;

  document.getElementById('reelsRow').innerHTML = reels.map(r => `
    <div class="reel-card" data-yt="${r.yt || ''}" data-title="${r.title}" data-by="${r.creator}">
      <img src="${r.img}" alt="${r.title}">
      <div class="reel-overlay">
        <span class="reel-play">▶</span>
        <div class="reel-info">
          <h5>${r.title}</h5>
          <p>@${r.creator.replace(/\s+/g, '')} · ❤️ ${r.likes}</p>
        </div>
      </div>
    </div>`).join('');

  document.getElementById('gyanGrid').innerHTML = gyanVideos.map(v => `
    <div class="gyan-card">
      <div class="gyan-thumb" data-yt="${v.yt || ''}" data-title="${v.title}" data-by="${v.by}">
        <img src="${v.img}" alt="${v.title}">
        <span class="play-btn">▶</span>
        <span class="duration">${v.duration}</span>
      </div>
      <h4>${v.title}</h4>
      <p class="gyan-meta">👤 ${v.by} · 👁️ ${v.views} ${t('common.views')}</p>
    </div>`).join('');
});
