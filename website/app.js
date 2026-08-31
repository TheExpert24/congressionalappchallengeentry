const container = document.getElementById("opportunities");
const searchInput = document.getElementById("searchInput");
const typeFilter = document.getElementById("typeFilter");
const categoryFilter = document.getElementById("categoryFilter");
const gradeFilter = document.getElementById("gradeFilter");
const clearFiltersButton = document.getElementById("clearFilters");

fetch("all_opportunities.json")
    .then(response => {
        if (!response.ok) {
            throw new Error("HTTP " + response.status);
        }

        return response.json();
    })
    .then(opportunities => {
        const uniqueOpportunities = [];
        const seen = new Set();

        opportunities.forEach(opportunity => {
            const key = opportunity.slug || opportunity.name || opportunity.official_url || opportunity.source_url;

            if (!key || seen.has(key)) {
                return;
            }

            seen.add(key);
            uniqueOpportunities.push(opportunity);
        });

        function populateSelect(selectElement, values) {
            values.forEach(value => {
                const option = document.createElement("option");
                option.value = value;
                option.textContent = value;
                selectElement.appendChild(option);
            });
        }

        populateSelect(
            typeFilter,
            Array.from(new Set(uniqueOpportunities.map(opportunity => opportunity.type))).filter(Boolean).sort()
        );

        populateSelect(
            categoryFilter,
            Array.from(new Set(uniqueOpportunities.flatMap(opportunity => opportunity.categories || []))).filter(Boolean).sort()
        );

        populateSelect(
            gradeFilter,
            Array.from(new Set(uniqueOpportunities.map(opportunity => opportunity.grade))).filter(Boolean).sort()
        );

        function matchesFilters(opportunity) {
            const query = searchInput.value.trim().toLowerCase();
            const selectedType = typeFilter.value;
            const selectedCategory = categoryFilter.value;
            const selectedGrade = gradeFilter.value;

            const searchableText = [
                opportunity.name,
                opportunity.organization,
                opportunity.description,
                opportunity.type,
                opportunity.eligibility,
                opportunity.grade,
                opportunity.age,
                (opportunity.categories || []).join(" ")
            ].join(" ").toLowerCase();

            const matchesQuery = !query || searchableText.includes(query);
            const matchesType = !selectedType || opportunity.type === selectedType;
            const matchesCategory = !selectedCategory || (opportunity.categories || []).includes(selectedCategory);
            const matchesGrade = !selectedGrade || opportunity.grade === selectedGrade;

            return matchesQuery && matchesType && matchesCategory && matchesGrade;
        }

        function renderOpportunities() {
            const filtered = uniqueOpportunities.filter(matchesFilters);

            container.innerHTML = "";

            if (filtered.length === 0) {
                const empty = document.createElement("p");
                empty.className = "empty-state";
                empty.textContent = "No opportunities match those filters.";
                container.appendChild(empty);
                return;
            }

            filtered.forEach(opportunity => {
                const card = document.createElement("div");

                card.className = "opportunity-card";
                card.innerHTML = 
                    "<h2>" + (opportunity.name || "Untitled Opportunity") + "</h2>" +
                    "<p>" + (opportunity.description || "") + "</p>" +
                    "<p><strong>Organization:</strong> " + (opportunity.organization || "Not listed") + "</p>" +
                    "<p><strong>Type:</strong> " + (opportunity.type || "Not listed") + "</p>" +
                    "<p><strong>Categories:</strong> " + ((opportunity.categories || []).join(", ") || "Not listed") + "</p>" +
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
        }

        searchInput.addEventListener("input", renderOpportunities);
        typeFilter.addEventListener("change", renderOpportunities);
        categoryFilter.addEventListener("change", renderOpportunities);
        gradeFilter.addEventListener("change", renderOpportunities);

        clearFiltersButton.addEventListener("click", () => {
            searchInput.value = "";
            typeFilter.value = "";
            categoryFilter.value = "";
            gradeFilter.value = "";
            renderOpportunities();
        });

        renderOpportunities();
    })
    .catch(error => {
        console.error("Error loading opportunities:", error);
        document.getElementById("opportunities").textContent = "Unable to load opportunities.";
    });