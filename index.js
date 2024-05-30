// File: index.js
const express = require('express');
const Web3 = require('web3');
const { abi: quoterAbi } = require('@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json');
const axios = require('axios');
const fs = require('fs');

// Load configuration
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

const web3 = new Web3(new Web3.providers.WebsocketProvider(config.DEFAULT_NODE_URL));
const quoterContract = new web3.eth.Contract(quoterAbi, config.UNISWAPV3_QUOTER_ADDRESS);

const uniswapSubgraphUrl = 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3';

const app = express();
const port = config.DEFAULT_API_PORT;

async function fetchPools() {
  const query = `
    {
      pools(first: 1000) {
        id
        liquidity
        token0 {
          id
          symbol
        }
        token1 {
          id
          symbol
        }
      }
    }
  `;
  const response = await axios.post(uniswapSubgraphUrl, { query });
  return response.data.data.pools;
}

async function fetchSwapPrice(tokenAddress) {
  try {
    const amountIn = web3.utils.toWei('1', 'ether'); // 1 ETH in wei
    const amountOut = await quoterContract.methods.quoteExactInputSingle(
      config.WETH_ADDRESS_MAINNET,
      tokenAddress,
      3000, // Pool fee tier
      amountIn,
      0
    ).call();
    return web3.utils.fromWei(amountOut, 'ether');
  } catch (error) {
    console.error(`Error fetching swap price for token ${tokenAddress}:`, error.message);
    return null;
  }
}

app.get('/uniswap3', async (req, res) => {
  console.log('Fetching Uniswap v3 pools...');
  const pools = await fetchPools();
  const uniqueTokens = new Set();
  const tokenLiquidityMap = {};

  pools.forEach(pool => {
    if (parseInt(pool.liquidity) > 0) { // Filter pools with liquidity
      uniqueTokens.add(pool.token0.id);
      uniqueTokens.add(pool.token1.id);
      tokenLiquidityMap[pool.token0.id] = pool.liquidity;
      tokenLiquidityMap[pool.token1.id] = pool.liquidity;
    }
  });

  console.log('Fetching swap prices for tokens...');
  const prices = {};
  for (const token of uniqueTokens) {
    console.log(`Fetching price for token: ${token} with liquidity: ${tokenLiquidityMap[token]}`);
    const price = await fetchSwapPrice(token);
    if (price) {
      prices[token] = price;
    } else {
      prices[token] = null;
    }
  }

  res.json(prices);
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
