const express = require("express");
const multer = require("multer");
const { createWorker } = require("tesseract.js");
const axios = require("axios");
require("dotenv").config();

const app = express();

// Configure multer for image upload
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, res, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
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

// Improved OCR processing
async function processImage(buffer) {
    const worker = await createWorker('eng');
    try {
        await worker.loadLanguage('eng');
        await worker.initialize('eng');
        const { data: { text } } = await worker.recognize(buffer);
        await worker.terminate();
        return text.trim();
    } catch (error) {
        console.error('OCR Error:', error);
        throw new Error('Failed to process image');
    }
}

// Enhanced medicine name extraction
function extractMedicineName(text) {
    // Split text into words and clean them
    const words = text
        .split(/[\s,.-]+/)
        .map(word => word.trim())
        .filter(word => word.length > 2)
        .filter(word => /^[A-Za-z]+$/i.test(word));

    // Find words that are likely to be medicine names
    const potentialNames = words.filter(word => 
        word.length >= 4 && // Most medicine names are at least 4 characters
        /^[A-Z]/i.test(word) && // Usually starts with a capital letter
        !/^(THE|AND|FOR|WITH|TAKE|DAILY|TWICE|ONCE)$/i.test(word) // Exclude common words
    );

    return potentialNames[0] || null;
}

// Medicine info endpoint
app.post("/api/extract-medicine-name", upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
    }

    try {
        // Process image with OCR
        const text = await processImage(req.file.buffer);
        console.log('Extracted text:', text);

        // Extract medicine name
        const medicineName = extractMedicineName(text);
        if (!medicineName) {
            return res.status(400).json({ error: "Could not detect a medicine name in the image" });
        }

        console.log('Detected medicine name:', medicineName);

        // Fetch medicine info from OpenFDA
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
            res.json({ results: [response.data.results[0]] });
        } else {
            // Try partial match
            const partialResponse = await axios.get("https://api.fda.gov/drug/label.json", {
                params: {
                    search: `openfda.brand_name:${medicineName}*`,
                    api_key: apiKey,
                    limit: 1
                }
            });

            if (partialResponse.data.results && partialResponse.data.results.length > 0) {
                res.json({ results: [partialResponse.data.results[0]] });
            } else {
                res.status(404).json({ error: "Medicine not found in database" });
            }
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            error: error.message || "Failed to process the image and find medicine information" 
        });
    }
});

// API Endpoints
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
