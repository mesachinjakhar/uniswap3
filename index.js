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

const diaTokenAddress = '0x84cC02D8Db94aD7aAc83B512DEcF4F5CF4488B4F'; // DIA token address
let latestSwapPrice = null;

const app = express();
const port = config.DEFAULT_API_PORT;

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

async function updateSwapPrice() {
  latestSwapPrice = await fetchSwapPrice(diaTokenAddress);
  console.log(`Updated DIA price: 1 ETH -> ${latestSwapPrice} DIA`);
}

app.get('/uniswap3', (req, res) => {
  res.json({ '1 ETH to DIA': latestSwapPrice });
});

web3.eth.subscribe('newBlockHeaders', async (error, result) => {
  if (!error) {
    console.log(`New block received. Block # ${result.number}`);
    await updateSwapPrice();
  } else {
    console.error('Error subscribing to new blocks:', error);
  }
});

app.listen(port, async () => {
  console.log(`Server running on http://localhost:${port}`);
  await updateSwapPrice(); // Fetch initial price
});
