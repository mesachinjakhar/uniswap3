// File: index.js
const Web3 = require('web3');
const { abi: quoterAbi } = require('@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json');
const axios = require('axios');
const fs = require('fs');

// Load configuration
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

const web3 = new Web3(new Web3.providers.WebsocketProvider(config.DEFAULT_NODE_URL));
const quoterContract = new web3.eth.Contract(quoterAbi, config.UNISWAPV3_QUOTER_ADDRESS);

const uniswapSubgraphUrl = 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3';

async function fetchPools() {
  const query = `
    {
      pools(first: 1000) {
        id
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
    console.error(`Error fetching swap price for token ${tokenAddress}:`, error);
    return null;
  }
}

async function main() {
  console.log('Fetching Uniswap v3 pools...');
  const pools = await fetchPools();
  const uniqueTokens = new Set();
  
  pools.forEach(pool => {
    uniqueTokens.add(pool.token0.id);
    uniqueTokens.add(pool.token1.id);
  });

  console.log('Fetching swap prices for tokens...');
  for (const token of uniqueTokens) {
    const price = await fetchSwapPrice(token);
    if (price) {
      console.log(`1 ETH -> ${price} ${token}`);
    }
  }
}

main().catch(error => {
  console.error('Error in main execution:', error);
});
