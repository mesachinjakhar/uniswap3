const { ethers } = require('ethers');
const { Pool, FACTORY_ADDRESS, FeeAmount } = require('@uniswap/v3-sdk');
const { Token } = require('@uniswap/sdk-core');
const IUniswapV3FactoryABI = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Factory.sol/IUniswapV3Factory.json').abi;

const provider = new ethers.providers.JsonRpcProvider('http://YOUR_ERIGON_NODE:8545'); // Replace with your Erigon node URL

const factoryAddress = FACTORY_ADDRESS;
const factoryContract = new ethers.Contract(factoryAddress, IUniswapV3FactoryABI, provider);

// Replace with your token addresses
const tokenAAddress = '0xC02aaA39b223FE8D0A0e5C4F27eaD9083C756Cc2';
const tokenBAddress = '0xA0b86991c6218b36c1d19D4a2e9eb0cE3606eB48';
const feeTier = FeeAmount.LOW; // Use FeeAmount.MEDIUM or FeeAmount.HIGH for other fee tiers

async function getPoolAddress(tokenAAddress, tokenBAddress, feeTier) {
  const poolAddress = await factoryContract.getPool(tokenAAddress, tokenBAddress, feeTier);
  return poolAddress;
}

getPoolAddress(tokenAAddress, tokenBAddress, feeTier)
  .then(poolAddress => console.log('Pool Address:', poolAddress))
  .catch(console.error);
