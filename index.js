const { ethers } = require('ethers');
const { Pool, FeeAmount } = require('@uniswap/v3-sdk');
const { Token } = require('@uniswap/sdk-core');
const IUniswapV3FactoryABI = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Factory.sol/IUniswapV3Factory.json').abi;

const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545'); // Replace with your Erigon node URL

const factoryAddress = '0x1F98431c8aD98523631AE4a59f267346ea31F984';
const factoryContract = new ethers.Contract(factoryAddress, IUniswapV3FactoryABI, provider);

// Replace with your token addresses
const tokenAAddressRaw = '0xC02aaA39b223FE8D0A0e5C4F27eaD9083C756Cc2';
const tokenBAddressRaw = '0xA0b86991c6218b36c1d19D4a2e9eb0cE3606eB48';

const tokenAAddress = ethers.utils.getAddress(tokenAAddressRaw);
const tokenBAddress = ethers.utils.getAddress(tokenBAddressRaw);

console.log('Token A Address:', tokenAAddress); // Should log: 0xC02aaA39b223FE8D0A0e5C4F27eaD9083C756Cc2
console.log('Token B Address:', tokenBAddress); // Should log: 0xA0b86991c6218b36c1d19D4a2e9eb0cE3606eB48

const feeTier = FeeAmount.LOW; // Use FeeAmount.MEDIUM or FeeAmount.HIGH for other fee tiers

async function getPoolAddress(tokenAAddress, tokenBAddress, feeTier) {
  const poolAddress = await factoryContract.getPool(tokenAAddress, tokenBAddress, feeTier);
  return poolAddress;
}

getPoolAddress(tokenAAddress, tokenBAddress, feeTier)
  .then(poolAddress => console.log('Pool Address:', poolAddress))
  .catch(console.error);
