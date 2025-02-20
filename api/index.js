const express = require("express")
const axios = require("axios")
const multer = require("multer")
const { OpenAI } = require("openai"); // Change import
require("dotenv").config()

const app = express()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 4 * 1024 * 1024, // 4.5MB limit
  },
})

// Initialize OpenAI configuration
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
  
// const openai = new OpenAIApi(configuration)

// CORS middleware
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") {
    return res.sendStatus(200)
  }
  next()
})

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error("Error:", err)
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  })
}

app.get("/", (req, res) => {
  res.json({ message: "Welcome to Medisearch Backend!" })
})

app.get("/api/suggestions", async (req, res, next) => {
  const { name } = req.query

  if (!name) {
    return res.json({ suggestions: [] })
  }

  try {
    const apiKey = process.env.OPENFDA_API_KEY
    if (!apiKey) {
      throw new Error("FDA API key is not configured")
    }

    const response = await axios.get("https://api.fda.gov/drug/label.json", {
      params: {
        search: `openfda.brand_name:${name}*`,
        limit: 5,
        api_key: apiKey,
      },
    })

    const suggestions = response.data.results
      ? response.data.results
          .filter((medicine) => medicine.openfda && medicine.openfda.brand_name)
          .map((medicine) => medicine.openfda.brand_name[0])
      : []

    res.json({ suggestions })
  } catch (error) {
    console.error("FDA API Error:", error.response?.data || error.message);
    next(error)
  }
})

app.get("/api/medicine-info", async (req, res, next) => {
  const { name } = req.query

  if (!name) {
    return res.status(400).json({ error: "Medicine name is required" })
  }

  try {
    const apiKey = process.env.OPENFDA_API_KEY
    if (!apiKey) {
      throw new Error("FDA API key is not configured")
    }

    const response = await axios.get("https://api.fda.gov/drug/label.json", {
      params: {
        search: `openfda.brand_name:"${name}"`,
        api_key: apiKey,
        limit: 1,
      },
    })

    if (response.data.results && response.data.results.length > 0) {
      res.json({ results: response.data.results })
    } else {
      res.status(404).json({ error: "Medicine not found" })
    }
  } catch (error) {
    console.error("FDA API Error:", error.response?.data || error.message);
    next(error)
  }
})

app.post("/api/extract-medicine-name", upload.single("image"), async (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" })
    }
  
    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("OpenAI API key is not configured")
      }
  
      // Log the image details
      console.log("Image received:", {
        mimetype: req.file.mimetype,
        size: req.file.size,
        originalName: req.file.originalname
      });
  
      // Validate image type
      if (!req.file.mimetype.startsWith('image/')) {
        return res.status(400).json({ error: "Invalid file type. Please upload an image." });
      }
  
      const base64Image = req.file.buffer.toString("base64")
      
      // Log the API call
      console.log("Calling OpenAI API...");
      
      const response = await openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please extract and return only the medicine name from this image. If multiple medicine names are present, return the most prominent one. If no medicine name is found, respond with 'NO_MEDICINE_NAME_FOUND'.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${req.file.mimetype};base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 100,
      })
  
      // Log the API response
      console.log("OpenAI API Response:", response.choices[0].message);
  
      const medicineName = response.choices[0].message.content.trim();
  
      if (!medicineName || medicineName === 'NO_MEDICINE_NAME_FOUND') {
        return res.status(400).json({ 
          error: "Could not detect medicine name in the image",
          details: "The image processing service could not identify a medicine name. Please ensure the image clearly shows a medicine name and try again."
        })
      }
  
      res.json({ medicineName })
    } catch (error) {
      console.error("Error processing image:", error);
      
      if (error.response?.status === 429) {
        return res.status(429).json({ 
          error: "Rate limit exceeded. Please try again later.",
          details: "Too many requests to the image processing service. Please wait a moment before trying again."
        })
      }
      
      // Enhanced error response
      return res.status(500).json({
        error: "Failed to process the image",
        details: error.message || "An unexpected error occurred while processing the image"
      });
    }
  })
// Apply error handling middleware
app.use(errorHandler)

// Export the app for Vercel
module.exports = app

