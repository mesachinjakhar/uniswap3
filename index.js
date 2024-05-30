const { ethers } = require('ethers');
const fs = require('fs');
const { Token, WETH9, TradeType, Percent, CurrencyAmount } = require('@uniswap/sdk-core');
const { AlphaRouter } = require('@uniswap/smart-order-router');
const JSBI = require('jsbi');

// Load config
const config = JSON.parse(fs.readFileSync('config.json'));

// Define constants from config
const NODE_URL = config.DEFAULT_NODE_URL;
const WETH_ADDRESS = config.WETH_ADDRESS_MAINNET;
const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F"; // DAI mainnet address

// Initialize ethers provider
const provider = new ethers.providers.JsonRpcProvider(NODE_URL);

async function getSwapPrice() {
    // Fetch the token data
    const chainId = 1; // Mainnet
    const WETH = new Token(chainId, WETH_ADDRESS, 18, 'WETH', 'Wrapped Ether');
    const DAI = new Token(chainId, DAI_ADDRESS, 18, 'DAI', 'Dai Stablecoin');

    // Initialize the AlphaRouter
    const router = new AlphaRouter({ chainId, provider });

    // Create the amount of 1 WETH
    const amountIn = CurrencyAmount.fromRawAmount(WETH, JSBI.BigInt(ethers.utils.parseUnits("1", 18).toString()));

    // Generate the route using the AlphaRouter
    const route = await router.route(
        amountIn,
        DAI,
        TradeType.EXACT_INPUT,
        {
            recipient: "0x0000000000000000000000000000000000000000", // dummy address
            slippageTolerance: new Percent(50, 10000), // 0.5%
            deadline: Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes from the current Unix time
        }
    );

    if (route) {
        // Get the amount of DAI received for 1 WETH
        const amountOut = route.quote.toFixed(18);

        console.log(`1 ETH is equal to ${amountOut} DAI`);
    } else {
        console.error("No route found");
    }
}

getSwapPrice();

