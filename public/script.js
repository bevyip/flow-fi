document
  .getElementById("automate")
  .addEventListener("click", async function () {
    try {
      const automateButton = document.getElementById("automate");
      automateButton.style.display = "none"; // Hide the button

      const container = document.getElementById("recommendations-container");
      container.innerHTML = "<div class='spinner'></div>";

      // Fetch DeFiLlama and CoinGecko data
      const liquidityData = await getDeFiLlamaData();
      const { ethPrice, ethPriceChange, gasPrice } =
        await getCoinGeckoAndGasData();

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

      const data = await response.json();
      const recommendations =
        data.recommendations?.content?.[0]?.text ||
        "No recommendations available.";

      // Clear the spinner and display recommendations
      container.innerHTML = "";
      const recommendationItem = document.createElement("div");
      recommendationItem.classList.add("recommendation-item");

      const title = document.createElement("h2");
      title.textContent = "Claude's Automated Recommendation";

      const content = document.createElement("div");
      content.innerHTML = formatClaudeResponseText(recommendations);

      recommendationItem.appendChild(title);
      recommendationItem.appendChild(content);
      container.appendChild(recommendationItem);
    } catch (error) {
      console.error("Error fetching Claude's recommendations:", error);
      const container = document.getElementById("recommendations-container");
      container.innerHTML =
        "<p>Error fetching recommendations. Please try again.</p>";
    } finally {
      const automateButton = document.getElementById("automate");
      automateButton.style.display = "inline-block"; // Show the button again
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
