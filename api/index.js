const express = require("express");
const axios = require("axios");
const multer = require("multer");
const { createWorker } = require("tesseract.js");
require("dotenv").config();

const app = express();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 4 * 1024 * 1024 }, // 4MB limit
});

// CORS middleware
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }
    next();
});

// **Extracts text from image using Tesseract.js**
async function processImage(buffer) {
    const worker = await createWorker("eng");
    await worker.loadLanguage("eng");
    await worker.initialize("eng");
    const { data: { text } } = await worker.recognize(buffer);
    await worker.terminate();
    return text;
}

// **Extracts the most likely medicine name from OCR text**
function extractMostLikelyMedicineName(text) {
    const words = text
        .replace(/[^\w\s]/gi, '') // Remove special characters
        .split(/\s+/) // Split into words
        .filter(word => word.length > 2 && isValidWord(word)); // Keep meaningful words

    return words.length > 0 ? words[0] : null; // Pick the first valid word
}

function isValidWord(word) {
    return isNaN(word) && /^[A-Za-z]+$/.test(word); // Ensure it's a valid word (not a number)
}

// **Fetches medicine details from OpenPDA API**
async function fetchMedicineInfo(medicineName) {
    try {
        console.log(`Searching OpenPDA for medicine: ${medicineName}`);

        const apiKey = process.env.OPENFDA_API_KEY;
        if (!apiKey) {
            throw new Error("FDA API key is not configured");
        }

        // Function to fetch data from FDA API
        const fetchData = async (searchTerm) => {
            const response = await axios.get("https://api.fda.gov/drug/label.json", {
                params: { search: searchTerm, api_key: apiKey, limit: 1 }
            });
            return response.data.results && response.data.results.length > 0 ? response.data.results[0] : null;
        };

        // Try an exact match first
        let medicineInfo = await fetchData(`openfda.brand_name:"${medicineName}"`);
        if (medicineInfo) {
            return medicineInfo; // Return first match
        }

        // If no exact match, try a partial match (fuzzy search)
        console.log("No exact match. Trying partial search...");
        medicineInfo = await fetchData(`openfda.brand_name:${medicineName}*`);
        
        return medicineInfo;

    } catch (error) {
        console.error("API Request Failed:", error.message || error.response); // Log error details
        return null;
    }
}


// Update the POST /api/extract-medicine-name endpoint
app.post("/api/extract-medicine-name", upload.single("image"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
    }

    try {
        const text = await processImage(req.file.buffer);
        console.log("Extracted text:", text);

        const medicineName = extractMostLikelyMedicineName(text);
        if (!medicineName) {
            return res.status(400).json({ error: "Could not detect a medicine name" });
        }

        console.log("Detected Medicine Name:", medicineName);
        res.json({ medicineName }); // Return only the extracted name
    } catch (error) {
        console.error("Error processing image:", error);
        res.status(500).json({ error: error.message || "Failed to process the image" });
    }
});
// **Existing API Routes (No Changes)**

app.get("/", (req, res) => {
    res.json({ message: "Welcome to Medisearch Backend!" });
});

app.get("/api/suggestions", async (req, res, next) => {
    const { name } = req.query;

    if (!name) {
        return res.json({ suggestions: [] });
    }

    try {
        const apiKey = process.env.OPENFDA_API_KEY;
        if (!apiKey) {
            throw new Error("FDA API key is not configured");
        }

        const response = await axios.get("https://api.fda.gov/drug/label.json", {
            params: { search: `openfda.brand_name:${name}*`, limit: 5, api_key: apiKey }
        });

        const suggestions = response.data.results
            ? response.data.results
                  .filter((medicine) => medicine.openfda && medicine.openfda.brand_name)
                  .map((medicine) => medicine.openfda.brand_name[0])
            : [];

        res.json({ suggestions });
    } catch (error) {
        console.error("FDA API Error:", error.response?.data || error.message);
        next(error);
    }
});

app.get("/api/medicine-info", async (req, res, next) => {
    const { name } = req.query;

    if (!name) {
        return res.status(400).json({ error: "Medicine name is required" });
    }

    try {
        const medicineInfo = await fetchMedicineInfo(name);
        if (!medicineInfo) {
            return res.status(404).json({ error: "Medicine not found in database" });
        }

        // Wrap in array to match frontend expectations
        res.json({ results: [medicineInfo] }); // <-- Add array wrapper

    } catch (error) {
        console.error("Error fetching medicine info:", error);
        res.status(500).json({ error: "Failed to fetch medicine information" });
    }
});

// **Apply error handling middleware**
app.use((err, req, res, next) => {
    console.error("Error:", err);
    res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

// **Export the app for Vercel**
module.exports = app;
