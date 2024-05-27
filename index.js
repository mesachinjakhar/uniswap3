function exitHandler(signal) {
    console.log(`Received signal: ${signal}`);
    process.exit();
}

// Catches ctrl+c event
process.on('SIGINT', exitHandler);

// Catches "kill pid"
process.on('SIGUSR1', exitHandler);
process.on('SIGUSR2', exitHandler);

// Catches uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    exitHandler('uncaughtException');
});

const fs = require('fs');
const config = require('./config.json');

const mathjs = require('mathjs');
const math = mathjs.create(mathjs.all);
math.config({ number: 'BigNumber' });

const ethers = require('ethers');
const Web3 = require('web3');
const web3Url = process.env.ETH_NODE_URL || config.DEFAULT_NODE_URL;
const web3UrlInfura = `wss://mainnet.infura.io/ws/v3/d8880e831dce46e5b9f3153e3dae3048`;
const web3Infura = new Web3(new Web3.providers.WebsocketProvider(web3UrlInfura, {
    clientConfig: {
        maxReceivedFrameSize: 10000000000,
        maxReceivedMessageSize: 10000000000,
    }
}));
const provider = new Web3.providers.WebsocketProvider(web3Url, {
    clientConfig: {
        maxReceivedFrameSize: 10000000000,
        maxReceivedMessageSize: 10000000000,
    }
});
provider.pollingInterval = 50;
const web3 = new Web3(provider);

const IUniswapV3FactoryAbi = require('@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json').abi;
const IUniswapV3QuoterAbi = require('@uniswap/v3-periphery/artifacts/contracts/interfaces/IQuoter.sol/IQuoter.json').abi;
const UniswapV3PoolAbi = require('@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json').abi;
const IERC20MetadataAbi = require('@uniswap/v3-periphery/artifacts/contracts/interfaces/IERC20Metadata.sol/IERC20Metadata.json').abi;

const factory = new web3Infura.eth.Contract(IUniswapV3FactoryAbi, config.UNISWAPV3_FACTORY_ADDRESS);
const quoter = new web3.eth.Contract(IUniswapV3QuoterAbi, config.UNISWAPV3_QUOTER_ADDRESS);

const ONE_WETH = ethers.utils.parseUnits('1', 18).toString();

function isWeth(address) {
    return config.WETH_ADDRESS_MAINNET === address;
}

async function getTokenInfo(address) {
    const token = new web3.eth.Contract(IERC20MetadataAbi, address);
    const symbol = await token.methods.symbol().call().catch(() => '');
    const name = await token.methods.name().call().catch(() => '');
    const decimals = await token.methods.decimals().call().catch(() => '');

    return { symbol, name, decimals };
}

const state = {
    tokens: {},
    pools: {},
    prices: {}
};

const PRICE_UPDATE_INTERVAL = 60 * 1000; // 1 minute

async function getPoolPrices(pool) {
    const poolContract = new web3.eth.Contract(UniswapV3PoolAbi, pool.pool);

    let tokenIn, tokenOut, isWethIn;
    if (isWeth(pool.token0)) {
        tokenIn = config.WETH_ADDRESS_MAINNET;
        tokenOut = pool.token1;
        isWethIn = true;
    } else {
        tokenIn = pool.token0;
        tokenOut = config.WETH_ADDRESS_MAINNET;
        isWethIn = false;
    }

    const amountIn = ethers.utils.parseUnits('1', 18);
    const amountsOut = await poolContract.methods.getAmountsOut(amountIn, [tokenIn, tokenOut]).call();
    const ethToTokenPrice = ethers.utils.formatUnits(amountsOut[1], state.tokens[tokenOut].decimals);

    const amountOut = ethers.utils.parseUnits('1', state.tokens[tokenOut].decimals);
    const amountsIn = await poolContract.methods.getAmountsIn(amountOut, [tokenIn, tokenOut]).call();
    const tokenToEthPrice = ethers.utils.formatUnits(amountsIn[0], 18);

    return {
        ethToTokenPrice,
        tokenToEthPrice,
        isWethIn
    };
}

async function updatePoolPrices() {
    for (const poolAddress in state.pools) {
        const pool = state.pools[poolAddress];
        const prices = await getPoolPrices(pool);

        const tokenAddress = isWeth(pool.token0) ? pool.token1 : pool.token0;
        if (!state.prices[tokenAddress]) {
            state.prices[tokenAddress] = {
                address: tokenAddress,
                ...state.tokens[tokenAddress],
                pools: {}
            };
        }

        state.prices[tokenAddress].pools[pool.pool] = {
            ...prices,
            ethToTokenPricePriceAdjust: prices.ethToTokenPrice,
            tokenToEthPricePriceAdjust: prices.tokenToEthPrice
        };
    }
}

async function getPoolEventsInRange(startBlock, endBlock) {
    let currentBlock = startBlock;
    const step = 10000; // adjust this step to fit under the 10000 results limit
    let events = [];

    while (currentBlock < endBlock) {
        const nextBlock = Math.min(currentBlock + step, endBlock);

        try {
            const eventBatch = await factory.getPastEvents('PoolCreated', {
                fromBlock: currentBlock,
                toBlock: nextBlock
            });
            events = events.concat(eventBatch);
        } catch (error) {
            console.error(`Error fetching events from blocks ${currentBlock} to ${nextBlock}:`, error);
        }

        currentBlock = nextBlock + 1; // move to the next range
    }

    return events;
}

async function main() {
    const latestBlock = await web3.eth.getBlockNumber();
    const fromBlock = 0;
    const toBlock = latestBlock;

    const events = await getPoolEventsInRange(fromBlock, toBlock);

    for (let i = 0, cnt = events.length; i < cnt; ++i) {
        const event = events[i];
        const isToken0Weth = isWeth(event.returnValues.token0);
        const isToken1Weth = isWeth(event.returnValues.token1);

        if (!isToken0Weth && !isToken1Weth) {
            continue;
        }

        if (!state.tokens[event.returnValues.token0]) {
            const tokenInfo = await getTokenInfo(event.returnValues.token0);

            if (!tokenInfo.name || !tokenInfo.symbol || !tokenInfo.decimals) {
                continue;
            }

            state.tokens[event.returnValues.token0] = tokenInfo;
        }
        if (!state.tokens[event.returnValues.token1]) {
            const tokenInfo = await getTokenInfo(event.returnValues.token1);

            if (!tokenInfo.name || !tokenInfo.symbol || !tokenInfo.decimals) {
                continue;
            }

            state.tokens[event.returnValues.token1] = tokenInfo;
        }

        state.pools[event.returnValues.pool] = event.returnValues;
    }

    updatePoolPrices(); // Initialize prices

    // Set up periodic price updates
    setInterval(updatePoolPrices, PRICE_UPDATE_INTERVAL);

    factory.events.PoolCreated({
        fromBlock: latestBlock + 1,
    })
    .on("connected", function (subscriptionId) {
        console.log('pools subscription connected', subscriptionId);
    })
    .on('data', async function (event) {
        const isToken0Weth = isWeth(event.returnValues.token0);
        const isToken1Weth = isWeth(event.returnValues.token1);

        if (!isToken0Weth && !isToken1Weth) {
            return;
        }

        if (!state.tokens[event.returnValues.token0]) {
            const tokenInfo = await getTokenInfo(event.returnValues.token0);

            if (!tokenInfo.name || !tokenInfo.symbol || !tokenInfo.decimals) {
                return;
            }

            state.tokens[event.returnValues.token0] = tokenInfo;
        }
        if (!state.tokens[event.returnValues.token1]) {
            const tokenInfo = await getTokenInfo(event.returnValues.token1);

            if (!tokenInfo.name || !tokenInfo.symbol || !tokenInfo.decimals) {
                return;
            }

            state.tokens[event.returnValues.token1] = tokenInfo;
        }

        state.pools[event.returnValues.pool] = event.returnValues;

        updatePoolPrices();
    })
    .on('changed', function (event) {
        console.log('changed', event);
    })
    .on('error', function (error, receipt) {
        console.log('pool created subscription error', error, receipt);
        process.exit(1);
    });
}

main();

const express = require('express');
const app = express();

app.use(function (req, res, next) {
    console.log(new Date(), req.connection.remoteAddress, req.method, req.url);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});

app.get('/uniswap3', function (req, res) {
    res.send(Object.keys(state.prices).map((key) => state.prices[key]));
});

const port = process.env.NODE_PORT || config.DEFAULT_API_PORT;
app.listen(port, () => console.log(`Listening on port ${port}`));