i18next
.use(i18nextHttpBackend)
.init({
  lng: 'en', // Bahasa default: Inggris
  fallbackLng: 'en',
  backend: {
    loadPath: '/locales/{{lng}}.json' // Menggunakan placeholder untuk mendukung multiple languages
  }
}, function(err, t) {
  if (err) return console.error(err);
  updateContent();
});

function translateText(text) {
  // Coba terjemahkan teks lengkap terlebih dahulu
  if (i18next.exists(text)) {
    return i18next.t(text);
  }
  
  // Jika tidak ada terjemahan untuk teks lengkap, coba terjemahkan per tim
  const parts = text.split(' - ');
  if (parts.length === 2) {
    const homeTeam = i18next.exists(parts[0].trim()) ? i18next.t(parts[0].trim()) : parts[0].trim();
    const awayTeam = i18next.exists(parts[1].trim()) ? i18next.t(parts[1].trim()) : parts[1].trim();
    return `${homeTeam} - ${awayTeam}`;
  }
  
  return text; // Kembalikan teks asli jika tidak ada terjemahan
}

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
    const hasLiveIndicator = element.textContent.includes('- LIVE');
    const textToTranslate = element.textContent.replace('- LIVE', '').trim();
    
    const translatedText = translateText(textToTranslate);
    element.innerHTML = translatedText + (hasLiveIndicator ? ' <span class="live-indicator">- LIVE</span>' : '');
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
      const hasLiveIndicator = teamsElement.textContent.includes('- LIVE');
      const textToTranslate = teamsElement.textContent.replace('- LIVE', '').trim();
      
      const translatedText = translateText(textToTranslate);
      teamsElement.innerHTML = translatedText + (hasLiveIndicator ? ' <span class="live-indicator">- LIVE</span>' : '');
    }
  });
};

// Simpan referensi ke checkLiveMatches asli
const originalCheckLiveMatches = window.checkLiveMatches || function() {};
window.checkLiveMatches = function() {
  originalCheckLiveMatches(); // Panggil fungsi asli
  // Tidak perlu terjemahan tambahan karena hanya mengatur visibilitas
};
