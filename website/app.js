const container = document.getElementById("opportunities");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const gradeFilter = document.getElementById("gradeFilter");
const clearFiltersButton = document.getElementById("clearFilters");
const saveStatus = document.getElementById("saveStatus");
const storageKey = "congressional-app-opportunities";
const starredKey = "next-gen-starred";
const typeFilter = document.getElementById("typeFilter");

const starredOpportunities = new Set(
    JSON.parse(localStorage.getItem(starredKey) || "[]")
);

function saveStarred() {
    localStorage.setItem(
        starredKey,
        JSON.stringify([...starredOpportunities])
    );
}

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
            Array.from(
                new Set(
                    uniqueOpportunities.flatMap(
                        opportunity => opportunity.categories || []
                    )
                )
            )
                .filter(Boolean)
                .sort()
        );
        populateSelect(typeFilter, [
            "Competition",
            "Scholarship",
            "Internship",
            "Program"
        ]);

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

        const searchConcepts = [
            {
                aliases: [
                    "computer science",
                    "computer-science",
                    "coding",
                    "programming",
                    "cs"
                ],
                categories: [
                    "computer science",
                    "coding",
                    "programming",
                    "software"
                ],
                exclude: []
            },
            {
                aliases: [
                    "science",
                    "biology",
                    "chemistry",
                    "physics",
                    "earth science",
                    "life science",
                    "environmental science",
                    "natural science"
                ],
                categories: [
                    "science",
                    "biology",
                    "chemistry",
                    "physics",
                    "earth science",
                    "life science",
                    "environmental science",
                    "natural science"
                ],
                exclude: ["computer science"]
            },
            {
                aliases: [
                    "mathematics",
                    "math"
                ],
                categories: [
                    "math",
                    "mathematics"
                ],
                exclude: []
            },
            {
                aliases: [
                    "competition",
                    "competitions",
                    "contest",
                    "contests",
                    "tournament",
                    "tournaments",
                    "olympiad",
                    "olympiads",
                    "challenge",
                    "challenges"
                ],
                categories: [
                    "competition",
                    "competitions",
                    "contest",
                    "contests",
                    "tournament",
                    "tournaments",
                    "olympiad",
                    "olympiads",
                    "challenge",
                    "challenges"
                ],
                exclude: []
            },
            {
                aliases: [
                    "robotics",
                    "robot",
                    "robots"
                ],
                categories: [
                    "robotics",
                    "robot",
                    "robots"
                ],
                exclude: []
            },
            {
                aliases: [
                    "engineering",
                    "engineer"
                ],
                categories: [
                    "engineering",
                    "engineer"
                ],
                exclude: []
            },
            {
                aliases: [
                    "stem"
                ],
                categories: [
                    "stem",
                    "science",
                    "technology",
                    "engineering",
                    "math",
                    "mathematics"
                ],
                exclude: []
            },
            {
                aliases: [
                    "technology",
                    "tech"
                ],
                categories: [
                    "technology",
                    "tech"
                ],
                exclude: []
            },
            {
                aliases: [
                    "art",
                    "arts",
                    "visual arts"
                ],
                categories: [
                    "art",
                    "arts",
                    "visual arts"
                ],
                exclude: []
            },
            {
                aliases: [
                    "music",
                    "performing arts"
                ],
                categories: [
                    "music",
                    "performing arts"
                ],
                exclude: []
            },
            {
                aliases: [
                    "writing",
                    "literature",
                    "english"
                ],
                categories: [
                    "writing",
                    "literature",
                    "english"
                ],
                exclude: []
            },
            {
                aliases: [
                    "reading"
                ],
                categories: [
                    "reading",
                    "literature",
                    "english"
                ],
                exclude: []
            },
            {
                aliases: [
                    "debate",
                    "public speaking"
                ],
                categories: [
                    "debate",
                    "public speaking"
                ],
                exclude: []
            },
            {
                aliases: [
                    "volunteering",
                    "volunteer",
                    "community service",
                    "service"
                ],
                categories: [
                    "volunteering",
                    "community service",
                    "service"
                ],
                exclude: []
            },
            {
                aliases: [
                    "research",
                    "research program",
                    "research opportunity"
                ],
                categories: [
                    "research"
                ],
                exclude: []
            },
            {
                aliases: [
                    "internship",
                    "internships"
                ],
                categories: [
                    "internship",
                    "internships"
                ],
                exclude: []
            },
            {
                aliases: [
                    "program",
                    "programs",
                    "academy",
                    "initiative"
                ],
                categories: [
                    "program",
                    "programs",
                    "academy",
                    "initiative"
                ],
                exclude: []
            }
        ];

        function normalizeSearchText(text) {
            return String(text || "")
                .toLowerCase()
                .replace(/[–—]/g, "-")
                .replace(/[^a-z0-9\s-]/g, " ")
                .replace(/\s+/g, " ")
                .trim();
        }

        function singularizeSearchWord(word) {
            if (word.endsWith("ies") && word.length > 4) {
                return word.slice(0, -3) + "y";
            }

            if (
                word.endsWith("s") &&
                !word.endsWith("ss") &&
                word.length > 3
            ) {
                return word.slice(0, -1);
            }

            return word;
        }

        function textContainsTerm(text, term) {
            const normalizedText = normalizeSearchText(text);
            const normalizedTerm = normalizeSearchText(term);

            if (!normalizedText || !normalizedTerm) {
                return false;
            }

            if (normalizedText === normalizedTerm) {
                return true;
            }

            return (
                " " + normalizedText + " "
            ).includes(
                " " + normalizedTerm + " "
            );
        }

        function getSearchConcepts(query) {
            let remaining = normalizeSearchText(query);
            const found = [];

            const aliases = [];

            searchConcepts.forEach(concept => {
                concept.aliases.forEach(alias => {
                    aliases.push({
                        alias: normalizeSearchText(alias),
                        concept
                    });
                });
            });

            aliases.sort((a, b) => b.alias.length - a.alias.length);

            aliases.forEach(item => {
                const pattern = new RegExp(
                    "(^|\\s)" +
                    item.alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
                    "(?=\\s|$)",
                    "g"
                );

                if (pattern.test(remaining)) {
                    found.push(item.concept);
                    remaining = remaining
                        .replace(pattern, " ")
                        .replace(/\s+/g, " ")
                        .trim();
                }
            });

            const remainingWords = remaining
                .split(/\s+/)
                .map(singularizeSearchWord)
                .filter(word =>
                    word.length > 1 &&
                    ![
                        "a",
                        "an",
                        "and",
                        "for",
                        "from",
                        "in",
                        "of",
                        "on",
                        "or",
                        "the",
                        "to",
                        "with",
                        "near",
                        "best",
                        "good",
                        "top"
                    ].includes(word)
                );

            return {
                concepts: [...new Set(found)],
                remainingWords
            };
        }

        function getSearchScore(opportunity) {
            const query = normalizeSearchText(searchInput.value);

            if (!query) {
                return 0;
            }

            const parsed = getSearchConcepts(query);
            const concepts = parsed.concepts;
            const remainingWords = parsed.remainingWords;

            const categories = (opportunity.categories || [])
                .map(normalizeSearchText)
                .filter(Boolean);

            const name = normalizeSearchText(opportunity.name);
            const organization = normalizeSearchText(
                opportunity.organization
            );
            const description = normalizeSearchText(
                opportunity.description
            );
            const eligibility = normalizeSearchText(
                opportunity.eligibility
            );
            const location = normalizeSearchText(
                opportunity.location
            );
            const cost = normalizeSearchText(
                opportunity.cost
            );

            const allText = [
                name,
                organization,
                description,
                eligibility,
                location,
                cost,
                categories.join(" ")
            ].join(" ");

            let score = 0;

            concepts.forEach(concept => {
                const categoryMatch = concept.categories.some(term =>
                    categories.some(category =>
                        textContainsTerm(category, term)
                    )
                );

                const nameMatch = concept.categories.some(term =>
                    textContainsTerm(name, term)
                );

                const textMatch = concept.aliases.some(term =>
                    textContainsTerm(description, term) ||
                    textContainsTerm(organization, term) ||
                    textContainsTerm(eligibility, term)
                );

                const excluded = concept.exclude.some(term =>
                    categories.some(category =>
                        textContainsTerm(category, term)
                    ) ||
                    textContainsTerm(name, term)
                );

                if (excluded) {
                    score -= 100;
                    return;
                }

                if (categoryMatch) {
                    score += 100;
                } else if (nameMatch) {
                    score += 70;
                } else if (textMatch) {
                    score += 15;
                } else {
                    score -= 80;
                }
            });

            remainingWords.forEach(word => {
                const wordRegex = new RegExp(
                    "(^|\\s)" +
                    word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
                    "(\\s|$)"
                );

                if (wordRegex.test(name)) {
                    score += 55;
                } else if (
                    categories.some(category =>
                        wordRegex.test(category)
                    )
                ) {
                    score += 50;
                } else if (wordRegex.test(organization)) {
                    score += 25;
                } else if (wordRegex.test(description)) {
                    score += 12;
                } else if (wordRegex.test(eligibility)) {
                    score += 8;
                } else if (wordRegex.test(allText)) {
                    score += 5;
                } else {
                    score -= 25;
                }
            });

            if (
                concepts.length === 0 &&
                remainingWords.length === 0
            ) {
                return 0;
            }

            if (concepts.length === 0) {
                const anyWordMatch = remainingWords.some(word =>
                    allText.includes(word)
                );

                return anyWordMatch ? score : -1;
            }

            return score;
        }

        function getGrades(gradeText) {
            if (!gradeText) {
                return [];
            }

            const text = gradeText
                .toLowerCase()
                .replace(/[–—]/g, "-");

            const foundGrades = new Set();

            function convertGrade(value) {
                if (
                    value === "k" ||
                    value === "kindergarten"
                ) {
                    return 0;
                }

                const number = Number(value);

                if (
                    !Number.isNaN(number) &&
                    number >= 1 &&
                    number <= 12
                ) {
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

                if (
                    start !== null &&
                    end !== null &&
                    start <= end
                ) {
                    for (
                        let grade = start;
                        grade <= end;
                        grade++
                    ) {
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

                const numbers = [
                    ...text.matchAll(/\b\d{1,2}\b/g)
                ];

                numbers.forEach(match => {
                    const grade = Number(match[0]);

                    if (grade >= 1 && grade <= 12) {
                        foundGrades.add(grade);
                    }
                });
            }

            return [...foundGrades];
        }

        function getMatches(opportunity) {
            const selectedCategory = categoryFilter.value;
            const selectedGrade = gradeFilter.value;
            const selectedType = typeFilter.value;
            const categories = opportunity.categories || [];
            const specialTypes = [
                "Competition",
                "Scholarship",
                "Internship"
            ];
            const actualType = categories.find(category =>
                specialTypes.some(type =>
                    type.toLowerCase() === category.toLowerCase()
                )
            ) || "Program";

            const matchesType =
                !selectedType ||
                actualType.toLowerCase() === selectedType.toLowerCase();
            const searchScore = getSearchScore(opportunity);

            const matchesQuery =
                !searchInput.value.trim() ||
                searchScore >= 0;

            const matchesCategory =
                !selectedCategory ||
                (opportunity.categories || []).includes(
                    selectedCategory
                );

            const opportunityGrades =
                getGrades(opportunity.grade);

            const selectedGradeNumber =
                grades.indexOf(selectedGrade);

            const matchesGrade =
                !selectedGrade ||
                opportunityGrades.includes(
                    selectedGradeNumber
                );

            return {
                matches:
                    matchesQuery &&
                    matchesCategory &&
                    matchesGrade &&
                    matchesType,
                score: searchScore
            };
        }

        function renderOpportunities() {
            const filtered = uniqueOpportunities
                .map(opportunity => ({
                    opportunity,
                    result: getMatches(opportunity)
                }))
                .filter(item => item.result.matches)
                .sort((a, b) => {
                    return b.result.score - a.result.score;
                })
                .map(item => item.opportunity);

            container.innerHTML = "";

            if (filtered.length === 0) {
                const empty = document.createElement("p");
                empty.className = "empty-state";
                empty.textContent =
                    "No opportunities match those filters.";
                container.appendChild(empty);
                return;
            }

            filtered.forEach(opportunity => {
                const card = document.createElement("div");
                card.className = "opportunity-card";

                const slug =
                    opportunity.slug ||
                    opportunity.name;

                const isStarred =
                    starredOpportunities.has(slug);

                card.innerHTML =
                    "<button class='star-button" +
                    (isStarred ? " starred" : "") +
                    "' type='button'>" +
                    (isStarred ? "★" : "☆") +
                    "</button>" +
                    "<h2>" +
                    (opportunity.name ||
                        "Untitled Opportunity") +
                    "</h2>" +
                    "<p>" +
                    (opportunity.description || "") +
                    "</p>" +
                    "<p><strong>Organization:</strong> " +
                    (opportunity.organization ||
                        "Not listed") +
                    "</p>" +
                    "<p><strong>Categories:</strong> " +
                    ((opportunity.categories || []).join(
                        ", "
                    ) || "Not listed") +
                    "</p>" +
                    "<p><strong>Location:</strong> " +
                    (opportunity.location || "N/A") +
                    "</p>" +
                    "<p><strong>Cost:</strong> " +
                    (opportunity.cost || "N/A") +
                    "</p>" +
                    "<p><strong>Eligibility:</strong> " +
                    (opportunity.eligibility || "N/A") +
                    "</p>" +
                    "<p><strong>Grade:</strong> " +
                    (opportunity.grade || "N/A") +
                    "</p>" +
                    (opportunity.official_url
                        ? "<a href='" +
                          opportunity.official_url +
                          "' target='_blank' rel='noopener' class='official-link' data-slug='" +
                          opportunity.slug +
                          "'>Official Website</a>"
                        : "");

                const actions =
                    document.createElement("div");

                actions.className = "card-actions";
                card.appendChild(actions);

                const starButton =
                    card.querySelector(".star-button");

                starButton.addEventListener(
                    "click",
                    () => {
                        if (
                            starredOpportunities.has(
                                slug
                            )
                        ) {
                            starredOpportunities.delete(
                                slug
                            );
                        } else {
                            starredOpportunities.add(
                                slug
                            );
                        }

                        saveStarred();
                        renderOpportunities();
                    }
                );

                const officialLink =
                    card.querySelector(".official-link");

                if (officialLink) {
                    officialLink.addEventListener(
                        "click",
                        () => {
                            fetch(
                                "/api/click/" +
                                encodeURIComponent(
                                    opportunity.slug
                                ),
                                {
                                    method: "POST"
                                }
                            ).catch(error => {
                                console.error(
                                    "error recording click:",
                                    error
                                );
                            });
                        }
                    );
                }

                container.appendChild(card);
            });
        }

        function saveOpportunities() {
            localStorage.setItem(
                storageKey,
                JSON.stringify(uniqueOpportunities)
            );

            saveStatus.textContent =
                "Changes saved in this browser.";
        }

        function openEditor(opportunity) {
            const fields = [
                "name",
                "organization",
                "description",
                "location",
                "cost",
                "deadline",
                "eligibility",
                "grade",
                "official_url",
                "source_url",
                "slug"
            ];

            fields.forEach(field => {
                editForm.elements[field].value =
                    opportunity[field] || "";
            });

            editForm.elements.categories.value =
                (opportunity.categories || []).join(", ");

            editForm.dataset.index =
                uniqueOpportunities.indexOf(
                    opportunity
                );

            editDialog.showModal();
        }

        function removeOpportunity(opportunity) {
            if (
                !window.confirm(
                    "Remove this opportunity from the index?"
                )
            ) {
                return;
            }

            const index =
                uniqueOpportunities.indexOf(
                    opportunity
                );

            if (index !== -1) {
                uniqueOpportunities.splice(index, 1);
                saveOpportunities();
                renderOpportunities();
            }
        }

        // Read filters from URL query parameters.
        function applyQueryParams() {
            const params = new URLSearchParams(window.location.search);

            const search = params.get("search");
            const category = params.get("category");
            const grade = params.get("grade");
            const type = params.get("type");

            if (search) {
                searchInput.value = search;
            }

            if (category) {
                const matchingCategory = Array.from(categoryFilter.options)
                    .find(option =>
                        option.value.toLowerCase() === category.toLowerCase()
                    );

                if (matchingCategory) {
                    categoryFilter.value = matchingCategory.value;
                }
            }

                if (grade) {
                const matchingGrade = Array.from(gradeFilter.options)
                    .find(option =>
                        option.value.toLowerCase() === grade.toLowerCase()
                    );

                if (matchingGrade) {
                    gradeFilter.value = matchingGrade.value;
                }
            }

            if (type) {
                const matchingType = Array.from(typeFilter.options)
                    .find(option =>
                        option.value.toLowerCase() === type.toLowerCase()
                    );

                if (matchingType) {
                    typeFilter.value = matchingType.value;
                }
            }
        }

        applyQueryParams();

        categoryFilter.addEventListener(
            "change",
            renderOpportunities
        );

        gradeFilter.addEventListener(
            "change",
            renderOpportunities
        );
        typeFilter.addEventListener(
            "change",
            renderOpportunities
        );

        clearFiltersButton.addEventListener(
            "click",
            () => {
                searchInput.value = "";
                categoryFilter.value = "";
                gradeFilter.value = "";
                typeFilter.value = "";
                renderOpportunities();
            }
        );
        // Apply homepage shortcut filters after all dropdown options exist.
        const params = new URLSearchParams(window.location.search);

        const requestedSearch = params.get("search");
        const requestedGrade = params.get("grade");
        const requestedType = params.get("type");
        const requestedCategory = params.get("category");
        if (requestedSearch !== null) {
            searchInput.value = requestedSearch;
        }

        function selectMatchingOption(selectElement, requestedValue) {
            if (!requestedValue) return;

            const matchingOption = Array.from(selectElement.options).find(
                option =>
                    option.value.toLowerCase() === requestedValue.toLowerCase()
            );

            if (matchingOption) {
                selectElement.value = matchingOption.value;
            }
        }
        selectMatchingOption(gradeFilter, requestedGrade);
        selectMatchingOption(typeFilter, requestedType);
        selectMatchingOption(categoryFilter, requestedCategory);

        renderOpportunities();
            })
            .catch(error => {
                console.error(
                    "Error loading opportunities:",
                    error
                );

                document.getElementById(
                    "opportunities"
                ).textContent =
                    "Unable to load opportunities.";
            });
