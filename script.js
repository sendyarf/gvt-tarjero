// Fungsi untuk memuat jadwal dari JSON
async function loadSchedule() {
    try {
        const response = await fetch('schedule.json');
        if (!response.ok) throw new Error('Gagal memuat jadwal');
        const matches = await response.json();
        
        const container = document.querySelector('.matches-container');
        if (!container) return;
        
        // Kosongkan container
        container.innerHTML = '';
        
        // Tampilkan setiap pertandingan
        matches.forEach(match => {
            const matchCard = document.createElement('div');
            matchCard.className = 'match-card';
            matchCard.setAttribute('data-time', match.iso_datetime);
            matchCard.onclick = () => toggleChannels(matchCard);
            
            // Buat tombol channel
            let buttons = '';
            match.channels.forEach(channel => {
                buttons += `
                    <button class="channel-btn" 
                            data-bs-toggle="modal" 
                            data-bs-target="#streamModal" 
                            data-stream="${channel.url}">
                        ${channel.name}
                    </button>
                `;
            });
            
            // Set HTML untuk match card
            matchCard.innerHTML = `
                <div class="match-time">${match.time} | ${match.date}</div>
                <div class="match-competition">${match.competition}</div>
                <div class="match-teams">
                    ${match.teams} 
                    <span class="live-indicator" style="display: none;">- LIVE</span>
                </div>
                <div class="channels" style="display: none;">
                    ${buttons}
                </div>
            `;
            
            container.appendChild(matchCard);
        });
        
        // Update waktu dan cek pertandingan live
        updateTimes();
        checkLiveMatches();
        
    } catch (error) {
        console.error('Error:', error);
        const container = document.querySelector('.matches-container');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-warning">
                    Gagal memuat jadwal. Silakan refresh halaman atau coba beberapa saat lagi.
                </div>
            `;
        }
    }
}

// Fungsi untuk mengupdate waktu
function updateTimes() {
    const matches = document.querySelectorAll('.match-card');
    matches.forEach(match => {
        const utcTime = match.getAttribute('data-time');
        const userTime = convertTimeToUserTimezone(utcTime);
        const timeElement = match.querySelector('.match-time');
        if (timeElement) {
            timeElement.textContent = userTime;
        }
    });}

// Fungsi untuk toggle channel
function toggleChannels(card) {
    const channels = card.querySelector('.channels');
    const isVisible = channels.style.display === 'flex';
    
    // Sembunyikan semua channels yang lain
    document.querySelectorAll('.channels').forEach(channel => {
        if (channel !== channels) {
            channel.style.display = 'none';
        }
    });
    
    // Toggle channel yang diklik
    channels.style.display = isVisible ? 'none' : 'flex';
}

// Fungsi untuk mengecek pertandingan live
function checkLiveMatches() {
    const now = new Date();
    const matches = document.querySelectorAll('.match-card');
    let visibleMatches = 0;
    
    matches.forEach(match => {
        const matchTime = new Date(match.getAttribute('data-time'));
        const endTime = new Date(matchTime.getTime() + (3 * 60 * 60 * 1000)); // 3 jam setelah pertandingan
        const liveIndicator = match.querySelector('.live-indicator');
        
        if (now >= matchTime && now <= endTime) {
            match.style.display = '';
            liveIndicator.style.display = 'inline';
            visibleMatches++;
        } else if (now > endTime) {
            match.style.display = 'none';
        } else {
            match.style.display = '';
            liveIndicator.style.display = 'none';
            visibleMatches++;
        }
    });
    
    // Tampilkan pesan jika tidak ada pertandingan
    const noMatchesMessage = document.getElementById('no-matches-message');
    if (visibleMatches === 0) {
        if (!noMatchesMessage) {
            const container = document.querySelector('.matches-container');
            if (container) {
                container.innerHTML = `
                    <div class="alert alert-info" id="no-matches-message">
                        <h4 class="alert-heading">No matches available</h4>
                        <p>There are currently no scheduled matches. Please check back later or refresh the page.</p>
                            <button class="btn btn-primary mt-2" onclick="window.location.reload()">
                                Refresh Page
                            </button>
                    </div>
                `;
            }
        }
    } else if (noMatchesMessage) {
        noMatchesMessage.remove();
    }
}

// Fungsi untuk mengkonversi waktu ke timezone pengguna
function convertTimeToUserTimezone(utcTime) {
    const date = new Date(utcTime);
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
    
    const time = parts.find(part => part.type === 'hour').value + ':' + 
                 parts.find(part => part.type === 'minute').value;
    const dateStr = parts.find(part => part.type === 'day').value + ' ' +
                    parts.find(part => part.type === 'month').value + ' ' +
                    parts.find(part => part.type === 'year').value;
    
    return `${time} | ${dateStr}`;
}

// Inisialisasi modal video
function initVideoModal() {
    const modal = document.getElementById('streamModal');
    const iframe = document.getElementById('streamFrame');
    
    if (modal && iframe) {
        modal.addEventListener('show.bs.modal', function(event) {
            const button = event.relatedTarget;
            const streamUrl = button.getAttribute('data-stream');
            if (streamUrl) {
                iframe.src = streamUrl;
            }
        });
        
        modal.addEventListener('hidden.bs.modal', function() {
            iframe.src = '';
        });
    }
}

// Inisialisasi tombol scroll dan refresh
function initFloatingButtons() {
    const scrollTopBtn = document.getElementById('scroll-top-btn');
    const refreshBtn = document.getElementById('refresh-btn');
    
    if (scrollTopBtn && refreshBtn) {
        // Scroll to top
        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        
        // Refresh page
        refreshBtn.addEventListener('click', () => {
            window.location.reload();
        });
        
        // Tampilkan/sembunyikan tombol saat scroll
        window.addEventListener('scroll', () => {
            if (window.scrollY > 100) {
                scrollTopBtn.classList.add('visible');
                refreshBtn.classList.add('visible');
            } else {
                scrollTopBtn.classList.remove('visible');
                refreshBtn.classList.remove('visible');
            }
        });
    }
}

// Fungsi untuk menyalin alamat Bitcoin ke clipboard
function copyBitcoinAddress() {
    const bitcoinAddress = document.getElementById('bitcoinAddress');
    const textToCopy = bitcoinAddress.textContent.trim();
    
    navigator.clipboard.writeText(textToCopy).then(() => {
        // Ubah teks tombol sementara
        const copyBtn = document.querySelector('.copy-btn');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        
        // Kembalikan teks tombol setelah 2 detik
        setTimeout(() => {
            copyBtn.textContent = originalText;
        }, 2000);
        
        // Tampilkan notifikasi
        showToast('Bitcoin address copied to clipboard!');
    }).catch(err => {
        console.error('Gagal menyalin teks: ', err);
        showToast('Gagal menyalin alamat', 'error');
    });
}

// Fungsi untuk menampilkan notifikasi
function showToast(message, type = 'success') {
    // Cek apakah toast container sudah ada
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
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
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Inisialisasi dan tampilkan toast
    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: 3000
    });
    
    bsToast.show();
    
    // Hapus toast dari DOM setelah selesai
    toast.addEventListener('hidden.bs.toast', function () {
        toast.remove();
    });
}

// Inisialisasi saat halaman dimuat
document.addEventListener('DOMContentLoaded', function() {
    // Load jadwal
    loadSchedule();
    
    // Inisialisasi komponen
    initVideoModal();
    initFloatingButtons();
    
    // Perbarui jadwal setiap menit
    setInterval(() => {
        checkLiveMatches();
    }, 60000);
});

// Nonaktifkan klik kanan
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});
