const express = require('express');
const Web3 = require('web3');
const { ethers } = require('ethers');
const { abi: QuoterABI } = require('@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json');
const { abi: PoolABI } = require('@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json');

const app = express();
const port = 5001;

const config = {
    WETH_ADDRESS_MAINNET: ethers.utils.getAddress('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'),
    QUOTER_ADDRESS_MAINNET: ethers.utils.getAddress('0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'),
    ONE_WETH: ethers.utils.parseEther('1'),
    FEE: 3000 // Example fee tier
};

const state = {
    pools: {}, // To store pool data
    tokens: {} // To store token data
};

const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://127.0.0.1:8546'));

const quoter = new web3.eth.Contract(QuoterABI, config.QUOTER_ADDRESS_MAINNET);

// Helper function to check if the token is WETH
const isWeth = (token) => {
    return token.toLowerCase() === config.WETH_ADDRESS_MAINNET.toLowerCase();
};

// Function to get pool prices
const getPoolPrices = async (pool) => {
    let otherToken = isWeth(pool.token0) ? pool.token1 : pool.token0;
    try {
        console.log(`Fetching prices for pool: ${pool.pool}`);
        
        const ethToTokenPrice = await quoter.methods.quoteExactInputSingle(
            config.WETH_ADDRESS_MAINNET,
            ethers.utils.getAddress(otherToken),
            pool.fee,
            config.ONE_WETH,
            0
        ).call();
        
        console.log(`ethToTokenPrice for ${otherToken}: ${ethToTokenPrice}`);
        const ethToTokenPriceFormatted = ethers.utils.formatUnits(ethToTokenPrice, state.tokens[otherToken].decimals);
        console.log(`Formatted ethToTokenPrice: ${ethToTokenPriceFormatted}`);
        
        return { ethToTokenPriceFormatted };
    } catch (error) {
        console.error(`Error updating pool prices for ${pool.pool}:`, error);
        if (error.data) {
            const errorMsg = ethers.utils.toUtf8String(error.data);
            console.error(`Error message from contract: ${errorMsg}`);
        }
        return null;
    }
};

// Periodically update pool prices
const UPDATE_INTERVAL = 60000; // Update prices every minute
setInterval(async () => {
    try {
        for (const poolAddress in state.pools) {
            await updatePoolPrices(state.pools[poolAddress]);
        }
        console.log('Prices updated');
    } catch (error) {
        console.error('Error updating prices:', error);
    }
}, UPDATE_INTERVAL);

// Function to update pool prices
const updatePoolPrices = async (pool) => {
    let otherToken = isWeth(pool.token0) ? pool.token1 : pool.token0;
    try {
        console.log(`Updating prices for pool: ${pool.pool}`);
        
        const ethToTokenPrice = await quoter.methods.quoteExactInputSingle(
            config.WETH_ADDRESS_MAINNET,
            ethers.utils.getAddress(otherToken),
            pool.fee,
            config.ONE_WETH,
            0
        ).call();
        
        console.log(`ethToTokenPrice for ${otherToken}: ${ethToTokenPrice}`);
        const ethToTokenPriceFormatted = ethers.utils.formatUnits(ethToTokenPrice, state.tokens[otherToken].decimals);
        console.log(`Formatted ethToTokenPrice: ${ethToTokenPriceFormatted}`);
        
        pool.ethToTokenPrice = ethToTokenPriceFormatted;
    } catch (error) {
        console.error(`Error updating pool prices for ${pool.pool}:`, error);
        if (error.data) {
            const errorMsg = ethers.utils.toUtf8String(error.data);
            console.error(`Error message from contract: ${errorMsg}`);
        }
    }
};

// Endpoint to get pool prices
app.get('/uniswap3', async (req, res) => {
    try {
        const response = {};
        for (const poolAddress in state.pools) {
            const pool = state.pools[poolAddress];
            response[poolAddress] = await getPoolPrices(pool);
        }
        res.json(response);
    } catch (error) {
        console.error('Error fetching prices:', error);
        res.status(500).send('Error fetching prices');
    }
});

// Function to initialize pool and token data
const initializeData = async () => {
    // Example: initializing one pool with some tokens
    const examplePool = {
        pool: ethers.utils.getAddress('0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8'), // Example pool address
        token0: ethers.utils.getAddress('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'), // WETH
        token1: ethers.utils.getAddress('0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'), // USDC
        fee: config.FEE
    };

    // Adding pool to state
    state.pools[examplePool.pool] = examplePool;

    // Adding tokens to state
    state.tokens[examplePool.token0] = { decimals: 18 };
    state.tokens[examplePool.token1] = { decimals: 6 };

    console.log('Initialized data with example pool and tokens');
};

// Initialize data and start server
initializeData().then(() => {
    app.listen(port, () => {
        console.log(`Listening on port ${port}`);
    });
}).catch(error => {
    console.error('Error initializing data:', error);
});
