const Web3 = require('web3');
const { ChainId, Token, Fetcher, Route } = require('@uniswap/sdk');
const { Web3Provider } = require('@ethersproject/providers');
const config = require('./config.json');

// Web3 setup
const web3Provider = new Web3Provider(new Web3.providers.WebsocketProvider(config.DEFAULT_NODE_URL));

// Uniswap setup
const daiAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F"; // DAI token address
const wethAddress = config.WETH_ADDRESS_MAINNET;

async function fetchSwapPrices() {
    // Fetch DAI token
    const dai = await Fetcher.fetchTokenData(ChainId.MAINNET, daiAddress, web3Provider);

    // Fetch WETH token
    const weth = await Fetcher.fetchTokenData(ChainId.MAINNET, wethAddress, web3Provider);

    // Fetch pair data for DAI/WETH
    const pair = await Fetcher.fetchPairData(dai, weth, web3Provider);
    
    // Fetch route
    const route = new Route([pair], weth);

    // Get price of 1 ETH in terms of DAI
    const amountIn = Web3.utils.toWei('1', 'ether'); // 1 ETH in wei
    const amountOut = route.midPrice.toSignificant(6);
    console.log('Price of 1 ETH in terms of DAI:', amountOut, 'DAI');
}

// Event listener for new blocks
web3Provider.on('block', fetchSwapPrices);
