const container = document.getElementById("topOpportunities");
const podium = document.getElementById("podium");

Promise.all([
    fetch("all_opportunities.json").then(response => {
        if (!response.ok) {
            throw new Error("Could not load all_opportunities.json");
        }
        return response.json();
    }),
    fetch("/api/top-opportunities").then(response => {
        if (!response.ok) {
            throw new Error("Could not load top opportunities");
        }
        return response.json();
    })
])
.then(([opportunities, clickData]) => {
    const clickMap = new Map(
        clickData.map(item => [item.slug, item.count])
    );

    const sorted = opportunities
        .filter(opportunity => clickMap.has(opportunity.slug))
        .sort((a, b) => clickMap.get(b.slug) - clickMap.get(a.slug));

    container.innerHTML = "";
    podium.innerHTML = "";

    if (sorted.length === 0) {
        container.innerHTML = "<p class='empty-state'>No clicks have been recorded yet.</p>";
        return;
    }

    const ranked = [];
    let rank = 1;

    sorted.forEach((opportunity, index) => {
        if (
            index > 0 &&
            clickMap.get(sorted[index - 1].slug) !== clickMap.get(opportunity.slug)
        ) {
            rank = index + 1;
        }

        ranked.push({
            opportunity,
            rank,
            clicks: clickMap.get(opportunity.slug)
        });
    });

    const podiumItems = ranked.slice(0, 3);

    const podiumPositions = [
        { item: podiumItems[1], position: "second" },
        { item: podiumItems[0], position: "first" },
        { item: podiumItems[2], position: "third" }
    ];

    podiumPositions.forEach(({ item, position }) => {
        if (!item) {
            return;
        }

        const card = document.createElement("div");
        card.className = "podium-card " + position;

        const medal = document.createElement("div");
        medal.className = "podium-medal";

        let medalClass = "bronze";
        let label = "Bronze medal";

        if (item.rank === 1) {
            medalClass = "gold";
            label = "Gold medal";
        } else if (item.rank === 2) {
            medalClass = "silver";
            label = "Silver medal";
        }

        medal.classList.add(medalClass);

        medal.innerHTML = `
            <svg viewBox="0 0 64 64" aria-label="${label}">
                <path d="M20 4h10l6 18H26z"></path>
                <path d="M34 4h10l-6 18H28z"></path>
                <circle cx="32" cy="40" r="17"></circle>
                <circle cx="32" cy="40" r="11"></circle>
                <path d="M32 32l2.5 5 5.5.8-4 4 1 5.5-5-2.6-5 2.6 1-5.5-4-4 5.5-.8z"></path>
            </svg>
        `;

        card.appendChild(medal);

        const place = document.createElement("div");
        place.className = "podium-place";
        place.textContent = "#" + item.rank;
        card.appendChild(place);

        const name = document.createElement("div");
        name.className = "podium-name";
        name.textContent = item.opportunity.name || "Unnamed Opportunity";
        card.appendChild(name);

        const clicks = document.createElement("div");
        clicks.className = "podium-clicks";
        clicks.textContent = item.clicks + " clicks";
        card.appendChild(clicks);

        if (item.opportunity.official_url) {
            const link = document.createElement("a");
            link.href = item.opportunity.official_url;
            link.target = "_blank";
            link.rel = "noopener";
            link.textContent = "Visit";
            card.appendChild(link);
        }

        podium.appendChild(card);
    });

    ranked.forEach(item => {
        const opportunity = item.opportunity;

        const card = document.createElement("div");
        card.className = "opportunity-card";

        const rankElement = document.createElement("div");
        rankElement.className = "opportunity-rank";
        rankElement.textContent = "#" + item.rank;
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
            "<strong>Official Website Clicks:</strong> " + item.clicks;
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