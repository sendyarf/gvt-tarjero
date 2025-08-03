
        document.addEventListener("DOMContentLoaded", function () {
            const modal = document.getElementById("streamModal");
            const iframe = document.getElementById("streamFrame");

            modal.addEventListener("show.bs.modal", function (event) {
                const button = event.relatedTarget;
                const streamUrl = button.getAttribute("data-stream");
                iframe.src = streamUrl;
            });

            modal.addEventListener("hidden.bs.modal", function () {
                iframe.src = "";
            });
        });

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
                    liveIndicator.style.display = "inline";
                    visibleMatches++;
                } else if (now > endTime) {
                    match.style.display = "none";
                } else {
                    match.style.display = "";
                    liveIndicator.style.display = "none";
                    visibleMatches++;
                }
            });

            // Show no matches message if no matches are visible
            const noMatchesMessage = document.getElementById('no-matches-message');
            if (visibleMatches === 0) {
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
                    const matchesContainer = document.querySelector('.matches-container');
                    if (matchesContainer) {
                        matchesContainer.appendChild(messageDiv);
                    }
                }
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

        // Disable right click
        document.addEventListener("contextmenu", function (e) {
            e.preventDefault();
        });

        // Initialize on page load
        window.onload = function () {
            updateTimes();
            checkLiveMatches();
            initializeFloatingButtons();
            setInterval(checkLiveMatches, 60000);
        };
