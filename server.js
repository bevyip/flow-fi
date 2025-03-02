const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const axios = require("axios");

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = 3000;

// Serve static files (CSS, JS) from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// Parse incoming JSON data
app.use(express.json());

// Route to serve the HTML page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Route to get CoinGecko data for Ethereum (without gas price data)
app.get("/api/coingecko", async (req, res) => {
  try {
    // Fetch Ethereum market data
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/coins/ethereum",
      {
        headers: {
          "x-cg-demo-api-key": process.env.COINGECKO_API_KEY,
        },
      }
    );

    // Send market data to the frontend
    const marketData = response.data.market_data;
    res.json({ market_data: marketData });
  } catch (error) {
    console.error("Error fetching CoinGecko data:", error);
    res.status(500).json({ error: "Failed to fetch CoinGecko data" });
  }
});

// Route to get Gas Fee estimation (using Alchemy API)
app.get("/api/gas", async (req, res) => {
  try {
    // Alchemy API request to fetch the current gas price
    const alchemyApiKey = process.env.ALCHEMY_API_KEY;
    const alchemyApiUrl = `https://eth-mainnet.alchemyapi.io/v2/${alchemyApiKey}`;

    const response = await axios.post(alchemyApiUrl, {
      jsonrpc: "2.0",
      method: "eth_gasPrice",
      params: [],
      id: 1,
    });

    // The gas price is returned in Wei, convert it to Gwei (1 Gwei = 1e9 Wei)
    const gasPriceWei = response.data.result;
    const gasPriceGwei = parseInt(gasPriceWei, 16) / 1e9;

    res.json({ gasPrice: gasPriceGwei }); // Return the gas price in Gwei
  } catch (error) {
    console.error("Error fetching gas fee data:", error);
    res.status(500).json({ error: "Failed to fetch gas fee data" });
  }
});

// Route to get actionable recommendations from Claude AI
app.post("/api/claude", async (req, res) => {
  try {
    const { ethPrice, ethPriceChange, gasPrice, liquidityData } = req.body;

    console.log(req.body);

    // Prepare data for Claude AI
    const liquidityText = liquidityData
      .map((data) => {
        return `${data.name} - Current APY: ${data.apy}%`;
      })
      .join("\n");

    // Create a more comprehensive prompt
    const prompt = `Analyze the user's DeFi portfolio and provide a liquidity optimization strategy.
  
  User Data:
  - ETH price: $${ethPrice}
  - ETH price change (24h): ${ethPriceChange}%
  - Gas Price: $${gasPrice}
  - Liquidity Data:
    ${liquidityText}
  
  Provide a recommendation based on the following categories:
  1. **Optimal APY** (the best protocol for liquidity based on current data)
  2. **Potential Gain** (percent return based on current APY and TVL)
  3. **Risk Level** (Low, Medium, High)
  4. **Confidence** (percentage confidence in the recommendation)
  
  Please suggest one of the following actions: 
  - **Rebalance** (suggest a specific protocol and how much to move)
  - **No action** (Optimal portfolio, keep current allocations)
  - **Adjust Range** (adjust the liquidity range for risk/return balance)`;

    const message = {
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    };

    // Make API call to Claude for recommendation
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      message,
      {
        headers: {
          "x-api-key": process.env.CLAUDE_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
      }
    );

    // Log and send back the Claude's response
    res.json({ recommendations: response.data });
  } catch (error) {
    console.error("Error fetching Claude AI response:", error);
    res
      .status(500)
      .json({ error: "Failed to generate recommendations from Claude AI" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
