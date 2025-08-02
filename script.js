// Konfigurasi retry dan timeout
const CONFIG = {
    maxRetries: 3,
    retryDelay: 1000, // 1 detik
    fetchTimeout: 10000, // 10 detik
    // Prioritaskan path relatif karena sudah terbukti berhasil
    scheduleUrl: 'https://gvt720.pages.dev/schedule.json',
    fallbackUrls: [
        '/schedule.json',
        './schedule.json'

    ]
};

// Fungsi untuk fetch dengan timeout
function fetchWithTimeout(url, options = {}) {
    const { timeout = CONFIG.fetchTimeout } = options;
    
    return Promise.race([
        fetch(url, {
            ...options,
            cache: 'no-cache', // Hindari caching yang bermasalah
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                ...options.headers
            }
        }),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), timeout)
        )
    ]);
}

// Fungsi untuk delay
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Fungsi untuk memuat jadwal dari JSON dengan retry mechanism
async function loadSchedule() {
    let lastError;
    
    for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
        try {
            console.log(`Memuat jadwal (percobaan ${attempt}/${CONFIG.maxRetries})...`);
            
            // Coba URL utama terlebih dahulu, kemudian fallback URLs
            const possiblePaths = [
                CONFIG.scheduleUrl,
                ...CONFIG.fallbackUrls
            ];
            
            let response;
            let successPath;
            
            // Coba setiap path sampai berhasil
            for (const path of possiblePaths) {
                try {
                    console.log(`Mencoba path: ${path}`);
                    
                    // Gunakan options yang berbeda untuk URL absolut vs relatif
                    const fetchOptions = {
                        method: 'GET',
                        timeout: CONFIG.fetchTimeout,
                        cache: 'no-cache',
                        headers: {
                            'Cache-Control': 'no-cache',
                            'Pragma': 'no-cache'
                        }
                    };
                    
                    // Jika URL absolut, tambahkan mode cors
                    if (path.startsWith('http')) {
                        fetchOptions.mode = 'cors';
                        fetchOptions.credentials = 'omit';
                    }
                    
                    response = await fetchWithTimeout(path, fetchOptions);
                    
                    if (response.ok) {
                        successPath = path;
                        console.log(`Berhasil dengan path: ${path}`);
                        break;
                    } else {
                        console.warn(`Path ${path} responded with status: ${response.status}`);
                    }
                } catch (pathError) {
                    console.warn(`Path ${path} gagal:`, pathError.message);
                    continue;
                }
            }
            
            if (!response || !response.ok) {
                throw new Error(`Semua path gagal. Status: ${response ? response.status : 'Network Error'}`);
            }
            
            // Parse JSON dengan error handling
            const textContent = await response.text();
            
            if (!textContent.trim()) {
                throw new Error('File JSON kosong');
            }
            
            let matches;
            try {
                matches = JSON.parse(textContent);
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                throw new Error('Format JSON tidak valid: ' + parseError.message);
            }
            
            // Validasi struktur data
            if (!Array.isArray(matches)) {
                console.warn('Data bukan array, mencoba mengakses property matches...');
                if (matches && Array.isArray(matches.matches)) {
                    matches = matches.matches;
                } else {
                    throw new Error('Struktur data tidak valid');
                }
            }
            
            await renderMatches(matches);
            
            console.log(`Jadwal berhasil dimuat dengan ${matches.length} pertandingan`);
            
            // Update waktu dan cek pertandingan live
            updateTimes();
            checkLiveMatches();
            
            return; // Berhasil, keluar dari loop retry
            
        } catch (error) {
            lastError = error;
            console.error(`Percobaan ${attempt} gagal:`, error.message);
            
            if (attempt < CONFIG.maxRetries) {
                console.log(`Menunggu ${CONFIG.retryDelay}ms sebelum percobaan berikutnya...`);
                await delay(CONFIG.retryDelay * attempt); // Exponential backoff
            }
        }
    }
    
    // Jika semua percobaan gagal
    console.error('Semua percobaan memuat jadwal gagal:', lastError);
    await handleLoadError(lastError);
}

// Fungsi untuk render pertandingan
async function renderMatches(matches) {
    const container = document.querySelector('.matches-container');
    if (!container) {
        throw new Error('Elemen .matches-container tidak ditemukan');
    }
    
    // Kosongkan container
    container.innerHTML = '';
    
    if (matches.length === 0) {
        updateNoMatchesMessage(true);
        return;
    }
    
    // Tampilkan setiap pertandingan
    matches.forEach((match, index) => {
        try {
            const matchCard = createMatchCard(match, index);
            container.appendChild(matchCard);
        } catch (error) {
            console.error(`Error membuat card untuk pertandingan ${index}:`, error);
        }
    });
}

// Fungsi untuk membuat match card
function createMatchCard(match, index) {
    const matchCard = document.createElement('div');
    matchCard.className = 'match-card';
    matchCard.setAttribute('data-time', match.iso_datetime || '');
    matchCard.onclick = () => toggleChannels(matchCard);
    
    // Validasi data pertandingan
    const safeMatch = {
        time: match.time || 'TBD',
        date: match.date || 'TBD',
        competition: match.competition || 'Unknown Competition',
        teams: match.teams || 'TBD vs TBD',
        channels: Array.isArray(match.channels) ? match.channels : []
    };
    
    // Buat tombol channel
    let buttons = '';
    if (safeMatch.channels.length > 0) {
        safeMatch.channels.forEach((channel, channelIndex) => {
            if (channel && channel.name && channel.url) {
                buttons += `
                    <button class="channel-btn" 
                            data-bs-toggle="modal" 
                            data-bs-target="#streamModal" 
                            data-stream="${escapeHtml(channel.url)}"
                            title="Watch on ${escapeHtml(channel.name)}">
                        ${escapeHtml(channel.name)}
                    </button>
                `;
            }
        });
    }
    
    // Set HTML untuk match card
    matchCard.innerHTML = `
        <div class="match-time">${escapeHtml(safeMatch.time)} | ${escapeHtml(safeMatch.date)}</div>
        <div class="match-competition">${escapeHtml(safeMatch.competition)}</div>
        <div class="match-teams">
            ${escapeHtml(safeMatch.teams)} 
            <span class="live-indicator" style="display: none;">- LIVE</span>
        </div>
        <div class="channels" style="display: none;">
            ${buttons || '<span class="no-channels">No channels available</span>'}
        </div>
    `;
    
    return matchCard;
}

// Fungsi untuk escape HTML (mencegah XSS)
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Fungsi untuk handle error loading
async function handleLoadError(error) {
    updateNoMatchesMessage(true);
    
    // Tampilkan pesan error yang lebih informatif
    const container = document.querySelector('.matches-container');
    if (container) {
        const errorMessage = document.createElement('div');
        errorMessage.className = 'alert alert-danger';
        errorMessage.innerHTML = `
            <h4 class="alert-heading">Failed to Load Schedule</h4>
            <p><strong>Error:</strong> ${escapeHtml(error.message)}</p>
            <p>This might be due to:</p>
            <ul>
                <li>Network connectivity issues</li>
                <li>Server maintenance</li>
                <li>File not found or corrupted</li>
            </ul>
            <div class="mt-3">
                <button class="btn btn-primary me-2" onclick="loadSchedule()">
                    <i class="fas fa-sync-alt"></i> Try Again
                </button>
                <button class="btn btn-secondary" onclick="window.location.reload()">
                    <i class="fas fa-refresh"></i> Refresh Page
                </button>
            </div>
        `;
        
        container.prepend(errorMessage);
    }
    
    // Tampilkan toast notification
    showToast('Failed to load schedule. Please try again.', 'error');
}

// Fungsi untuk mengupdate waktu
function updateTimes() {
    const matches = document.querySelectorAll('.match-card');
    matches.forEach(match => {
        try {
            const utcTime = match.getAttribute('data-time');
            if (utcTime) {
                const userTime = convertTimeToUserTimezone(utcTime);
                const timeElement = match.querySelector('.match-time');
                if (timeElement && userTime) {
                    timeElement.textContent = userTime;
                }
            }
        } catch (error) {
            console.error('Error updating time for match:', error);
        }
    });
}

// Fungsi untuk toggle channel
function toggleChannels(card) {
    try {
        const channels = card.querySelector('.channels');
        if (!channels) return;
        
        const isVisible = channels.style.display === 'flex';
        
        // Sembunyikan semua channels yang lain
        document.querySelectorAll('.channels').forEach(channel => {
            if (channel !== channels) {
                channel.style.display = 'none';
            }
        });
        
        // Toggle channel yang diklik
        channels.style.display = isVisible ? 'none' : 'flex';
    } catch (error) {
        console.error('Error toggling channels:', error);
    }
}

// Fungsi untuk mengecek pertandingan live
function checkLiveMatches() {
    try {
        const now = new Date();
        const matches = document.querySelectorAll('.match-card');
        let visibleMatches = 0;
        
        matches.forEach(match => {
            try {
                const matchTimeStr = match.getAttribute('data-time');
                if (!matchTimeStr) {
                    match.style.display = '';
                    visibleMatches++;
                    return;
                }
                
                const matchTime = new Date(matchTimeStr);
                if (isNaN(matchTime.getTime())) {
                    console.warn('Invalid date format:', matchTimeStr);
                    match.style.display = '';
                    visibleMatches++;
                    return;
                }
                
                const endTime = new Date(matchTime.getTime() + (3 * 60 * 60 * 1000)); // 3 jam setelah pertandingan
                const liveIndicator = match.querySelector('.live-indicator');
                
                if (now >= matchTime && now <= endTime) {
                    match.style.display = '';
                    if (liveIndicator) liveIndicator.style.display = 'inline';
                    match.classList.add('live-match');
                    visibleMatches++;
                } else if (now > endTime) {
                    match.style.display = 'none';
                    if (liveIndicator) liveIndicator.style.display = 'none';
                    match.classList.remove('live-match');
                } else {
                    match.style.display = '';
                    if (liveIndicator) liveIndicator.style.display = 'none';
                    match.classList.remove('live-match');
                    visibleMatches++;
                }
            } catch (error) {
                console.error('Error checking match status:', error);
                // Tampilkan pertandingan jika ada error
                match.style.display = '';
                visibleMatches++;
            }
        });
        
        // Tampilkan pesan jika tidak ada pertandingan
        updateNoMatchesMessage(visibleMatches === 0);
    } catch (error) {
        console.error('Error in checkLiveMatches:', error);
    }
}

// Fungsi untuk memperbarui pesan tidak ada pertandingan
function updateNoMatchesMessage(show) {
    try {
        const noMatchesMessage = document.getElementById('no-matches-message');
        const container = document.querySelector('.matches-container');
        
        if (show && !noMatchesMessage && container) {
            container.insertAdjacentHTML('beforeend', `
                <div class="alert alert-info" id="no-matches-message">
                    <h4 class="alert-heading">No matches scheduled at the moment</h4>
                    <p>Please check back later or refresh the page.</p>
                    <div class="mt-2">
                        <button class="btn btn-primary me-2" onclick="loadSchedule()">
                            <i class="fas fa-sync-alt"></i> Reload Schedule
                        </button>
                        <button class="btn btn-secondary" onclick="window.location.reload()">
                            <i class="fas fa-refresh"></i> Refresh Page
                        </button>
                    </div>
                </div>
            `);
        } else if (!show && noMatchesMessage) {
            noMatchesMessage.remove();
        }
    } catch (error) {
        console.error('Error updating no matches message:', error);
    }
}

// Fungsi untuk mengkonversi waktu ke timezone pengguna
function convertTimeToUserTimezone(utcTime) {
    try {
        const date = new Date(utcTime);
        
        if (isNaN(date.getTime())) {
            console.warn('Invalid date:', utcTime);
            return 'Invalid Date';
        }
        
        const options = {
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour12: false
        };
        
        const formatter = new Intl.DateTimeFormat('en-US', options);
        const parts = formatter.formatToParts(date);
        
        const time = parts.find(part => part.type === 'hour')?.value + ':' + 
                     parts.find(part => part.type === 'minute')?.value;
        const dateStr = parts.find(part => part.type === 'day')?.value + ' ' +
                        parts.find(part => part.type === 'month')?.value + ' ' +
                        parts.find(part => part.type === 'year')?.value;
        
        return `${time} | ${dateStr}`;
    } catch (error) {
        console.error('Error converting time:', error);
        return 'Time Error';
    }
}

// Inisialisasi modal video
function initVideoModal() {
    try {
        const modal = document.getElementById('streamModal');
        const iframe = document.getElementById('streamFrame');
        
        if (modal && iframe) {
            modal.addEventListener('show.bs.modal', function(event) {
                try {
                    const button = event.relatedTarget;
                    const streamUrl = button?.getAttribute('data-stream');
                    if (streamUrl) {
                        iframe.src = streamUrl;
                    }
                } catch (error) {
                    console.error('Error showing modal:', error);
                }
            });
            
            modal.addEventListener('hidden.bs.modal', function() {
                try {
                    iframe.src = '';
                } catch (error) {
                    console.error('Error hiding modal:', error);
                }
            });
        }
    } catch (error) {
        console.error('Error initializing video modal:', error);
    }
}

// Inisialisasi tombol scroll dan refresh
function initFloatingButtons() {
    try {
        const scrollTopBtn = document.getElementById('scroll-top-btn');
        const refreshBtn = document.getElementById('refresh-btn');
        
        if (scrollTopBtn) {
            scrollTopBtn.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                window.location.reload();
            });
        }
        
        // Tampilkan/sembunyikan tombol saat scroll
        window.addEventListener('scroll', () => {
            try {
                const shouldShow = window.scrollY > 100;
                if (scrollTopBtn) {
                    scrollTopBtn.classList.toggle('visible', shouldShow);
                }
                if (refreshBtn) {
                    refreshBtn.classList.toggle('visible', shouldShow);
                }
            } catch (error) {
                console.error('Error handling scroll:', error);
            }
        });
    } catch (error) {
        console.error('Error initializing floating buttons:', error);
    }
}

// Fungsi untuk menyalin alamat Bitcoin ke clipboard
function copyBitcoinAddress() {
    try {
        const bitcoinAddress = document.getElementById('bitcoinAddress');
        if (!bitcoinAddress) {
            showToast('Bitcoin address element not found', 'error');
            return;
        }
        
        const textToCopy = bitcoinAddress.textContent?.trim();
        if (!textToCopy) {
            showToast('No Bitcoin address to copy', 'error');
            return;
        }
        
        navigator.clipboard.writeText(textToCopy).then(() => {
            // Ubah teks tombol sementara
            const copyBtn = document.querySelector('.copy-btn');
            if (copyBtn) {
                const originalText = copyBtn.textContent;
                copyBtn.textContent = 'Copied!';
                
                // Kembalikan teks tombol setelah 2 detik
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                }, 2000);
            }
            
            // Tampilkan notifikasi
            showToast('Bitcoin address copied to clipboard!');
        }).catch(err => {
            console.error('Gagal menyalin teks: ', err);
            showToast('Failed to copy address. Please try again.', 'error');
        });
    } catch (error) {
        console.error('Error copying Bitcoin address:', error);
        showToast('Failed to copy address', 'error');
    }
}

// Fungsi untuk menampilkan notifikasi
function showToast(message, type = 'success') {
    try {
        // Cek apakah toast container sudah ada
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            toastContainer.style.zIndex = '9999';
            document.body.appendChild(toastContainer);
        }
        
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type === 'success' ? 'success' : 'danger'} border-0`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${escapeHtml(message)}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        // Inisialisasi dan tampilkan toast
        if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
            const bsToast = new bootstrap.Toast(toast, {
                autohide: true,
                delay: 3000
            });
            
            bsToast.show();
            
            // Hapus toast dari DOM setelah selesai
            toast.addEventListener('hidden.bs.toast', function () {
                toast.remove();
            });
        } else {
            // Fallback jika Bootstrap tidak tersedia
            toast.style.display = 'block';
            setTimeout(() => {
                toast.remove();
            }, 3000);
        }
    } catch (error) {
        console.error('Error showing toast:', error);
    }
}

// Fungsi untuk inisialisasi interval pengecekan live
function initLiveCheckInterval() {
    try {
        // Jalankan pengecekan setiap 30 detik (bukan 1 detik untuk performa yang lebih baik)
        setInterval(checkLiveMatches, 30000);
        
        // Tambahkan event listener untuk visibility change
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                checkLiveMatches();
            }
        });
        
        // Jalankan pengecekan saat online/offline
        window.addEventListener('online', () => {
            console.log('Connection restored, reloading schedule...');
            loadSchedule();
        });
        
        window.addEventListener('offline', () => {
            console.log('Connection lost');
            showToast('Connection lost. Schedule may not be up to date.', 'error');
        });
    } catch (error) {
        console.error('Error initializing live check interval:', error);
    }
}

// Inisialisasi saat halaman dimuat
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing application...');
    
    try {
        // Load jadwal
        loadSchedule();
        
        // Inisialisasi komponen lain
        initVideoModal();
        initFloatingButtons();
        
        // Inisialisasi interval pengecekan live
        initLiveCheckInterval();
        
        // Atur interval untuk update waktu setiap menit
        setInterval(updateTimes, 60000);
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Error during initialization:', error);
        showToast('Application initialization failed', 'error');
    }
});

// Nonaktifkan klik kanan
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});

// Expose functions to global scope for onclick handlers
window.loadSchedule = loadSchedule;
window.toggleChannels = toggleChannels;
window.copyBitcoinAddress = copyBitcoinAddress;
