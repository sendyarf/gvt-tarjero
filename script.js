document.addEventListener("DOMContentLoaded", function () {
    // Simpan data jadwal saat ini untuk perbandingan
    let currentMatches = [];

    // Initialize i18next with http backend
    i18next
        .use(i18nextHttpBackend)
        .init({
            lng: 'en',
            fallbackLng: 'en',
            backend: {
                loadPath: 'https://govoetlive.pages.dev/translations/{{lng}}.json'
            }
        }, function(err, t) {
            if (err) {
                console.error('i18next initialization failed:', err);
                loadMatches();
            } else {
                loadMatches();
            }
        });

    const modal = document.getElementById("streamModal");
    const iframe = document.getElementById("streamFrame");
    const loadingSpinner = document.getElementById("loadingSpinner");

    modal.addEventListener("show.bs.modal", function (event) {
        const button = event.relatedTarget;
        const streamUrl = button.getAttribute("data-stream");
        loadingSpinner.style.display = "flex";
        modal.querySelector(".modal-body").setAttribute("aria-busy", "true");
        iframe.src = streamUrl;
    });

    modal.addEventListener("hidden.bs.modal", function () {
        iframe.src = "";
        loadingSpinner.style.display = "none";
        modal.querySelector(".modal-body").removeAttribute("aria-busy");
    });

    iframe.addEventListener("load", function () {
        loadingSpinner.style.display = "none";
        modal.querySelector(".modal-body").removeAttribute("aria-busy");
    });

    iframe.addEventListener("error", function () {
        loadingSpinner.innerHTML = "<p>Error loading stream. Please try another channel.</p>";
        loadingSpinner.style.display = "flex";
    });

    function loadMatches() {
        console.log('loadMatches called');
        fetch('https://govoetlive.pages.dev/schedule.json')
            .then(response => {
                console.log('Fetch response status:', response.status);
                if (!response.ok) throw new Error('Network response was not ok');
                return response.json();
            })
            .then(data => {
                console.log('Fetched schedule data:', data);
                if (modal && modal.classList.contains('show')) {
                    console.log('Modal streaming aktif, tunda pembaruan jadwal');
                    return;
                }

                const matchesContainer = document.querySelector('.matches-container');
                const noMatchesMessage = document.getElementById('no-matches-message');
                if (noMatchesMessage) {
                    noMatchesMessage.remove();
                    console.log('Removed no-matches-message');
                }

                currentMatches = data.matches;
                matchesContainer.innerHTML = '';

                if (data.matches.length === 0) {
                    console.log('No matches in data, showing no matches message');
                    showNoMatchesMessage();
                    return;
                }

                data.matches.forEach(match => {
                    const matchCard = document.createElement('div');
                    matchCard.className = 'match-card';
                    matchCard.setAttribute('data-time', match.datetime);
                    matchCard.onclick = function() { toggleChannels(this); };

                    const liveIndicator = document.createElement('span');
                    liveIndicator.className = 'live-indicator';
                    liveIndicator.textContent = 'LIVE';
                    matchCard.appendChild(liveIndicator);

                    const matchTime = document.createElement('div');
                    matchTime.className = 'match-time';
                    matchCard.appendChild(matchTime);

                    const matchCompetition = document.createElement('div');
                    matchCompetition.className = 'match-competition';
                    matchCompetition.textContent = i18next.t(`competitions.${match.competition}`, { defaultValue: match.competition });
                    matchCard.appendChild(matchCompetition);

                    const matchTeams = document.createElement('div');
                    matchTeams.className = 'match-teams';
                    // Pisahkan tim home dan away
                    const [homeTeam, awayTeam] = match.teams.split(' - ').map(team => team.trim());
                    console.log('Translating teams:', { homeTeam, awayTeam });
                    // Terjemahkan masing-masing tim secara individu
                    const translatedHomeTeam = i18next.t(`teams.${homeTeam}`, { defaultValue: homeTeam });
                    const translatedAwayTeam = i18next.t(`teams.${awayTeam}`, { defaultValue: awayTeam });
                    // Gabungkan kembali dengan format "Home - Away"
                    matchTeams.textContent = `${translatedHomeTeam} - ${translatedAwayTeam}`;
                    matchCard.appendChild(matchTeams);

                    const channelsDiv = document.createElement('div');
                    channelsDiv.className = 'channels';
                    match.channels.forEach(channel => {
                        const channelBtn = document.createElement('button');
                        channelBtn.className = 'channel-btn';
                        channelBtn.setAttribute('data-bs-target', '#streamModal');
                        channelBtn.setAttribute('data-bs-toggle', 'modal');
                        channelBtn.setAttribute('data-stream', channel.url);
                        channelBtn.textContent = channel.name;
                        channelsDiv.appendChild(channelBtn);
                    });
                    matchCard.appendChild(channelsDiv);

                    matchesContainer.appendChild(matchCard);
                });

                updateTimes();
                checkLiveMatches();
                document.querySelectorAll('.match-card').forEach(card => {
                    card.classList.add('fade-in');
                });
                console.log('Matches updated, total cards:', document.querySelectorAll('.match-card').length);
            })
            .catch(error => {
                console.error('Error loading schedule:', error);
                showNoMatchesMessage();
            });
    }

    let pollingInterval = setInterval(loadMatches, 60000);

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            clearInterval(pollingInterval);
            console.log('Polling dihentikan: Tab tidak aktif');
        } else {
            pollingInterval = setInterval(loadMatches, 60000);
            console.log('Polling dimulai: Tab aktif');
        }
    });

    function showNoMatchesMessage() {
        console.log('Showing no matches message');
        const matchesContainer = document.querySelector('.matches-container');
        const noMatchesMessage = document.getElementById('no-matches-message');
        if (!noMatchesMessage) {
            const messageDiv = document.createElement('div');
            messageDiv.id = 'no-matches-message';
            messageDiv.className = 'no-matches-message';
            messageDiv.innerHTML = `
                <div class="alert alert-info" role="alert">
                    <h4 class="alert-heading">No matches available</h4>
                    <p>There are currently no scheduled matches. Please check back later or refresh the page.</p>
                    <button class="btn btn-primary mt-2 refresh-schedule-btn" onclick="loadMatches()">Refresh Schedule</button>
                </div>
            `;
            matchesContainer.appendChild(messageDiv);

            const refreshButton = document.querySelector('.refresh-schedule-btn');
            if (refreshButton) {
                refreshButton.addEventListener('click', () => {
                    console.log('Refresh Schedule button clicked');
                    loadMatches();
                });
            } else {
                console.warn('Refresh Schedule button not found');
            }
        }
    }

    function copyBitcoinAddress() {
        const bitcoinAddress = "bc1qdu7csmmz7nyjxjsr87tymhd5x29y66gg4xff0t";
        console.log('Attempting to copy Bitcoin address:', bitcoinAddress);
        if (!navigator.clipboard) {
            console.warn('Clipboard API not supported, trying fallback');
            fallbackCopyText(bitcoinAddress);
            return;
        }
        if (!window.isSecureContext) {
            console.warn('Non-secure context detected, trying fallback');
            fallbackCopyText(bitcoinAddress);
            return;
        }
        navigator.clipboard.writeText(bitcoinAddress)
            .then(() => {
                console.log('Bitcoin address copied successfully');
                showNotification('Bitcoin address copied to clipboard!', 'success');
            })
            .catch(err => {
                console.error('Failed to copy using navigator.clipboard:', err);
                fallbackCopyText(bitcoinAddress);
            });
    }

    function fallbackCopyText(text) {
        console.log('Using fallback copy method for:', text);
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.top = '-9999px';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            if (successful) {
                console.log('Fallback copy successful');
                showNotification('Bitcoin address copied to clipboard!', 'success');
            } else {
                console.error('Fallback copy failed');
                showNotification('Failed to copy Bitcoin address. Please copy manually: ' + text, 'error');
            }
        } catch (err) {
            console.error('Fallback copy error:', err);
            document.body.removeChild(textArea);
            showNotification('Failed to copy Bitcoin address. Please copy manually: ' + text, 'error');
        }
    }

    function showNotification(message, type) {
        console.log('Showing notification:', message, type);
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notif => notif.remove());
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.right = '20px';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '5px';
        notification.style.color = '#fff';
        notification.style.backgroundColor = type === 'success' ? '#28a745' : '#dc3545';
        notification.style.zIndex = '1000';
        notification.style.maxWidth = '300px';
        notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.transition = 'opacity 0.5s';
            notification.style.opacity = '0';
            setTimeout(() => {
                notification.remove();
            }, 500);
        }, 3000);
    }

    const copyButtons = document.querySelectorAll('.copy-btn');
    if (copyButtons.length > 0) {
        console.log('Found', copyButtons.length, 'copy buttons with class "copy-btn"');
        copyButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                console.log('Copy button clicked:', e.target);
                copyBitcoinAddress();
            });
        });
    } else {
        console.warn('No buttons with class "copy-btn" found in the DOM');
    }

    function toggleChannels(card) {
        const channels = card.querySelector(".channels");
        const isVisible = channels.style.display === "flex";
        document.querySelectorAll(".channels").forEach((channel) => {
            if (channel !== channels) {
                channel.style.display = "none";
            }
        });
        channels.style.display = isVisible ? "none" : "flex";
    }

    function convertTimeToUserTimezone(utcTime) {
        const date = new Date(utcTime);
        const options = {
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour12: false,
        };
        const formatter = new Intl.DateTimeFormat("en-US", options);
        const parts = formatter.formatToParts(date);
        const time = parts.find((part) => part.type === "hour").value + ":" + 
                     parts.find((part) => part.type === "minute").value;
        const dateStr = parts.find((part) => part.type === "day").value + " " + 
                        parts.find((part) => part.type === "month").value + " " + 
                        parts.find((part) => part.type === "year").value;
        return `${time} | ${dateStr}`;
    }

    function updateTimes() {
        const matches = document.querySelectorAll(".match-card");
        matches.forEach((match) => {
            const utcTime = match.getAttribute("data-time");
            const userTime = convertTimeToUserTimezone(utcTime);
            const timeElement = match.querySelector(".match-time");
            timeElement.textContent = userTime;
        });
    }

    function checkLiveMatches() {
        if (modal.classList.contains('show')) {
            console.log('Modal streaming aktif, tunda pembaruan status LIVE');
            return;
        }
        const matches = document.querySelectorAll(".match-card");
        const now = new Date();
        let visibleMatches = 0;
        
        matches.forEach((match) => {
            const matchTime = new Date(match.getAttribute("data-time"));
            const endTime = new Date(matchTime.getTime() + 3.5 * 60 * 60 * 1000);
            const liveIndicator = match.querySelector(".live-indicator");
            if (now >= matchTime && now <= endTime) {
                match.style.display = "";
                liveIndicator.style.display = "inline-block";
                visibleMatches++;
            } else if (now > endTime) {
                match.style.display = "none";
            } else {
                match.style.display = "";
                liveIndicator.style.display = "none";
                visibleMatches++;
            }
        });

        const noMatchesMessage = document.getElementById('no-matches-message');
        if (visibleMatches === 0) {
            showNoMatchesMessage();
        } else if (noMatchesMessage) {
            noMatchesMessage.remove();
        }
    }

    function initializeFloatingButtons() {
        const scrollTopBtn = document.getElementById("scroll-top-btn");
        const refreshBtn = document.getElementById("refresh-btn");

        if (scrollTopBtn && refreshBtn) {
            scrollTopBtn.addEventListener("click", () => {
                window.scrollTo({ top: 0, behavior: "smooth" });
            });

            refreshBtn.addEventListener("click", () => {
                console.log('Floating Refresh button clicked');
                loadMatches();
            });
        }
    }

    document.addEventListener("contextmenu", function (e) {
        e.preventDefault();
    });

    setInterval(checkLiveMatches, 10000);

    console.log('copyBitcoinAddress function defined:', typeof copyBitcoinAddress === 'function');
    console.log('loadMatches function defined:', typeof loadMatches === 'function');
});
