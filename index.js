const { ethers } = require("ethers");
const fs = require('fs');

// Load config
const config = JSON.parse(fs.readFileSync('config.json'));

// Define constants from config
const NODE_URL = config.DEFAULT_NODE_URL;
const UNISWAPV3_QUOTER_ADDRESS = config.UNISWAPV3_QUOTER_ADDRESS;
const WETH_ADDRESS = config.WETH_ADDRESS_MAINNET;
const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F"; // DAI mainnet address
const AMOUNT_IN_WEI = ethers.utils.parseEther("1"); // 1 ETH in Wei

// ABI for Uniswap V3 Quoter
const quoterAbi = [
    "function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external view returns (uint256 amountOut)"
];

// Function to get the swap price
async function getSwapPrice() {
    // Connect to local Erigon node
    const provider = new ethers.providers.JsonRpcProvider(NODE_URL);

    // Ensure the provider is synced with the latest block
    const latestBlock = await provider.getBlockNumber();
    console.log(`Latest block number: ${latestBlock}`);

    // Create a contract instance for the Quoter
    const quoterContract = new ethers.Contract(UNISWAPV3_QUOTER_ADDRESS, quoterAbi, provider);

    // Fee tier for the ETH/DAI pool (0.3% fee)
    const fee = 3000;

    try {
        // Get the amount of DAI for 1 ETH using callStatic to make a read-only call
        const amountOut = await quoterContract.callStatic.quoteExactInputSingle(WETH_ADDRESS, DAI_ADDRESS, fee, AMOUNT_IN_WEI, 0);
        
        // Convert the amountOut from Wei to DAI
        const amountOutInDai = ethers.utils.formatUnits(amountOut, 18);

        console.log(`1 ETH is equal to ${amountOutInDai} DAI`);
    } catch (error) {
        console.error("Error fetching swap price:", error);
    }
}

// Call the function to get the swap price
getSwapPrice();
