const express = require('express');
const { request, gql } = require('graphql-request');

const app = express();
const port = config.DEFAULT_API_PORT;

const UNISWAP_V3_SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3';

const GET_POOL_PRICES = gql`
  query poolPrices($poolAddress: ID!) {
    pool(id: $poolAddress) {
      token0Price
      token1Price
    }
  }
`;

const daiPoolAddress = '0x60594a405d53811d3bc4766596efd80fd545a270'; // DAI/WETH pool address

let latestPoolPrices = null;

async function fetchPoolPrices() {
  try {
    const { pool } = await request(
      UNISWAP_V3_SUBGRAPH_URL,
      GET_POOL_PRICES,
      { poolAddress: daiPoolAddress }
    );

    latestPoolPrices = {
      token0Price: parseFloat(pool.token0Price),
      token1Price: parseFloat(pool.token1Price),
    };

    console.log('Updated pool prices:', latestPoolPrices);
  } catch (error) {
    console.error('Error fetching pool prices:', error);
  }
}

app.get('/uniswap3', (req, res) => {
  res.json(latestPoolPrices);
});

// Fetch initial pool prices
fetchPoolPrices();

// Update pool prices periodically (e.g., every 10 seconds)
setInterval(fetchPoolPrices, 10000);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
