const { AlchemyProvider } = require("@alchemy-web3/alchemy-provider");
const { ethers } = require("ethers");
const config = require("./config.json"); // Assuming your config.json is in the same directory

const provider = new AlchemyProvider("http://localhost:8545"); // Replace with your Erigon node URL if different
const quoterAddress = config.UNISWAPV3_QUOTER_ADDRESS;
const WETH_ADDRESS = config.WETH_ADDRESS_MAINNET;

const quoterContract = new ethers.Contract(quoterAddress, [
  "function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) view returns (uint256 amountOut)"
], provider);

async function getSwapAmount() {
  try {
    const amountIn = ethers.utils.parseUnits("1", 18); // 1 ETH
    const amountOut = await quoterContract.quoteExactInputSingle(
      WETH_ADDRESS,
      config.UNISWAPV3_DAI_ADDRESS, // Replace with DAI contract address
      3000, // Pool fee (0.3%)
      amountIn,
      0 // sqrtPriceLimitX96 (any price)
    );

    const formattedAmountOut = ethers.utils.formatUnits(amountOut, 18);
    console.log(`1 ETH = ${formattedAmountOut} DAI (estimated)`);
  } catch (error) {
    console.error("Error fetching swap amount:", error);
  }
}

getSwapAmount();

