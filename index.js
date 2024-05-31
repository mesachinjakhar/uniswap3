const { ethers } = require('ethers');
const { Pool, FACTORY_ADDRESS, FeeAmount } = require('@uniswap/v3-sdk');
const { Token } = require('@uniswap/sdk-core');
const IUniswapV3FactoryABI = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Factory.sol/IUniswapV3Factory.json').abi;

const provider = new ethers.providers.JsonRpcProvider('http://YOUR_ERIGON_NODE:8545'); // Replace with your Erigon node URL

const factoryAddress = FACTORY_ADDRESS;
const factoryContract = new ethers.Contract(factoryAddress, IUniswapV3FactoryABI, provider);

// Replace with your token addresses
const tokenAAddress = 'TOKEN_A_ADDRESS';
const tokenBAddress = 'TOKEN_B_ADDRESS';
const feeTier = FeeAmount.LOW; // Use FeeAmount.MEDIUM or FeeAmount.HIGH for other fee tiers

async function getPoolAddress(tokenAAddress, tokenBAddress, feeTier) {
  const poolAddress = await factoryContract.getPool(tokenAAddress, tokenBAddress, feeTier);
  return poolAddress;
}

getPoolAddress(tokenAAddress, tokenBAddress, feeTier)
  .then(poolAddress => console.log('Pool Address:', poolAddress))
  .catch(console.error);
