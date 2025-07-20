i18next
.use(i18nextHttpBackend)
.init({
  lng: 'en', // Bahasa default: Inggris
  fallbackLng: 'en',
  backend: {
    loadPath: '/locales/en.json' // Path ke file en.json
  }
}, function(err, t) {
  if (err) return console.error(err);
  updateContent();
});

function updateContent() {
// Terjemahkan elemen .match-competition
document.querySelectorAll('.match-competition').forEach(element => {
  const originalText = element.textContent.trim();
  if (i18next.exists(originalText)) {
    element.textContent = i18next.t(originalText);
  }
});

// Terjemahkan elemen .match-teams (tanpa bagian "- LIVE")
document.querySelectorAll('.match-teams').forEach(element => {
  const originalText = element.textContent.trim().split(' <')[0]; // Ambil teks sebelum "- LIVE"
  if (i18next.exists(originalText)) {
    element.textContent = i18next.t(originalText) + (element.textContent.includes('- LIVE') ? ' <span class="live-indicator">- LIVE</span>' : '');
  }
});
}

// Simpan referensi ke updateTimes asli
const originalUpdateTimes = window.updateTimes || function() {};
window.updateTimes = function() {
originalUpdateTimes(); // Panggil fungsi asli
// Terjemahkan kompetisi dan tim
document.querySelectorAll('.match-card').forEach(match => {
  const competitionElement = match.querySelector('.match-competition');
  const teamsElement = match.querySelector('.match-teams');
  if (competitionElement && i18next.exists(competitionElement.textContent.trim())) {
    competitionElement.textContent = i18next.t(competitionElement.textContent.trim());
  }
  if (teamsElement) {
    const originalText = teamsElement.textContent.trim().split(' <')[0];
    if (i18next.exists(originalText)) {
      teamsElement.textContent = i18next.t(originalText) + (teamsElement.textContent.includes('- LIVE') ? ' <span class="live-indicator">- LIVE</span>' : '');
    }
  }
});
};

// Simpan referensi ke checkLiveMatches asli
const originalCheckLiveMatches = window.checkLiveMatches || function() {};
window.checkLiveMatches = function() {
originalCheckLiveMatches(); // Panggil fungsi asli
// Tidak perlu terjemahan tambahan karena hanya mengatur visibilitas
};