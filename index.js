const express = require('express');
const Web3 = require('web3');
const { abi: poolAbi } = require('@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json');
const fs = require('fs');

// Load configuration
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const web3 = new Web3(new Web3.providers.WebsocketProvider(config.DEFAULT_NODE_URL));
const daiTokenAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F'; // DAI token address

// ETH/DAI 0.3% fee pool address on mainnet
const poolAddress = '0xC2E9f25Be817b27912A3ABfE1f9bCDB16c18Bf12';

const poolContract = new web3.eth.Contract(poolAbi, poolAddress);

let latestSwapPrice = null;

const app = express();
const port = config.DEFAULT_API_PORT;

async function fetchSwapPrice() {
  try {
    const slot0 = await poolContract.methods.slot0().call();
    const sqrtPriceX96 = slot0.sqrtPriceX96;
    const price = (sqrtPriceX96 / 2 ** 96) ** 2;
    const currentPrice = parseFloat(price.toFixed(18));
    console.log(`Current ETH/DAI price: ${currentPrice}`);
    return currentPrice;
  } catch (error) {
    console.error('Error fetching swap price:', error.message);
    return null;
  }
}

async function updateSwapPrice() {
  latestSwapPrice = await fetchSwapPrice();
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
