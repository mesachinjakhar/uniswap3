const fs = require('fs');
const express = require('express');
const ethers = require('ethers');
const Web3 = require('web3');
const config = require('./config.json');

const app = express();
const web3Url = process.env.ETH_NODE_URL || config.DEFAULT_NODE_URL;
const web3 = new Web3(new Web3.providers.WebsocketProvider(web3Url, {
    clientConfig: {
        maxReceivedFrameSize: 10000000000,
        maxReceivedMessageSize: 10000000000,
    }
}));

const IUniswapV3FactoryAbi = require('@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json').abi;
const IQuoterAbi = require('@uniswap/v3-periphery/artifacts/contracts/interfaces/IQuoter.sol/IQuoter.json').abi;
const IERC20MetadataAbi = require('@uniswap/v3-periphery/artifacts/contracts/interfaces/IERC20Metadata.sol/IERC20Metadata.json').abi;

const factory = new web3.eth.Contract(IUniswapV3FactoryAbi, config.UNISWAPV3_FACTORY_ADDRESS);
const quoter = new web3.eth.Contract(IQuoterAbi, config.UNISWAPV3_QUOTER_ADDRESS);

const ONE_WETH = ethers.utils.parseUnits('1', 18).toString();

const state = {
    tokens: {},
    pools: {},
    prices: {},
    customAmountInWei: config.CUSTOM_AMOUNT
};

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

async function updatePoolPrices(pool) {
    let otherToken = isWeth(pool.token0) ? pool.token1 : pool.token0;

    const ethToTokenPrice = await quoter.methods.quoteExactInputSingle(
        config.WETH_ADDRESS_MAINNET,
        otherToken,
        pool.fee,
        ONE_WETH,
        0
    ).call().catch(() => 0);

    if (ethToTokenPrice === 0) {
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

    if (tokenToEthPrice === 0) {
        if (state.prices[otherToken]) {
            delete state.prices[otherToken].pools[pool.pool];
        }
        return;
    }

    if (!state.prices[otherToken]) {
        state.prices[otherToken] = {
            address: otherToken,
            ...state.tokens[otherToken],
            pools: {}
        };
    }

    state.prices[otherToken].pools[pool.pool] = {
        ethToTokenPrice: ethers.utils.formatUnits(ethToTokenPrice, state.tokens[otherToken].decimals).toString(),
        tokenToEthPrice: ethers.utils.formatUnits(tokenToEthPrice, state.tokens[otherToken].decimals).toString()
    };
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
    const pools = Object.keys(state.pools);
    for (const poolAddress of pools) {
        await updatePoolPrices(state.pools[poolAddress]);
    }
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

main();

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

process.on('SIGINT', exitHandler.bind(null, 'SIGINT'));
process.on('SIGUSR1', exitHandler.bind(null, 'SIGUSR1'));
process.on('SIGUSR2', exitHandler.bind(null, 'SIGUSR2'));
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    exitHandler('uncaughtException');
});

function exitHandler(signal) {
    console.log(`Received signal: ${signal}`);
    process.exit();
}
