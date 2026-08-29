fetch("all_opportunities.json")
    .then(response => {
        if (!response.ok) {
            throw new Error("HTTP " + response.status);
        }

        return response.json();
    })
    .then(opportunities => {
        const container = document.getElementById("opportunities");

        opportunities.forEach(opportunity => {
            const card = document.createElement("div");

            card.className = "opportunity-card";

            card.innerHTML =
                "<h2>" + (opportunity.name || "Untitled Opportunity") + "</h2>" +
                "<p>" + (opportunity.description || "") + "</p>" +
                "<p><strong>Organization:</strong> " + (opportunity.organization || "Not listed") + "</p>" +
                "<p><strong>Type:</strong> " + (opportunity.type || "Not listed") + "</p>" +
                "<p><strong>Categories:</strong> " + ((opportunity.categories || []).join(", ")) + "</p>" +
                "<p><strong>Location:</strong> " + (opportunity.location || "Not listed") + "</p>" +
                "<p><strong>Cost:</strong> " + (opportunity.cost || "Not listed") + "</p>" +
                "<p><strong>Deadline:</strong> " + (opportunity.deadline || "Not listed") + "</p>" +
                "<p><strong>Eligibility:</strong> " + (opportunity.eligibility || "Not listed") + "</p>" +
                "<p><strong>Grade:</strong> " + (opportunity.grade || "Not listed") + "</p>" +
                "<p><strong>Age:</strong> " + (opportunity.age || "Not listed") + "</p>" +
                (opportunity.official_url
                    ? "<a href='" + opportunity.official_url + "' target='_blank'>Official Website</a>"
                    : "");

            container.appendChild(card);
        });
    })
    .catch(error => {
        console.error("Error loading opportunities:", error);

        document.getElementById("opportunities").textContent =
            "Unable to load opportunities.";
    });