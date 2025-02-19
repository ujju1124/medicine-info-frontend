document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const suggestionsContainer = document.getElementById('suggestions');
    const recentSearchesContainer = document.getElementById('recentSearches');
    const errorContainer = document.getElementById('errorContainer');
    const loadingContainer = document.getElementById('loadingContainer');
    const medicineInfoContainer = document.getElementById('medicineInfo');
    const themeToggle = document.getElementById('themeToggle');

    let recentSearches = JSON.parse(localStorage.getItem('recentSearches')) || [];

    function updateRecentSearches() {
        recentSearchesContainer.innerHTML = '';
        if (recentSearches.length > 0) {
            const heading = document.createElement('h3');
            heading.textContent = 'Recent Searches';
            recentSearchesContainer.appendChild(heading);

            recentSearches.forEach(search => {
                const badge = document.createElement('span');
                badge.classList.add('badge');
                badge.textContent = search;
                badge.addEventListener('click', () => handleSearch(search));
                recentSearchesContainer.appendChild(badge);
            });
        }
    }

    function addToRecentSearches(search) {
        recentSearches = [search, ...recentSearches.filter(s => s !== search).slice(0, 4)];
        localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
        updateRecentSearches();
    }

    async function fetchSuggestions(input) {
        if (!input.trim()) {
            suggestionsContainer.innerHTML = '';
            return;
        }

        try {
            const response = await fetch(`/api/suggestions?name=${input}`);
            const data = await response.json();
            displaySuggestions(data.suggestions || []);
        } catch (error) {
            console.error("Error fetching suggestions:", error);
            suggestionsContainer.innerHTML = '';
        }
    }

    function displaySuggestions(suggestions) {
        suggestionsContainer.innerHTML = '';
        suggestions.forEach(suggestion => {
            const item = document.createElement('div');
            item.classList.add('suggestion-item');
            item.textContent = suggestion;
            item.addEventListener('click', () => {
                searchInput.value = suggestion;
                suggestionsContainer.innerHTML = '';
                handleSearch(suggestion);
            });
            suggestionsContainer.appendChild(item);
        });
    }

    async function handleSearch(searchQuery) {
        errorContainer.innerHTML = '';
        loadingContainer.innerHTML = '<p>Loading...</p>';
        medicineInfoContainer.style.display = 'none';

        try {
            const response = await fetch(`/api/medicine-info?name=${searchQuery}`);
            const data = await response.json();

            if (data.error) {
                errorContainer.textContent = data.error;
            } else {
                displayMedicineInfo(data.results[0]);
                addToRecentSearches(searchQuery);
            }
        } catch (err) {
            errorContainer.textContent = "Failed to fetch medicine information";
        } finally {
            loadingContainer.innerHTML = '';
        }
    }

    function displayMedicineInfo(medicineInfo) {
        medicineInfoContainer.innerHTML = `
            <div class="card-header">
            <div class="top-buttons">
                <button id="printButton"><i data-lucide="printer" style="color: black;"></i></button>
                <button id="shareButton"><i data-lucide="share-2" style="color: black;"></i></button>
                <button id="bookmarkButton"><i data-lucide="bookmark-plus" style="color: black;"></i></button>
                </div>
                <h2><i data-lucide="pill"></i> ${medicineInfo.openfda?.brand_name?.[0] || "Unknown Medicine"}</h2>
                <p>${medicineInfo.openfda?.generic_name?.[0] || "No generic name available"}</p>
                <button id="pronounceButton" style="color: black;"><i data-lucide="volume-2" style="color: black;"></i> Pronounce</button>
            </div>
            <div class="card-content">
                <div class="tab-list">
                    <button class="tab active" data-tab="overview">Overview</button>
                    <button class="tab" data-tab="dosage">Dosage</button>
                    <button class="tab" data-tab="warnings">Warnings</button>
                    <button class="tab" data-tab="ingredients">Ingredients</button>
                    <button class="tab" data-tab="interactions">Interactions</button>
                </div>
                <div class="tab-content" id="overviewTab">
                    <h3><i data-lucide="activity"></i> Overview</h3>
                    <p><strong>Manufacturer:</strong> ${medicineInfo.openfda?.manufacturer_name?.[0] || "N/A"}</p>
                    <p><strong>Purpose:</strong> ${medicineInfo.purpose?.[0] || "N/A"}</p>
                </div>
                <div class="tab-content" id="dosageTab" style="display: none;">
                    <h3><i data-lucide="syringe"></i> Dosage and Administration</h3>
                    <div class="accordion-item">
                        <div class="accordion-header">Dosage Information  <i data-lucide="arrow-down"></i></div>
                        <div class="accordion-content">${medicineInfo.dosage_and_administration?.[0] || "N/A"}</div>
                    </div>
                </div>
                <div class="tab-content" id="warningsTab" style="display: none;">
                    <h3><i data-lucide="thermometer"></i> Warnings and Precautions</h3>
                    <div class="accordion-item">
                        <div class="accordion-header">Warnings  <i data-lucide="arrow-down"></i></div>
                        <div class="accordion-content">${medicineInfo.warnings?.[0] || "N/A"}</div>
                    </div>
                    <div class="accordion-item">
                        <div class="accordion-header">Precautions  <i data-lucide="arrow-down"></i></div>
                        <div class="accordion-content">${medicineInfo.precautions?.[0] || "N/A"}</div>
                    </div>
                    <div class="accordion-item">
                        <div class="accordion-header">Side Effects  <i data-lucide="arrow-down"></i></div>
                        <div class="accordion-content">${medicineInfo.adverse_reactions?.[0] || "N/A"}</div>
                    </div>
                </div>
                <div class="tab-content" id="ingredientsTab" style="display: none;">
                    <h3><i data-lucide="pill"></i> Ingredients</h3>
                    <p><strong>Active Ingredients:</strong></p>
                    <div>${medicineInfo.active_ingredient?.map(ingredient => `<span class="badge">${ingredient}</span>`).join('') || "N/A"}</div>
                    <p><strong>Inactive Ingredients:</strong></p>
                    <div>${medicineInfo.inactive_ingredient?.map(ingredient => `<span class="badge">${ingredient}</span>`).join('') || "N/A"}</div>
                </div>
                <div class="tab-content" id="interactionsTab" style="display: none;">
                    <h3><i data-lucide="activity"></i> Drug Interactions</h3>
                    <div id="drugInteractions">
                        <input type="text" id="drugA" placeholder="Enter first drug name">
                        <input type="text" id="drugB" placeholder="Enter second drug name">
                        <button id="checkInteractionButton">Check Interaction</button>
                        <div id="interactionResult"></div>
                    </div>
                </div>
            </div>
        `;

        medicineInfoContainer.style.display = 'block';
        setupTabs();
        setupAccordion();
        setupPronunciation(medicineInfo.openfda?.brand_name?.[0] || "");
        setupPrintAndShare();
        setupDrugInteractions();
        lucide.createIcons();
    }

    function setupTabs() {
        const tabs = document.querySelectorAll('.tab');
        const tabContents = document.querySelectorAll('.tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const tabName = tab.getAttribute('data-tab');
                tabContents.forEach(content => {
                    content.style.display = content.id === `${tabName}Tab` ? 'block' : 'none';
                });
            });
        });
    }

    function setupAccordion() {
        const accordionHeaders = document.querySelectorAll('.accordion-header');

        accordionHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const content = header.nextElementSibling;
                content.classList.toggle('active');
            });
        });
    }

    function setupPronunciation(word) {
        const pronounceButton = document.getElementById('pronounceButton');
        pronounceButton.addEventListener('click', () => {
            const utterance = new SpeechSynthesisUtterance(word);
            speechSynthesis.speak(utterance);
        });
    }

    function setupPrintAndShare() {
        const printButton = document.getElementById('printButton');
        const shareButton = document.getElementById('shareButton');

        printButton.addEventListener('click', () => {
            window.print();
        });

        shareButton.addEventListener('click', async () => {
            try {
                await navigator.share({
                    title: "Medicine Information",
                    text: `Information about ${document.querySelector('.card-header h2').textContent}`,
                    url: window.location.href,
                });
            } catch (error) {
                console.log("Error sharing:", error);
            }
        });
    }

    function setupDrugInteractions() {
        const checkInteractionButton = document.getElementById('checkInteractionButton');
        const interactionResult = document.getElementById('interactionResult');

        checkInteractionButton.addEventListener('click', () => {
            const drugA = document.getElementById('drugA').value;
            const drugB = document.getElementById('drugB').value;
            
            // In a real-world scenario, this would call an API to check for drug interactions
            // For this example, we'll just simulate an API call
            interactionResult.textContent = `Potential interaction between ${drugA} and ${drugB}. Please consult with your healthcare provider.`;
        });
    }

    searchInput.addEventListener('input', () => fetchSuggestions(searchInput.value));
    searchButton.addEventListener('click', () => handleSearch(searchInput.value));

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        const icon = themeToggle.querySelector('i');
        if (document.body.classList.contains('dark')) {
            icon.setAttribute('data-lucide', 'sun');
        } else {
            icon.setAttribute('data-lucide', 'moon');
        }
        lucide.createIcons();
    });

    updateRecentSearches();
    lucide.createIcons();

    

    
});