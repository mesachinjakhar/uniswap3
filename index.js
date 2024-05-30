const { ethers } = require('ethers');
const { ChainId, Token, WETH9, Fetcher, Route, Trade, TradeType, Percent, TokenAmount } = require('@uniswap/sdk-core');
const { AlphaRouter } = require('@uniswap/v3-sdk');
const JSBI = require('jsbi');
const fs = require('fs');

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
    const chainId = ChainId.MAINNET;
    const WETH = WETH9[chainId];
    const DAI = new Token(chainId, DAI_ADDRESS, 18, 'DAI', 'Dai Stablecoin');

    // Fetch the pair data
    const pair = await Fetcher.fetchPairData(WETH, DAI, provider);

    // Create a route
    const route = new Route([pair], WETH);

    // Create a trade for exact input of 1 WETH
    const amountIn = ethers.utils.parseUnits("1", 18); // 1 WETH
    const trade = new Trade(route, new TokenAmount(WETH, amountIn.toString()), TradeType.EXACT_INPUT);

    // Set slippage tolerance to 0.5%
    const slippageTolerance = new Percent('50', '10000'); // 0.5%

    // Get the minimum amount of DAI received for 1 WETH
    const amountOut = trade.minimumAmountOut(slippageTolerance).raw;

    // Convert the amountOut from Wei to DAI
    const amountOutInDai = ethers.utils.formatUnits(amountOut.toString(), 18);

    console.log(`1 ETH is equal to ${amountOutInDai} DAI`);
}

getSwapPrice();

