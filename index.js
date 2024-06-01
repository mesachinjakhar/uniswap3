const fs = require('fs');
const config = require('./config.json');
const ethers = require('ethers');
const { ChainId, Token, WETH, Fetcher, Route } = require('@uniswap/sdk');
const Web3 = require('web3');

// Local Erigon node URLs
const web3Url = process.env.ETH_NODE_URL || config.DEFAULT_NODE_URL || 'ws://localhost:8546';
const provider = new Web3.providers.WebsocketProvider(web3Url, {
    clientConfig: {
        maxReceivedFrameSize: 10000000000,
        maxReceivedMessageSize: 10000000000,
    }
});
const web3 = new Web3(provider);

provider.on('connect', function () {
    console.log('WebSocket Connected');
});

provider.on('error', function (e) {
    console.error('WebSocket Error', e);
    process.exit(1);
});

provider.on('end', function (e) {
    console.error('WebSocket Connection Closed', e);
    process.exit(1);
});

const IUniswapV3FactoryAbi = require('@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json').abi;
const IUniswapV3QuoterAbi = require('@uniswap/v3-periphery/artifacts/contracts/interfaces/IQuoter.sol/IQuoter.json').abi;
const UniswapV3PoolAbi = require('@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json').abi;
const IERC20MetadataAbi = require('@uniswap/v3-periphery/artifacts/contracts/interfaces/IERC20Metadata.sol/IERC20Metadata.json').abi;

const factory = new web3.eth.Contract(IUniswapV3FactoryAbi, config.UNISWAPV3_FACTORY_ADDRESS);
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
    prices: {},
    customAmountInWei: config.CUSTOM_AMOUNT
};

async function getRealTimePrice(tokenAddress) {
    const token = await Fetcher.fetchTokenData(ChainId.MAINNET, tokenAddress);
    const weth = WETH[ChainId.MAINNET];
    const pair = await Fetcher.fetchPairData(token, weth);
    const route = new Route([pair], weth);

    return route.midPrice.toSignificant(6);
}

async function getPoolState(poolAddress) {
    const poolContract = new web3.eth.Contract(UniswapV3PoolAbi, poolAddress);
    const [slot0, liquidity] = await Promise.all([
        poolContract.methods.slot0().call(),
        poolContract.methods.liquidity().call()
    ]);

    return {
        sqrtPriceX96: slot0.sqrtPriceX96,
        tick: slot0.tick,
        liquidity
    };
}

function sqrtPriceX96ToPrice(sqrtPriceX96, token0Decimals, token1Decimals) {
    const numerator = ethers.BigNumber.from(sqrtPriceX96).pow(2).mul(ethers.BigNumber.from(10).pow(token1Decimals));
    const denominator = ethers.BigNumber.from(2).pow(192).mul(ethers.BigNumber.from(10).pow(token0Decimals));
    const price = numerator.div(denominator);
    return price;
}

async function computeSpotPrice(poolAddress, token0, token1) {
    const poolState = await getPoolState(poolAddress);

    const price0to1 = sqrtPriceX96ToPrice(poolState.sqrtPriceX96, token0.decimals, token1.decimals);

    return ethers.utils.formatUnits(price0to1, token1.decimals);
}

async function updatePoolPrices(pool) {
    let otherToken = isWeth(pool.token0) ? pool.token1 : pool.token0;

    const ethToTokenPrice = await quoter.methods.quoteExactInputSingle(
        config.WETH_ADDRESS_MAINNET,
        otherToken,
        pool.fee,
        ONE_WETH,
        0
    ).call().catch(() => 0);

    if (ethToTokenPrice === '0') {
        if (state.prices[otherToken]) {
            delete state.prices[otherToken].pools[pool.pool];
        }
        return;
    }

    const tokenToEthPrice = await quoter.methods.quoteExactOutputSingle(
        otherToken,
        config.WETH_ADDRESS_MAINNET,
        pool.fee,
        ONE_WETH,
        0
    ).call().catch(() => 0);

    if (tokenToEthPrice === '0') {
        if (state.prices[otherToken]) {
            delete state.prices[otherToken].pools[pool.pool];
        }
        return;
    }

    const token0 = state.tokens[pool.token0];
    const token1 = state.tokens[pool.token1];

    const realTimePrice = await computeSpotPrice(pool.pool, token0, token1);

    if (!state.prices[otherToken]) {
        state.prices[otherToken] = {
            address: otherToken,
            ...state.tokens[otherToken],
            pools: {}
        };
    }

    state.prices[otherToken].pools[pool.pool] = {
        ethToTokenPrice: ethers.utils.formatUnits(ethToTokenPrice, state.tokens[otherToken].decimals).toString(),
        tokenToEthPrice: ethers.utils.formatUnits(tokenToEthPrice, state.tokens[otherToken].decimals).toString(),
        realTimePrice
    };
}

const UNISWAPV3_SWAP_EVENT_TOPIC = '0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67';

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

    for (let event of events) {
        await handleEvent(event);
    }

    factory.events.PoolCreated({
        fromBlock: latestBlock + 1,
    })
    .on("data", async function (event) {
        await handleEvent(event);
    })
    .on('error', function (error, receipt) {
        console.log('pool created subscription error', error, receipt);
        process.exit(1);
    });

    web3.eth.subscribe('newBlockHeaders')
    .on("data", async function (blockHeader) {
        console.log('New Block:', blockHeader.number);
        await updateAllPrices();
    })
    .on('error', console.error);
}

async function handleEvent(event) {
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

    await updatePoolPrices(state.pools[event.returnValues.pool]);
}

async function updateAllPrices() {
    for (let poolId in state.pools) {
        await updatePoolPrices(state.pools[poolId]);
    }
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

app.get('/setEthAmount', async function (req, res) {
    if (!req.query || !req.query.amount) {
        return res.status(400).send({
            error: 'Parameter "amount" is required.'
        });
    }

    try {
        const inWei = ethers.utils.parseUnits(req.query.amount.toString(), 18).toString();
        state.customAmountInWei = inWei;
        config.CUSTOM_AMOUNT = inWei;

        fs.writeFileSync('./config.json', JSON.stringify(config, null, 2), function (err) {
            if (err) console.log(err);
        });

        res.send({
            amount: config.CUSTOM_AMOUNT
        });

        process.exit(1);
    } catch (e) {
        return res.status(400).send({
            error: 'Invalid value for parameter "amount". A string in ETH units is required.',
        });
    }
});

const port = process.env.NODE_PORT || config.DEFAULT_API_PORT;
app.listen(port, () => console.log(`Listening on port ${port}`));

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
