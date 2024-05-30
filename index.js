const express = require('express');
const Web3 = require('web3');
const { abi: quoterAbi } = require('@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json');
const { abi: poolAbi } = require('@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json');
const fs = require('fs');

// Load configuration
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

const web3 = new Web3(new Web3.providers.WebsocketProvider(config.DEFAULT_NODE_URL));

const quoterContract = new web3.eth.Contract(quoterAbi, config.UNISWAP_V3_QUOTER_ADDRESS);
const poolAddress = config.UNISWAP_V3_ETH_DAI_POOL_ADDRESS; // ETH/DAI pool address
const poolContract = new web3.eth.Contract(poolAbi, poolAddress);

const daiTokenAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F'; // DAI token address

let latestSwapPrice = null;

const app = express();
const port = config.DEFAULT_API_PORT;

const feeTiers = [500, 3000, 10000]; // Fee tiers: 0.05%, 0.3%, 1%

async function fetchSwapPrice() {
  try {
    const slot0 = await poolContract.methods.slot0().call();
    const sqrtPriceX96 = slot0.sqrtPriceX96;
    const currentPrice = (parseFloat(web3.utils.fromWei(sqrtPriceX96.toString(), 'ether')) ** 2) / (2 ** 192);
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
