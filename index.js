// File: index.js
const express = require('express');
const Web3 = require('web3');
const { abi: quoterAbi } = require('@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json');
const fs = require('fs');

// Load configuration
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

const web3 = new Web3(new Web3.providers.WebsocketProvider(config.DEFAULT_NODE_URL));
const quoterContract = new web3.eth.Contract(quoterAbi, config.UNISWAPV3_QUOTER_ADDRESS);

const daiTokenAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F'; // DAI token address
let latestSwapPrice = null;

const app = express();
const port = config.DEFAULT_API_PORT;

async function fetchSwapPrice(tokenAddress) {
  try {
    const amountIn = web3.utils.toWei('1', 'ether'); // 1 ETH in wei
    const amountOut = await quoterContract.methods.quoteExactInputSingle(
      config.WETH_ADDRESS_MAINNET,
      tokenAddress,
      3000, // Pool fee tier (0.3%)
      amountIn,
      0
    ).call();
    return web3.utils.fromWei(amountOut, 'ether');
  } catch (error) {
    console.error(`Error fetching swap price for token ${tokenAddress}:`, error.message);
    return null;
  }
}

async function updateSwapPrice() {
  latestSwapPrice = await fetchSwapPrice(daiTokenAddress);
  console.log(`Updated DAI price: 1 ETH -> ${latestSwapPrice} DAI`);
}

app.get('/uniswap3', (req, res) => {
  res.json({ '1 ETH to DAI': latestSwapPrice });
});

web3.eth.subscribe('newBlockHeaders', async (error, result) => {
  if (!error) {
    console.log(`New block received. Block # ${result.number}`);
    await updateSwapPrice();
  } else {
    console.error('Error subscribing to new block headers:', error);
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  updateSwapPrice(); // Initial price fetch
});
