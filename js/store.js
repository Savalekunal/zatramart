/* ============================================
   ZatraMart — Store locator page script
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  const { storeLocations } = window.KM_DATA;

  document.getElementById('storeGrid').innerHTML = storeLocations.map(s => `
    <div class="store-location-card">
      <img src="${s.img}" alt="${s.city}">
      <div class="store-location-body">
        <h4>📍 ${s.city}</h4>
        <p>${s.address}</p>
        <p>📞 ${s.phone}</p>
        <p class="store-hours">🕒 ${s.hours}</p>
      </div>
    </div>`).join('');
});
