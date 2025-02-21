document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("searchInput")
    const searchButton = document.getElementById("searchButton")
    const suggestionsContainer = document.getElementById("suggestions")
    const recentSearchesContainer = document.getElementById("recentSearches")
    const errorContainer = document.getElementById("errorContainer")
    const loadingContainer = document.getElementById("loadingContainer")
    const medicineInfoContainer = document.getElementById("medicineInfo")
    const consultDoctorSection = document.getElementById("consultDoctor")
    const themeToggle = document.getElementById("themeToggle")
    const uploadButton = document.getElementById("uploadButton")
    const imageUpload = document.getElementById("imageUpload")
  
    let recentSearches = JSON.parse(localStorage.getItem("recentSearches")) || []
  
    // Declare lucide if it's not already available globally
    let lucide
    if (typeof window !== "undefined" && typeof window.lucide === "undefined") {
      lucide = {} // Or attempt to import it if you're using a module system
    } else if (typeof window !== "undefined") {
      lucide = window.lucide
    }
  
    // Declare tsParticles if it's not already available globally
    let tsParticles
    if (typeof window !== "undefined" && typeof window.tsParticles === "undefined") {
      tsParticles = {} // Or attempt to import it if you're using a module system
    } else if (typeof window !== "undefined") {
      tsParticles = window.tsParticles
    }
  
    function updateRecentSearches() {
      recentSearchesContainer.innerHTML = ""
      if (recentSearches.length > 0) {
        const heading = document.createElement("h3")
        heading.textContent = "Recent Searches"
        recentSearchesContainer.appendChild(heading)
  
        recentSearches.forEach((search) => {
          const badge = document.createElement("span")
          badge.classList.add("badge")
          badge.textContent = search
          badge.addEventListener("click", () => handleSearch(search))
          recentSearchesContainer.appendChild(badge)
        })
      }
    }
  
    function addToRecentSearches(search) {
      recentSearches = [search, ...recentSearches.filter((s) => s !== search).slice(0, 4)]
      localStorage.setItem("recentSearches", JSON.stringify(recentSearches))
      updateRecentSearches()
    }
  
    async function fetchSuggestions(input) {
      if (!input.trim()) {
        suggestionsContainer.innerHTML = ""
        return
      }
  
      try {
        const response = await fetch(`/api/suggestions?name=${input}`)
        const data = await response.json()
        displaySuggestions(data.suggestions || [])
      } catch (error) {
        console.error("Error fetching suggestions:", error)
        suggestionsContainer.innerHTML = ""
      }
    }
  
    function displaySuggestions(suggestions) {
      suggestionsContainer.innerHTML = ""
      suggestions.forEach((suggestion) => {
        const item = document.createElement("div")
        item.classList.add("suggestion-item")
        item.textContent = suggestion
        item.addEventListener("click", () => {
          searchInput.value = suggestion
          suggestionsContainer.innerHTML = ""
          handleSearch(suggestion)
        })
        suggestionsContainer.appendChild(item)
      })
    }
     // Initialize particles
tsParticles.load("particles-container", {
    particles: {
      number: {
        value: 20,
        density: {
          enable: true,
          value_area: 800
        }
      },
      color: {
        value: "#0284c7"
      },
      shape: {
        type: ["circle", "triangle"],
        stroke: {
          width: 0,
          color: "#000000"
        }
      },
      opacity: {
        value: 0.1,
        random: false
      },
      size: {
        value: 3,
        random: true
      },
      line_linked: {
        enable: true,
        distance: 150,
        color: "#0284c7",
        opacity: 0.1,
        width: 1
      },
      move: {
        enable: true,
        speed: 2,
        direction: "none",
        random: false,
        straight: false,
        out_mode: "out",
        bounce: false
      }
    },
    interactivity: {
      detect_on: "canvas",
      events: {
        onhover: {
          enable: true,
          mode: "repulse"
        },
        resize: true
      },
      modes: {
        repulse: {
          distance: 100,
          duration: 0.4
        }
      }
    },  
    retina_detect: true
  });  
  
    // Add animation to search results
    function animateResults() {
      const results = document.querySelectorAll('.medicine-info-section > *');
      results.forEach((result, index) => {
        result.style.animation = `slideIn 0.5s ease ${index * 0.1}s both`;
      });
    }
  
    // Enhanced loading animation
    function showLoading() {
      loadingContainer.style.display = 'block';
      loadingContainer.style.animation = 'fadeIn 0.3s ease';
    }
  
    function hideLoading() {
      loadingContainer.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => {
        loadingContainer.style.display = 'none';
      }, 300);
    }
  
    // Add smooth scroll to results
    function scrollToResults() {
      const resultsSection = document.querySelector('.medicine-info-section');
      if (resultsSection) {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  
    // Enhanced error display
    function showError(message) {
      errorContainer.textContent = message;
      errorContainer.style.display = 'block';
      errorContainer.style.animation = 'shake 0.5s ease';
      setTimeout(() => {
        errorContainer.style.animation = '';
      }, 500);
    }
  
  // Add keyframe animation for error shake
  const styleSheet = document.createElement("style")
  styleSheet.textContent = `
          @keyframes shake {
              0%, 100% { transform: translateX(0); }
              25% { transform: translateX(-10px); }
              75% { transform: translateX(10px); }
          }
          @keyframes fadeOut {
              from { opacity: 1; }
              to { opacity: 0; }
          }
      `
  document.head.appendChild(styleSheet)
  
  // Update the handleSearch function to use new animations
  async function handleSearch(searchQuery) {
    errorContainer.style.display = "none"
    showLoading()
    medicineInfoContainer.style.display = "none"
  
    try {
      const response = await fetch(`/api/medicine-info?name=${searchQuery}`)
      const data = await response.json()
  
      if (data.error || !data.results || data.results.length === 0) { // <-- Add null check
        showError(data.error || "Medicine information not found");
        return;
    } else {
        displayMedicineInfo(data.results[0])
        addToRecentSearches(searchQuery)
        scrollToResults()
        animateResults()
      }
    } catch (err) {
      showError("Failed to fetch medicine information")
    } finally {
      hideLoading()
    }
  }
  
  // Image upload functionality
  uploadButton.addEventListener("click", () => {
    imageUpload.click()
  })
  
  imageUpload.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (file) {
        showLoading();
        try {
            const formData = new FormData();
            formData.append("image", file);

            const response = await fetch("/api/extract-medicine-name", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (data.medicineName) {
                searchInput.value = data.medicineName;
                handleSearch(data.medicineName); // This will trigger the actual search
            } else {
                showError(data.error || "Failed to extract medicine name from the image.");
            }
        } catch (error) {
            console.error("Error uploading image:", error);
            showError("An error occurred while processing the image.");
        } finally {
            hideLoading();
        }
    }
});
  
  // Update displayMedicineInfo function
  function displayMedicineInfo(medicineInfo) {
    medicineInfoContainer.innerHTML = `
        <div class="medicine-info-header">
          <div class="top-buttons">
            <button id="printButton" aria-label="Print"><i data-lucide="printer"></i></button>
            <button id="shareButton" aria-label="Share"><i data-lucide="share-2"></i></button>
            <button id="bookmarkButton" aria-label="Bookmark"><i data-lucide="bookmark-plus"></i></button>
          </div>
          <h2><i data-lucide="pill"></i> ${medicineInfo.openfda?.brand_name?.[0] || "Unknown Medicine"}</h2>
          <p>${medicineInfo.openfda?.generic_name?.[0] || "No generic name available"}</p>
          <button id="pronounceButton" class="pronounce-button">
            <i data-lucide="volume-2"></i> Pronounce
          </button>
        </div>
        <div class="tab-list">
          <button class="tab active" data-tab="overview">Overview</button>
          <button class="tab" data-tab="dosage">Dosage</button>
          <button class="tab" data-tab="warnings">Warnings</button>
          <button class="tab" data-tab="ingredients">Ingredients</button>
        </div>
        <div class="tab-content" id="overviewTab">
          <h3><i data-lucide="activity"></i> Overview</h3>
          <p><strong>Manufacturer:</strong> ${medicineInfo.openfda?.manufacturer_name?.[0] || "N/A"}</p>
          <p><strong>Purpose:</strong> ${medicineInfo.purpose?.[0] || "N/A"}</p>
        </div>
        <div class="tab-content" id="dosageTab" style="display: none;">
          <h3><i data-lucide="syringe"></i> Dosage and Administration</h3>
          <div class="accordion-item">
            <div class="accordion-header">Dosage Information <i data-lucide="chevron-down"></i></div>
            <div class="accordion-content">${medicineInfo.dosage_and_administration?.[0] || "N/A"}</div>
          </div>
        </div>
        <div class="tab-content" id="warningsTab" style="display: none;">
          <h3><i data-lucide="alert-triangle"></i> Warnings and Precautions</h3>
          <div class="accordion-item">
            <div class="accordion-header">Warnings <i data-lucide="chevron-down"></i></div>
            <div class="accordion-content">${medicineInfo.warnings?.[0] || "N/A"}</div>
          </div>
          <div class="accordion-item">
            <div class="accordion-header">Precautions <i data-lucide="chevron-down"></i></div>
            <div class="accordion-content">${medicineInfo.precautions?.[0] || "N/A"}</div>
          </div>
          <div class="accordion-item">
            <div class="accordion-header">Side Effects <i data-lucide="chevron-down"></i></div>
            <div class="accordion-content">${medicineInfo.adverse_reactions?.[0] || "N/A"}</div>
          </div>
        </div>
        <div class="tab-content" id="ingredientsTab" style="display: none;">
          <h3><i data-lucide="flask"></i> Ingredients</h3>
          <p><strong>Active Ingredients:</strong></p>
          <div>${medicineInfo.active_ingredient?.map((ingredient) => `<span class="badge">${ingredient}</span>`).join("") || "N/A"}</div>
          <p><strong>Inactive Ingredients:</strong></p>
          <div>${medicineInfo.inactive_ingredient?.map((ingredient) => `<span class="badge">${ingredient}</span>`).join("") || "N/A"}</div>
        </div>
      `
  
    medicineInfoContainer.style.display = "block"
    setupTabs()
    setupAccordion()
    setupPronunciation(medicineInfo.openfda?.brand_name?.[0] || "")
    setupPrintAndShare()
    displayDoctors()
    if (typeof lucide !== "undefined") {
      lucide.createIcons()
    }
  }
  
  // Add displayDoctors function
  function displayDoctors() {
    const doctors = [
      {
        name: "Dr. Emily Johnson",
        specialty: "General Practitioner",
        image: "https://randomuser.me/api/portraits/women/68.jpg",
        phone: "+1 (555) 123-4567",
        email: "emily.johnson@example.com",
      },
      {
        name: "Dr. Michael Chen",
        specialty: "Cardiologist",
        image: "https://randomuser.me/api/portraits/men/42.jpg",
        phone: "+1 (555) 987-6543",
        email: "michael.chen@example.com",
      },
      {
        name: "Dr. Sarah Patel",
        specialty: "Pediatrician",
        image: "https://randomuser.me/api/portraits/women/33.jpg",
        phone: "+1 (555) 246-8135",
        email: "sarah.patel@example.com",
      },
    ]
  
    const doctorList = document.querySelector(".doctor-list")
    doctorList.innerHTML = doctors
      .map(
        (doctor) => `
        <div class="doctor-card">
          <img src="${doctor.image}" alt="${doctor.name}">
          <h3>${doctor.name}</h3>
          <p>${doctor.specialty}</p>
          <div class="contact-info">
            <a href="tel:${doctor.phone}"><i data-lucide="phone"></i></a>
            <a href="mailto:${doctor.email}"><i data-lucide="mail"></i></a>
          </div>
        </div>
      `,
      )
      .join("")
  
    consultDoctorSection.style.display = "block"
    if (typeof lucide !== "undefined") {
      lucide.createIcons()
    }
  }
  
  function setupTabs() {
    const tabs = document.querySelectorAll(".tab")
    const tabContents = document.querySelectorAll(".tab-content")
  
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("active"))
        tab.classList.add("active")
  
        const tabName = tab.getAttribute("data-tab")
        tabContents.forEach((content) => {
          content.style.display = content.id === `${tabName}Tab` ? "block" : "none"
        })
      })
    })
  }
  
  function setupAccordion() {
    const accordionHeaders = document.querySelectorAll(".accordion-header")
  
    accordionHeaders.forEach((header) => {
      header.addEventListener("click", () => {
        const content = header.nextElementSibling
        content.classList.toggle("active")
        const icon = header.querySelector("i")
        icon.setAttribute("data-lucide", content.classList.contains("active") ? "chevron-up" : "chevron-down")
        if (typeof lucide !== "undefined") {
          lucide.createIcons()
        }
      })
    })
  }
  
  function setupPronunciation(word) {
    const pronounceButton = document.getElementById("pronounceButton")
    pronounceButton.addEventListener("click", () => {
      const utterance = new SpeechSynthesisUtterance(word)
      speechSynthesis.speak(utterance)
    })
  }
  
  function setupPrintAndShare() {
    const printButton = document.getElementById("printButton")
    const shareButton = document.getElementById("shareButton")
  
    printButton.addEventListener("click", () => {
      window.print()
    })
  
    shareButton.addEventListener("click", async () => {
      try {
        await navigator.share({
          title: "Medicine Information",
          text: `Information about ${document.querySelector(".medicine-info-header h2").textContent}`,
          url: window.location.href,
        })
      } catch (error) {
        console.log("Error sharing:", error)
      }
    })
  }
  
  function setupDrugInteractions() {
    const checkInteractionButton = document.getElementById("checkInteractionButton")
    const interactionResult = document.getElementById("interactionResult")
  
    checkInteractionButton.addEventListener("click", () => {
      const drugA = document.getElementById("drugA").value
      const drugB = document.getElementById("drugB").value
  
      // In a real-world scenario, this would call an API to check for drug interactions
      // For this example, we'll just simulate an API call
      interactionResult.textContent = `Potential interaction between ${drugA} and ${drugB}. Please consult with your healthcare provider.`
    })
  }
  
  searchInput.addEventListener("input", () => fetchSuggestions(searchInput.value))
  searchButton.addEventListener("click", () => handleSearch(searchInput.value))
  
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark")
    const icon = themeToggle.querySelector("i")
    if (document.body.classList.contains("dark")) {
      icon.setAttribute("data-lucide", "sun")
    } else {
      icon.setAttribute("data-lucide", "moon")
    }
    if (typeof lucide !== "undefined") {
      lucide.createIcons()
    }
  })
  
  updateRecentSearches()
  if (typeof lucide !== "undefined") {
    lucide.createIcons()
  }
  })
  
  
