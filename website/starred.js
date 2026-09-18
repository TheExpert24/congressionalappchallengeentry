const container = document.getElementById("starredOpportunities");
const starredKey = "next-gen-starred";

const starred = new Set(
    JSON.parse(localStorage.getItem(starredKey) || "[]")
);

fetch("all_opportunities.json")
    .then(response => response.json())
    .then(opportunities => {
        const filtered = opportunities.filter(opportunity => {
            const slug = opportunity.slug || opportunity.name;
            return starred.has(slug);
        });

        if (filtered.length === 0) {
            container.innerHTML = "<p>No starred opportunities yet.</p>";
            return;
        }

        filtered.forEach(opportunity => {
            const card = document.createElement("div");
            card.className = "opportunity-card";

            const slug = opportunity.slug || opportunity.name;

            card.innerHTML =
                "<button class='star-button starred' type='button'>★</button>" +
                "<h2>" + (opportunity.name || "Untitled Opportunity") + "</h2>" +
                "<p>" + (opportunity.description || "") + "</p>" +
                "<p><strong>Organization:</strong> " + (opportunity.organization || "Not listed") + "</p>" +
                "<p><strong>Categories:</strong> " + ((opportunity.categories || []).join(", ") || "Not listed") + "</p>" +
                "<p><strong>Location:</strong> " + (opportunity.location || "N/A") + "</p>" +
                "<p><strong>Cost:</strong> " + (opportunity.cost || "N/A") + "</p>" +
                "<p><strong>Eligibility:</strong> " + (opportunity.eligibility || "N/A") + "</p>" +
                "<p><strong>Grade:</strong> " + (opportunity.grade || "N/A") + "</p>" +
                (opportunity.official_url
                    ? "<a href='" + opportunity.official_url + "' target='_blank' rel='noopener'>Official Website</a>"
                    : "");

            card.querySelector(".star-button").addEventListener("click", () => {
                starred.delete(slug);
                localStorage.setItem(starredKey, JSON.stringify([...starred]));
                card.remove();

                if (container.children.length === 0) {
                    container.innerHTML = "<p>No starred opportunities yet.</p>";
                }
            });

            container.appendChild(card);
        });
    });