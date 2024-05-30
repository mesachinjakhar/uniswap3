const { ethers } = require('ethers');
const { Pool, Route, Trade, TradeType, CurrencyAmount } = require('@uniswap/v3-sdk');
const { Token, Percent } = require('@uniswap/sdk-core');
const { Fetcher } = require('@uniswap/v3-sdk');
const fetch = require('node-fetch');

const config = {
    DEFAULT_NODE_URL: 'https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID', // replace with your Infura Project ID
    WETH_ADDRESS_MAINNET: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    DAI_ADDRESS_MAINNET: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    CUSTOM_AMOUNT: '1000000000000000000' // 1 ETH in wei
};

// Initialize ethers provider
const provider = new ethers.providers.JsonRpcProvider(config.DEFAULT_NODE_URL);

const WETH = new Token(1, config.WETH_ADDRESS_MAINNET, 18, 'WETH', 'Wrapped Ether');
const DAI = new Token(1, config.DAI_ADDRESS_MAINNET, 18, 'DAI', 'Dai Stablecoin');

const fetchUniswapPrice = async () => {
    try {
        // Fetch the pool data for WETH/DAI
        const WETHToken = await Fetcher.fetchTokenData(1, config.WETH_ADDRESS_MAINNET, provider);
        const DAIToken = await Fetcher.fetchTokenData(1, config.DAI_ADDRESS_MAINNET, provider);
        const WETH_DAI_POOL = await Fetcher.fetchPoolData(WETHToken, DAIToken, 3000, provider); // Using 0.3% fee tier for the example

        // Creating the route
        const route = new Route([WETH_DAI_POOL], WETH, DAI);

        // Defining the amount in
        const amountIn = CurrencyAmount.fromRawAmount(WETH, config.CUSTOM_AMOUNT);

        // Creating the trade
        const trade = new Trade(route, amountIn, TradeType.EXACT_INPUT);

        // Output the price
        console.log(`Price for swapping 1 ETH to DAI: ${trade.executionPrice.toSignificant(6)} DAI`);
    } catch (error) {
        console.error('Error fetching price:', error);
    }
};

fetchUniswapPrice().catch(console.error);
