const express = require('express');
const Web3 = require('web3');
const fs = require('fs');

// Load configuration
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const web3 = new Web3(new Web3.providers.WebsocketProvider(config.DEFAULT_NODE_URL));

// ABI for UniswapV3Pool with slot0 function
const poolAbi = [
  {
    "inputs": [],
    "name": "slot0",
    "outputs": [
      { "internalType": "uint160", "name": "sqrtPriceX96", "type": "uint160" },
      { "internalType": "int24", "name": "tick", "type": "int24" },
      { "internalType": "uint16", "name": "observationIndex", "type": "uint16" },
      { "internalType": "uint16", "name": "observationCardinality", "type": "uint16" },
      { "internalType": "uint16", "name": "observationCardinalityNext", "type": "uint16" },
      { "internalType": "uint8", "name": "feeProtocol", "type": "uint8" },
      { "internalType": "bool", "name": "unlocked", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// ETH/DAI 0.3% fee pool address on mainnet
const poolAddress = '0xC2E9f25Be817b27912A3ABfE1f9bCDB16c18Bf12';

// Validate and correct address checksum
const checksumAddress = web3.utils.toChecksumAddress(poolAddress);

// Instantiate pool contract
const poolContract = new web3.eth.Contract(poolAbi, checksumAddress);

let latestSwapPrice = null;

const app = express();
const port = 3225;

async function fetchSwapPrice() {
  try {
    // Increase gas limit
    const slot0 = await poolContract.methods.slot0().call({ gas: 1000000 });
    console.log(`Slot0 response: ${JSON.stringify(slot0)}`);

    const sqrtPriceX96 = slot0.sqrtPriceX96;
    const price = (sqrtPriceX96 ** 2) / (2 ** 192);
    const currentPrice = parseFloat(price.toFixed(18));

    console.log(`Current ETH/DAI price: ${currentPrice}`);
    return currentPrice;
  } catch (error) {
    console.error('Error fetching swap price:', error);
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
  updateSwapPrice();
});
