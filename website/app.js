const container = document.getElementById("opportunities");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const gradeFilter = document.getElementById("gradeFilter");
const clearFiltersButton = document.getElementById("clearFilters");
const editDialog = document.getElementById("editDialog");
const editForm = document.getElementById("editForm");
const downloadJsonButton = document.getElementById("downloadJson");
const resetSavedChangesButton = document.getElementById("resetSavedChanges");
const saveStatus = document.getElementById("saveStatus");
const storageKey = "congressional-app-opportunities";

fetch("all_opportunities.json")
    .then(response => {
        if (!response.ok) {
            throw new Error("HTTP " + response.status);
        }

        return response.json();
    })
    .then(fetchedOpportunities => {
        let opportunities = fetchedOpportunities;
        const savedOpportunities = localStorage.getItem(storageKey);

        if (savedOpportunities) {
            try {
                opportunities = JSON.parse(savedOpportunities);
            } catch (error) {
                localStorage.removeItem(storageKey);
            }
        }

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
            categoryFilter,
            Array.from(new Set(uniqueOpportunities.flatMap(opportunity => opportunity.categories || []))).filter(Boolean).sort()
        );

        const grades = [
            "Kindergarten",
            "1st",
            "2nd",
            "3rd",
            "4th",
            "5th",
            "6th",
            "7th",
            "8th",
            "9th",
            "10th",
            "11th",
            "12th"
        ];

        grades.forEach(grade => {
            const option = document.createElement("option");
            option.value = grade;
            option.textContent = grade;
            gradeFilter.appendChild(option);
        });

        function matchesFilters(opportunity) {
            const query = searchInput.value.trim().toLowerCase();
            const selectedCategory = categoryFilter.value;
            const selectedGrade = gradeFilter.value;

            const searchableText = [
                opportunity.name,
                opportunity.organization,
                opportunity.description,
                opportunity.eligibility,
                opportunity.grade,
                (opportunity.categories || []).join(" ")
            ].join(" ").toLowerCase();

            const matchesQuery = !query || searchableText.includes(query);
            const matchesCategory = !selectedCategory || (opportunity.categories || []).includes(selectedCategory);
            function getGrades(gradeText) {
                if (!gradeText) {
                    return [];
                }

                const text = gradeText
                    .toLowerCase()
                    .replace(/[–—]/g, "-");

                const foundGrades = new Set();

                function convertGrade(value) {
                    if (value === "k" || value === "kindergarten") {
                        return 0;
                    }

                    const number = Number(value);

                    if (!Number.isNaN(number) && number >= 1 && number <= 12) {
                        return number;
                    }

                    return null;
                }

                const rangeMatch = text.match(
                    /\b(k|kindergarten|\d{1,2})\s*(?:-|to|through)\s*(k|kindergarten|\d{1,2})\b/
                );

                if (rangeMatch) {
                    const start = convertGrade(rangeMatch[1]);
                    const end = convertGrade(rangeMatch[2]);

                    if (start !== null && end !== null && start <= end) {
                        for (let grade = start; grade <= end; grade++) {
                            foundGrades.add(grade);
                        }
                    }
                } else {
                    if (
                        /\bk\b/.test(text) ||
                        text.includes("kindergarten")
                    ) {
                        foundGrades.add(0);
                    }

                    const numbers = [...text.matchAll(/\b\d{1,2}\b/g)];

                    numbers.forEach(match => {
                        const grade = Number(match[0]);

                        if (grade >= 1 && grade <= 12) {
                            foundGrades.add(grade);
                        }
                    });
                }

                return [...foundGrades];
            }

            const opportunityGrades = getGrades(opportunity.grade);

            const selectedGradeNumber = grades.indexOf(selectedGrade);

            const matchesGrade =
                !selectedGrade ||
                opportunityGrades.includes(selectedGradeNumber);
                        return matchesQuery && matchesCategory && matchesGrade;
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
                    "<p><strong>Categories:</strong> " + ((opportunity.categories || []).join(", ") || "Not listed") + "</p>" +
                    "<p><strong>Location:</strong> " + (opportunity.location || "N/A") + "</p>" +
                    "<p><strong>Cost:</strong> " + (opportunity.cost || "N/A") + "</p>" +
                    "<p><strong>Eligibility:</strong> " + (opportunity.eligibility || "N/A") + "</p>" +
                    "<p><strong>Grade:</strong> " + (opportunity.grade || "N/A") + "</p>" +
                    (opportunity.official_url
                        ? "<a href='" + opportunity.official_url + "' target='_blank'>Official Website</a>"
                        : "");

                const actions = document.createElement("div");
                actions.className = "card-actions";

                const editButton = document.createElement("button");
                editButton.type = "button";
                editButton.textContent = "Edit";
                editButton.addEventListener("click", () => openEditor(opportunity));

                const removeButton = document.createElement("button");
                removeButton.type = "button";
                removeButton.className = "remove-button";
                removeButton.textContent = "Remove";
                removeButton.addEventListener("click", () => removeOpportunity(opportunity));

                actions.append(editButton, removeButton);
                card.appendChild(actions);

                container.appendChild(card);
            });
        }

        function saveOpportunities() {
            localStorage.setItem(storageKey, JSON.stringify(uniqueOpportunities));
            saveStatus.textContent = "Changes saved in this browser.";
        }

        function openEditor(opportunity) {
            const fields = ["name", "organization", "description", "location", "cost", "deadline", "eligibility", "grade", "official_url", "source_url", "slug"];

            fields.forEach(field => {
                editForm.elements[field].value = opportunity[field] || "";
            });

            editForm.elements.categories.value = (opportunity.categories || []).join(", ");
            editForm.dataset.index = uniqueOpportunities.indexOf(opportunity);
            editDialog.showModal();
        }

        function removeOpportunity(opportunity) {
            if (!window.confirm("Remove this opportunity from the index?")) {
                return;
            }

            const index = uniqueOpportunities.indexOf(opportunity);

            if (index !== -1) {
                uniqueOpportunities.splice(index, 1);
                saveOpportunities();
                renderOpportunities();
            }
        }

        editForm.addEventListener("submit", event => {
            event.preventDefault();
            const index = Number(editForm.dataset.index);
            const data = new FormData(editForm);

            if (!uniqueOpportunities[index]) {
                return;
            }

            ["name", "organization", "description", "location", "cost", "deadline", "eligibility", "grade", "official_url", "source_url", "slug"].forEach(field => {
                uniqueOpportunities[index][field] = data.get(field).trim();
            });

            uniqueOpportunities[index].categories = data.get("categories")
                .split(",")
                .map(category => category.trim())
                .filter(Boolean);

            saveOpportunities();
            editDialog.close();
            renderOpportunities();
        });

        document.getElementById("closeEdit").addEventListener("click", () => editDialog.close());
        document.getElementById("cancelEdit").addEventListener("click", () => editDialog.close());

        downloadJsonButton.addEventListener("click", () => {
            const blob = new Blob([JSON.stringify(uniqueOpportunities, null, 2)], { type: "application/json" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "all_opportunities.json";
            link.click();
            URL.revokeObjectURL(link.href);
            saveStatus.textContent = "Downloaded the current opportunity list.";
        });

        resetSavedChangesButton.addEventListener("click", () => {
            localStorage.removeItem(storageKey);
            window.location.reload();
        });

        searchInput.addEventListener("input", renderOpportunities);
        categoryFilter.addEventListener("change", renderOpportunities);
        gradeFilter.addEventListener("change", renderOpportunities);

        clearFiltersButton.addEventListener("click", () => {
            searchInput.value = "";
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
