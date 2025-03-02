const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const axios = require("axios");

dotenv.config();

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Route to get CoinGecko data for Ethereum (without gas price data)
app.get("/api/coingecko", async (req, res) => {
  try {
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/coins/ethereum",
      {
        headers: {
          "x-cg-demo-api-key": process.env.COINGECKO_API_KEY,
        },
      }
    );

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

    res.json({ gasPrice: gasPriceGwei });
  } catch (error) {
    console.error("Error fetching gas fee data:", error);
    res.status(500).json({ error: "Failed to fetch gas fee data" });
  }
});

// Route to get actionable recommendations from Claude AI
app.post("/api/claude", async (req, res) => {
  try {
    const { ethPrice, ethPriceChange, gasPrice, liquidityData } = req.body;

    const liquidityText = liquidityData
      .map((data) => {
        return `${data.name} - Current APY: ${data.apy}%`;
      })
      .join("\n");

    // Note: Prompt has been adjusted for MVP Prototype.
    const prompt = `Analyze the user's DeFi portfolio.

User Data:
- ETH price: $${ethPrice}
- ETH price change (24h): ${ethPriceChange}%
- Gas Price: $${gasPrice}
- Liquidity Data:
  ${liquidityText}

Generate 5 short, realistic live market news examples. These should be concise, one-liners (max 75 characters) that summarize the recommended actions or insights, formatted like live market news. Each one should focus on liquidity management, potential gains, and market trends. Each sentence ends with a period.

Example of the expected output:
- "Uniswap V3 sees a +2.5% APY as liquidity demand increases."
- "Balancer V2 liquidity is offering a projected +1.2% return with minimal risk."
- "Curve's LPs yield +1.8% as ETH price stabilizes."
- "Consider rebalancing 0.5 ETH from Uniswap V3 to Curve for optimized returns."
- "Adjust range on Balancer V2 to capture more fees with current market volatility."
- "ETH liquidity pools yield steady returns, with minimal impermanent loss risk."`;

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
    res.json({ recommendations: response.data.content[0] });
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
