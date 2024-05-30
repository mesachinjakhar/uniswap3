const { ethers } = require("ethers");
const config = require('./config.json');

// ABI for the Quoter contract's quoteExactInputSingle method
const QUOTER_ABI = [
  "function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external view returns (uint256 amountOut)"
];

async function getSwapPrice() {
  // Connect to the local Erigon node
  const provider = new ethers.providers.JsonRpcProvider(config.DEFAULT_NODE_URL);

  // Define addresses and parameters
  const WETH_ADDRESS = config.WETH_ADDRESS_MAINNET;
  const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F"; // DAI mainnet address
  const POOL_FEE = 3000; // 0.3% pool fee tier
  const AMOUNT_IN = ethers.utils.parseEther('1'); // 1 WETH
  const SQRT_PRICE_LIMIT_X96 = 0; // No price limit

  // Instantiate the Quoter contract
  const quoter = new ethers.Contract(config.UNISWAPV3_QUOTER_ADDRESS, QUOTER_ABI, provider);

  // Get the quoted amount out
  const amountOut = await quoter.callStatic.quoteExactInputSingle(
    WETH_ADDRESS,
    DAI_ADDRESS,
    POOL_FEE,
    AMOUNT_IN,
    SQRT_PRICE_LIMIT_X96
  );

  console.log(`Swap 1 WETH to DAI: ${ethers.utils.formatUnits(amountOut, 18)} DAI`);
}

getSwapPrice().catch(console.error);

