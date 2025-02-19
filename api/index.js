const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.send("Welcome to Medisearch Backend!");
});

app.get('/api/suggestions', async (req, res) => {
    const { name } = req.query;

    if (!name) {
        return res.json({ suggestions: [] });
    }

    try {
        const apiKey = process.env.OPENFDA_API_KEY;
        const response = await axios.get("https://api.fda.gov/drug/label.json", {
            params: {
                search: `openfda.brand_name:${name}*`,
                limit: 5,
                api_key: apiKey,
            },
        });

        const suggestions = response.data.results
            ? response.data.results
                .filter((medicine) => medicine.openfda && medicine.openfda.brand_name)
                .map((medicine) => medicine.openfda.brand_name[0])
            : [];

        res.json({ suggestions });
    } catch (error) {
        console.error("Error fetching suggestions:", error);
        res.json({ suggestions: [] });
    }
});

app.get('/api/medicine-info', async (req, res) => {
    const { name } = req.query;

    if (!name) {
        return res.status(400).json({ error: "Medicine name is required" });
    }

    try {
        const apiKey = process.env.OPENFDA_API_KEY;
        const response = await axios.get("https://api.fda.gov/drug/label.json", {
            params: {
                search: `openfda.brand_name:"${name}"`,
                api_key: apiKey,
                limit: 1,
            },
        });

        if (response.data.results && response.data.results.length > 0) {
            res.json({ results: response.data.results });
        } else {
            res.status(404).json({ error: "Medicine not found" });
        }
    } catch (error) {
        console.error("Error fetching medicine info:", error);
        res.status(500).json({ error: "Failed to fetch medicine information" });
    }
});

// Export the app for Vercel
module.exports = app;
