// Helper function to fetch DeFiLlama, CoinGecko data and Claude's recommendations
async function fetchData() {
  const liquidityData = await getDeFiLlamaData();
  const { ethPrice, ethPriceChange, gasPrice } = await getCoinGeckoAndGasData();

  // Send the data to Claude API
  const response = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ethPrice,
      ethPriceChange,
      gasPrice,
      liquidityData,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Claude's recommendations`);
  }

  return await response.json();
}

// Helper function to parse the recommendation text and clean it up
function parseRecommendations(recommendationsText) {
  return recommendationsText
    .split("\n")
    .filter((line) => line.trim() !== "")
    .slice(1, 7)
    .map((line) => {
      return line.replace(/^-\s*/, "").replace(/^"|"$/g, "").trim();
    });
}

function shiftContentDown() {
  for (let i = 5; i > 1; i--) {
    const currentDiv = document.getElementById(`item-${i}`);
    const previousDiv = document.getElementById(`item-${i - 1}`);

    if (previousDiv && currentDiv) {
      currentDiv.innerHTML = previousDiv.innerHTML;
    }
  }
}

function updateItems(recommendations, currentRecommendationIndex) {
  for (let i = 1; i <= 5; i++) {
    const itemDiv = document.getElementById(`item-${i}`);
    if (itemDiv) {
      const newRecommendation =
        recommendations[
          (currentRecommendationIndex + i - 1) % recommendations.length
        ];

      itemDiv.classList.add("fade-out");

      // Wait for fade-out to finish before updating the content
      setTimeout(() => {
        itemDiv.innerHTML = `<div class="content">${newRecommendation}</div><span class="time-ago">${getTimeAgo(
          i
        )}</span>`;

        itemDiv.classList.add("fade-in");

        itemDiv.classList.remove("fade-out");
      }, 500);
    }
  }
}

// Helper function to determine the correct "time-ago" value for each item
function getTimeAgo(itemIndex) {
  switch (itemIndex) {
    case 1:
      return "Now";
    case 2:
      return "20 min ago";
    case 3:
      return "32 min ago";
    case 4:
      return "40 min ago";
    case 5:
      return "1h ago";
    default:
      return "Unknown time";
  }
}

// Main code execution
document.addEventListener("DOMContentLoaded", async function () {
  try {
    const data = await fetchData();

    // Access and parse recommendations
    const recommendationsText =
      data.recommendations?.text || "No recommendations available.";
    const recommendations = parseRecommendations(recommendationsText);

    let currentRecommendationIndex = 0;

    setInterval(() => {
      shiftContentDown();

      // Update items with the latest recommendations
      updateItems(recommendations, currentRecommendationIndex);

      // Update the recommendation index (cycling through the recommendations array)
      currentRecommendationIndex =
        (currentRecommendationIndex + 1) % recommendations.length;
    }, 5000); // Update every 5 seconds
  } catch (error) {
    console.error("Error fetching Claude's recommendations:", error);
  }
});

async function getDeFiLlamaData() {
  try {
    const response = await fetch("https://api.llama.fi/protocols");
    const data = await response.json();

    // Extract data for the selected protocols (e.g., Uniswap, Curve, Balancer)
    const protocolData = [data[28], data[42], data[88]];

    // Format the liquidity data
    const liquidityData = protocolData.map((protocol) => ({
      name: protocol.name,
      apy: protocol.apy || protocol.change_1d || "N/A",
      volatility: protocol.change_7d || 0,
      tvl: protocol.tvl || 0, // Total Value Locked
    }));

    return liquidityData;
  } catch (error) {
    console.error("Error fetching DeFiLlama data:", error);
    throw new Error("Failed to load DeFiLlama data.");
  }
}

async function getCoinGeckoAndGasData() {
  try {
    const coinGeckoResponse = await fetch("/api/coingecko");
    const coinGeckoData = await coinGeckoResponse.json();

    const marketData = coinGeckoData.market_data;
    const ethPrice = marketData.current_price.usd;
    const ethPriceChange = marketData.price_change_percentage_24h;

    const gasData = await fetch("/api/gas");
    const gasDataJson = await gasData.json();
    const gasPrice = gasDataJson.gasPrice;

    return { ethPrice, ethPriceChange, gasPrice };
  } catch (error) {
    console.error("Error fetching CoinGecko or gas data:", error);
    throw new Error("Failed to load CoinGecko or gas data.");
  }
}

/* Depreciated */
function formatClaudeResponseText(text) {
  text = text.replace(/^# (.*)/gm, "<h1>$1</h1>");
  text = text.replace(/^## (.*)/gm, "<h2>$1</h2>");
  text = text.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
  text = text.replace(/^- (.*)/gm, "<ul><li>$1</li></ul>");
  text = text.replace(
    /(\d+\.) (.*)(?=\n|$)/gm,
    (match, number, content) => `<ul><li>${content}</li></ul>`
  );
  text = text.replace(/^(?!<h1>|<h2>|<ul>|<ol>|<b>)(.+)$/gm, "<p>$1</p>");
  return text;
}
