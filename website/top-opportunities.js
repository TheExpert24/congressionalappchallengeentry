const container = document.getElementById("topOpportunities");
const podium = document.getElementById("podium");

Promise.all([
    fetch("all_opportunities.json").then(response => response.json()),
    fetch("/api/top-opportunities").then(response => response.json())
])
    .then(([opportunities, clickData]) => {
        const clickMap = new Map(
            clickData.map(item => [item.slug, item.count])
        );

        const sorted = opportunities
            .filter(opportunity => clickMap.has(opportunity.slug))
            .sort((a, b) => {
                return clickMap.get(b.slug) - clickMap.get(a.slug);
            });

        container.innerHTML = "";
        podium.innerHTML = "";

        if (sorted.length === 0) {
            container.innerHTML = "<p class='empty-state'>No clicks have been recorded yet.</p>";
            return;
        }

        let podiumRank = 1;

        const ranked = sorted.map((opportunity, index) => {
            if (index > 0) {
                const previous = sorted[index - 1];

                if (clickMap.get(previous.slug) !== clickMap.get(opportunity.slug)) {
                    podiumRank++;
                }
            }

            return {
                opportunity,
                rank: podiumRank
            };
        });

        const podiumItems = ranked.slice(0, 3);

        const podiumOrder = [
            { index: 1 },
            { index: 0 },
            { index: 2 }
        ];

        podiumOrder.forEach(item => {
            const rankedItem = podiumItems[item.index];

            if (!rankedItem) {
                return;
            }

            const opportunity = rankedItem.opportunity;
            const rank = rankedItem.rank;

            const card = document.createElement("div");
            card.className = "podium-card";

            const medal = document.createElement("div");
            medal.className = "podium-medal";

            if (rank === 1) {
                medal.innerHTML = `
                    <svg viewBox="0 0 64 64" aria-label="Gold medal">
                        <path d="M20 4h10l6 18H26z"></path>
                        <path d="M34 4h10l-6 18H28z"></path>
                        <circle cx="32" cy="40" r="17"></circle>
                        <circle cx="32" cy="40" r="11"></circle>
                        <path d="M32 32l2.5 5 5.5.8-4 4 1 5.5-5-2.6-5 2.6 1-5.5-4-4 5.5-.8z"></path>
                    </svg>
                `;
                medal.classList.add("gold");
            } else if (rank === 2) {
                medal.innerHTML = `
                    <svg viewBox="0 0 64 64" aria-label="Silver medal">
                        <path d="M20 4h10l6 18H26z"></path>
                        <path d="M34 4h10l-6 18H28z"></path>
                        <circle cx="32" cy="40" r="17"></circle>
                        <circle cx="32" cy="40" r="11"></circle>
                        <path d="M32 32l2.5 5 5.5.8-4 4 1 5.5-5-2.6-5 2.6 1-5.5-4-4 5.5-.8z"></path>
                    </svg>
                `;
                medal.classList.add("silver");
            } else {
                medal.innerHTML = `
                    <svg viewBox="0 0 64 64" aria-label="Bronze medal">
                        <path d="M20 4h10l6 18H26z"></path>
                        <path d="M34 4h10l-6 18H28z"></path>
                        <circle cx="32" cy="40" r="17"></circle>
                        <circle cx="32" cy="40" r="11"></circle>
                        <path d="M32 32l2.5 5 5.5.8-4 4 1 5.5-5-2.6-5 2.6 1-5.5-4-4 5.5-.8z"></path>
                    </svg>
                `;
                medal.classList.add("bronze");
            }

            card.appendChild(medal);

            const place = document.createElement("div");
            place.className = "podium-place";
            place.textContent = "#" + rank;
            card.appendChild(place);

            const name = document.createElement("div");
            name.className = "podium-name";
            name.textContent = opportunity.name || "Unnamed Opportunity";
            card.appendChild(name);

            const clicks = document.createElement("div");
            clicks.className = "podium-clicks";
            clicks.textContent = clickMap.get(opportunity.slug) + " clicks";
            card.appendChild(clicks);

            if (opportunity.official_url) {
                const link = document.createElement("a");
                link.href = opportunity.official_url;
                link.target = "_blank";
                link.rel = "noopener";
                link.textContent = "Visit";
                card.appendChild(link);
            }

            podium.appendChild(card);
        });
        let rank = 1;

        sorted.forEach((opportunity, index) => {
            if (index > 0) {
                const previous = sorted[index - 1];

                if (clickMap.get(previous.slug) !== clickMap.get(opportunity.slug)) {
                    rank++;
                }
            }

            const card = document.createElement("div");
            card.className = "opportunity-card";

            const rankElement = document.createElement("div");
            rankElement.className = "opportunity-rank";
            rankElement.textContent = "#" + rank;
            card.appendChild(rankElement);

            Object.entries(opportunity).forEach(([key, value]) => {
                if (key === "official_url" || key === "source_url" || key === "slug") {
                    return;
                }

                if (
                    value === null ||
                    value === undefined ||
                    value === "" ||
                    (Array.isArray(value) && value.length === 0)
                ) {
                    return;
                }

                const paragraph = document.createElement("p");
                const label = document.createElement("strong");

                label.textContent =
                    key.charAt(0).toUpperCase() +
                    key.slice(1).replaceAll("_", " ") +
                    ": ";

                paragraph.appendChild(label);

                if (Array.isArray(value)) {
                    paragraph.appendChild(
                        document.createTextNode(value.join(", "))
                    );
                } else {
                    paragraph.appendChild(
                        document.createTextNode(String(value))
                    );
                }

                card.appendChild(paragraph);
            });

            const clickCount = document.createElement("p");
            clickCount.innerHTML =
                "<strong>Official Website Clicks:</strong> " +
                clickMap.get(opportunity.slug);
            card.appendChild(clickCount);

            const links = document.createElement("div");
            links.className = "card-links";

            if (opportunity.official_url) {
                const officialLink = document.createElement("a");
                officialLink.href = opportunity.official_url;
                officialLink.target = "_blank";
                officialLink.rel = "noopener";
                officialLink.textContent = "Official Website";
                links.appendChild(officialLink);
            }

            if (opportunity.source_url) {
                const sourceLink = document.createElement("a");
                sourceLink.href = opportunity.source_url;
                sourceLink.target = "_blank";
                sourceLink.rel = "noopener";
                links.appendChild(sourceLink);
            }

            if (links.children.length > 0) {
                card.appendChild(links);
            }

            container.appendChild(card);
        });
    })
    .catch(error => {
        console.error("error loading top opportunities:", error);
        container.innerHTML = "<p class='empty-state'>Unable to load top opportunities.</p>";
    });