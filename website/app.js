const container = document.getElementById("opportunities");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const gradeFilter = document.getElementById("gradeFilter");
const clearFiltersButton = document.getElementById("clearFilters");
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
                opportunity.location,
                opportunity.cost,
                opportunity.categories
            ].join(" ").toLowerCase();

            const searchAliases = {
                math: ["math", "mathematics"],
                mathematics: ["math", "mathematics"],
                competition: ["competition", "competitions", "contest", "contests", "tournament", "tournaments"],
                competitions: ["competition", "competitions", "contest", "contests", "tournament", "tournaments"],
                contest: ["competition", "competitions", "contest", "contests", "tournament", "tournaments"],
                contests: ["competition", "competitions", "contest", "contests", "tournament", "tournaments"],
                tournament: ["competition", "competitions", "contest", "contests", "tournament", "tournaments"],
                tournaments: ["competition", "competitions", "contest", "contests", "tournament", "tournaments"],
                coding: ["coding", "computer science", "programming"],
                code: ["coding", "computer science", "programming"],
                programming: ["coding", "computer science", "programming"],
                cs: ["computer science", "coding", "programming"],
                computers: ["computer science", "coding", "programming"],
                robotics: ["robotics", "robot", "engineering", "stem"],
                robot: ["robotics", "robot", "engineering", "stem"],
                science: ["science", "stem"],
                engineering: ["engineering", "stem"],
                stem: ["stem", "science", "technology", "engineering", "mathematics"],
                technology: ["technology", "computer science", "stem"],
                art: ["art", "arts", "visual arts"],
                arts: ["art", "arts", "visual arts"],
                music: ["music", "performing arts"],
                writing: ["writing", "literature", "english"],
                english: ["english", "writing", "literature"],
                reading: ["reading", "literature", "english"],
                debate: ["debate", "public speaking"],
                speaking: ["public speaking", "debate"],
                volunteering: ["volunteering", "community service"],
                volunteer: ["volunteering", "community service"],
                service: ["community service", "volunteering"],
                research: ["research", "science"],
                internship: ["internship", "internships"],
                internships: ["internship", "internships"],
                club: ["club", "organization"],
                clubs: ["club", "organization"],
                program: ["program", "programs"],
                programs: ["program", "programs"]
            };

            const queryWords = query
                .split(/\s+/)
                .map(word => word.replace(/[^\w-]/g, ""))
                .filter(Boolean);

            const matchesQuery = !query || queryWords.every(word => {
                const aliases = searchAliases[word] || [word];

                return aliases.some(alias => searchableText.includes(alias));
            });

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
