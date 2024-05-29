const express = require('express');
const Web3 = require('web3');
const { ethers } = require('ethers');
const { abi: QuoterABI } = require('@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json');
const { abi: PoolABI } = require('@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json');

const app = express();
const port = 5001;

const config = {
    WETH_ADDRESS_MAINNET: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    QUOTER_ADDRESS_MAINNET: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
    ONE_WETH: ethers.utils.parseEther('1'),
    FEE: 3000 // Example fee tier
};

const state = {
    pools: {}, // To store pool data
    tokens: {} // To store token data
};

const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://127.0.0.1:8546'));

const quoter = new web3.eth.Contract(QuoterABI, config.QUOTER_ADDRESS_MAINNET);

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

const getPoolPrices = async (pool) => {
    let otherToken = isWeth(pool.token0) ? pool.token1 : pool.token0;
    try {
        console.log(`Updating prices for pool: ${pool.pool}`);
        
        const ethToTokenPrice = await quoter.methods.quoteExactInputSingle(
            config.WETH_ADDRESS_MAINNET,
            otherToken,
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

const isWeth = (token) => {
    return token.toLowerCase() === config.WETH_ADDRESS_MAINNET.toLowerCase();
};

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

const updatePoolPrices = async (pool) => {
    let otherToken = isWeth(pool.token0) ? pool.token1 : pool.token0;
    try {
        console.log(`Updating prices for pool: ${pool.pool}`);
        
        const ethToTokenPrice = await quoter.methods.quoteExactInputSingle(
            config.WETH_ADDRESS_MAINNET,
            otherToken,
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

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});