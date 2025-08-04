document.addEventListener("DOMContentLoaded", function () {
    // Initialize i18next with http backend
    i18next
        .use(i18nextHttpBackend)
        .init({
            lng: 'en',
            fallbackLng: 'en',
            backend: {
                loadPath: 'translations/{{lng}}.json'
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
        fetch('schedule.json')
            .then(response => response.json())
            .then(data => {
                const matchesContainer = document.querySelector('.matches-container');
                matchesContainer.innerHTML = '';

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
                    matchTeams.textContent = i18next.t(`teams.${match.teams}`, { defaultValue: match.teams });
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
            })
            .catch(error => {
                console.error('Error loading schedule:', error);
                showNoMatchesMessage();
            });
    }

    function showNoMatchesMessage() {
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
                    <button class="btn btn-primary mt-2" onclick="window.location.reload()">
                        Refresh Page
                    </button>
                </div>
            `;
            matchesContainer.appendChild(messageDiv);
        }
    }

    function copyBitcoinAddress() {
        const bitcoinAddress = "bc1qdu7csmmz7nyjxjsr87tymhd5x29y66gg4xff0t";
        navigator.clipboard.writeText(bitcoinAddress).then(() => {
            alert("Bitcoin address copied to clipboard!");
        }).catch((err) => {
            console.error("Failed to copy text: ", err);
        });
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
                window.location.reload();
            });

            window.addEventListener("scroll", () => {
                if (window.scrollY > 100) {
                    scrollTopBtn.classList.add("visible");
                    refreshBtn.classList.add("visible");
                } else {
                    scrollTopBtn.classList.remove("visible");
                    refreshBtn.classList.remove("visible");
                }
            });
        }
    }

    document.addEventListener("contextmenu", function (e) {
        e.preventDefault();
    });
});