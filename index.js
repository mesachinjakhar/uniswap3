const { ethers } = require('ethers');
const fs = require('fs');
const { ChainId, Token, Fetcher, Route, Trade, TradeType, TokenAmount, Percent } = require('@uniswap/sdk');
const { WETH } = require('@uniswap/sdk-core');

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
    const WETH_TOKEN = new Token(ChainId.MAINNET, WETH_ADDRESS, 18, 'WETH', 'Wrapped Ether');
    const DAI_TOKEN = new Token(ChainId.MAINNET, DAI_ADDRESS, 18, 'DAI', 'Dai Stablecoin');

    // Fetch the pair data
    const pair = await Fetcher.fetchPairData(WETH_TOKEN, DAI_TOKEN, provider);

    // Create a route
    const route = new Route([pair], WETH_TOKEN);

    // Create a trade for exact input of 1 WETH
    const trade = new Trade(route, new TokenAmount(WETH_TOKEN, ethers.utils.parseEther("1").toString()), TradeType.EXACT_INPUT);

    // Set slippage tolerance to 0.5%
    const slippageTolerance = new Percent('50', '10000');

    // Get the amount of DAI received for 1 WETH
    const amountOut = trade.minimumAmountOut(slippageTolerance).raw;

    // Convert the amountOut from Wei to DAI
    const amountOutInDai = ethers.utils.formatUnits(amountOut, 18);

    console.log(`1 ETH is equal to ${amountOutInDai} DAI`);
}

getSwapPrice();


