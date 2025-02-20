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

// Extracts text from image using Tesseract.js
async function processImage(buffer) {
    const worker = await createWorker("eng");
    try {
        await worker.loadLanguage("eng");
        await worker.initialize("eng");
        const { data: { text } } = await worker.recognize(buffer);
        return text;
    } finally {
        await worker.terminate();
    }
}

// Extracts the most likely medicine name from OCR text
function extractMostLikelyMedicineName(text) {
    const words = text
        .replace(/[^\w\s]/gi, '')
        .split(/\s+/)
        .filter(word => word.length > 2 && isValidWord(word));

    return words.length > 0 ? words[0] : null;
}

function isValidWord(word) {
    return isNaN(word) && /^[A-Za-z]+$/.test(word);
}

// Fetches medicine details from OpenFDA API
async function fetchMedicineInfo(medicineName) {
    try {
        console.log(`Searching OpenFDA for medicine: ${medicineName}`);

        const apiKey = process.env.OPENFDA_API_KEY;
        if (!apiKey) {
            throw new Error("FDA API key is not configured");
        }

        const response = await axios.get("https://api.fda.gov/drug/label.json", {
            params: { 
                search: `openfda.brand_name:"${medicineName}"`, 
                api_key: apiKey, 
                limit: 1 
            }
        });

        if (response.data.results && response.data.results.length > 0) {
            return { results: [response.data.results[0]] };
        }

        // Try partial match if exact match fails
        const partialResponse = await axios.get("https://api.fda.gov/drug/label.json", {
            params: { 
                search: `openfda.brand_name:${medicineName}*`, 
                api_key: apiKey, 
                limit: 1 
            }
        });

        if (partialResponse.data.results && partialResponse.data.results.length > 0) {
            return { results: [partialResponse.data.results[0]] };
        }

        return { error: "Medicine not found in database" };
    } catch (error) {
        console.error("OpenFDA API Error:", error.response?.data || error.message);
        throw new Error("Failed to fetch medicine information");
    }
}

// API Endpoints
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

        const medicineInfo = await fetchMedicineInfo(medicineName);
        if (medicineInfo.error) {
            return res.status(404).json({ error: medicineInfo.error });
        }

        res.json(medicineInfo);
    } catch (error) {
        console.error("Error processing image:", error);
        res.status(500).json({ error: error.message || "Failed to process the image" });
    }
});

app.get("/api/medicine-info", async (req, res) => {
    const { name } = req.query;

    if (!name) {
        return res.status(400).json({ error: "Medicine name is required" });
    }

    try {
        const medicineInfo = await fetchMedicineInfo(name);
        res.json(medicineInfo);
    } catch (error) {
        console.error("Error fetching medicine info:", error);
        res.status(500).json({ error: error.message || "Failed to fetch medicine information" });
    }
});

app.get("/api/suggestions", async (req, res) => {
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
            params: { 
                search: `openfda.brand_name:${name}*`, 
                limit: 5, 
                api_key: apiKey 
            }
        });

        const suggestions = response.data.results
            ? response.data.results
                .filter(medicine => medicine.openfda?.brand_name)
                .map(medicine => medicine.openfda.brand_name[0])
            : [];

        res.json({ suggestions });
    } catch (error) {
        console.error("FDA API Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch suggestions" });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error("Error:", err);
    res.status(err.status || 500).json({ 
        error: err.message || "Internal server error" 
    });
});

module.exports = app;
