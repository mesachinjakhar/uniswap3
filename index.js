const fs = require('fs');
const config = require('./config.json');
const mathjs = require('mathjs');
const math = mathjs.create(mathjs.all);
const ethers = require('ethers');
const Web3 = require('web3');

math.config({ number: 'BigNumber' });

const web3Url = process.env.ETH_NODE_URL || config.DEFAULT_NODE_URL;
const web3 = new Web3(new Web3.providers.WebsocketProvider(web3Url, {
    clientConfig: {
        maxReceivedFrameSize: 100000000,
        maxReceivedMessageSize: 100000000,
    },
    reconnect: {
        auto: true,
        delay: 5000,
        maxAttempts: 5,
        onTimeout: false
    }
}));

const IUniswapV3FactoryAbi = require('@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json').abi;
const IUniswapV3QuoterAbi = require('@uniswap/v3-periphery/artifacts/contracts/interfaces/IQuoter.sol/IQuoter.json').abi;
const IERC20MetadataAbi = require('@uniswap/v3-periphery/artifacts/contracts/interfaces/IERC20Metadata.sol/IERC20Metadata.json').abi;

const factory = new web3.eth.Contract(IUniswapV3FactoryAbi, config.UNISWAPV3_FACTORY_ADDRESS);
const quoter = new web3.eth.Contract(IUniswapV3QuoterAbi, config.UNISWAPV3_QUOTER_ADDRESS);

const ONE_WETH = ethers.utils.parseUnits('1', 18).toString();

function isWeth(address) {
    return config.WETH_ADDRESS_MAINNET === address;
}

async function getTokenInfo(address) {
    const token = new web3.eth.Contract(IERC20MetadataAbi, address);
    try {
        const symbol = await token.methods.symbol().call();
        const name = await token.methods.name().call();
        const decimals = await token.methods.decimals().call();
        return { symbol, name, decimals };
    } catch (error) {
        console.error(`Error fetching token info for ${address}:`, error);
        return { symbol: '', name: '', decimals: '' };
    }
}

const state = {
    tokens: {},
    pools: {},
    prices: {},
    customAmountInWei: config.CUSTOM_AMOUNT
};

async function updatePoolPrices(pool) {
    let otherToken = isWeth(pool.token0) ? pool.token1 : pool.token0;
    try {
        const ethToTokenPrice = await quoter.methods.quoteExactInputSingle(
            config.WETH_ADDRESS_MAINNET,
            otherToken,
            pool.fee,
            ONE_WETH,
            0
        ).call();

        if (math.bignumber(ethToTokenPrice).isZero()) {
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
        ).call();

        if (math.bignumber(tokenToEthPrice).isZero()) {
            if (state.prices[otherToken]) {
                delete state.prices[otherToken].pools[pool.pool];
            }
            return;
        }

        const ethToTokenPricePriceAdjust = await quoter.methods.quoteExactInputSingle(
            config.WETH_ADDRESS_MAINNET,
            otherToken,
            pool.fee,
            state.customAmountInWei,
            0
        ).call();

        if (math.bignumber(ethToTokenPricePriceAdjust).isZero()) {
            if (state.prices[otherToken]) {
                delete state.prices[otherToken].pools[pool.pool];
            }
            return;
        }

        const tokenToEthPricePriceAdjust = await quoter.methods.quoteExactOutputSingle(
            otherToken,
            config.WETH_ADDRESS_MAINNET,
            pool.fee,
            state.customAmountInWei,
            0
        ).call();

        if (math.bignumber(tokenToEthPricePriceAdjust).isZero()) {
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
            tokenToEthPrice: ethers.utils.formatUnits(tokenToEthPrice, state.tokens[otherToken].decimals).toString(),
            ethToTokenPricePriceAdjust: ethers.utils.formatUnits(ethToTokenPricePriceAdjust, state.tokens[otherToken].decimals).toString(),
            tokenToEthPricePriceAdjust: ethers.utils.formatUnits(tokenToEthPricePriceAdjust, state.tokens[otherToken].decimals).toString()
        };
    } catch (error) {
        console.error(`Error updating pool prices for ${pool.pool}:`, error);
    }
}

const UNISWAPV3_SWAP_EVENT_TOPIC = '0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67';
const handledBlocks = {};

async function fetchRecentPoolCreatedEvents() {
    const BATCH_SIZE = 10000;
    const currentBlock = await web3.eth.getBlockNumber();
    const fromBlock = currentBlock - BATCH_SIZE;
    const toBlock = 'latest';

    try {
        const events = await factory.getPastEvents('PoolCreated', {
            fromBlock,
            toBlock
        });

        for (let event of events) {
            const isToken0Weth = isWeth(event.returnValues.token0);
            const isToken1Weth = isWeth(event.returnValues.token1);

            if (!isToken0Weth && !isToken1Weth) continue;

            if (!state.tokens[event.returnValues.token0]) {
                const tokenInfo = await getTokenInfo(event.returnValues.token0);
                if (!tokenInfo.name || !tokenInfo.symbol || !tokenInfo.decimals) continue;
                state.tokens[event.returnValues.token0] = tokenInfo;
            }
            if (!state.tokens[event.returnValues.token1]) {
                const tokenInfo = await getTokenInfo(event.returnValues.token1);
                if (!tokenInfo.name || !tokenInfo.symbol || !tokenInfo.decimals) continue;
                state.tokens[event.returnValues.token1] = tokenInfo;
            }

            state.pools[event.returnValues.pool] = event.returnValues;
            await updatePoolPrices(state.pools[event.returnValues.pool]);
        }
    } catch (error) {
        console.error('Error fetching PoolCreated events:', error);
    }
}

async function processNewBlock(blockNumber) {
    try {
        await fetchRecentPoolCreatedEvents();
        console.log('Processing new block:', blockNumber);
    } catch (error) {
        console.error('Error processing new block:', error);
    }
}

async function main() {
    web3.eth.subscribe('newBlockHeaders')
        .on('connected', function (id) {
            console.info('blocks subscription connected', id);
        })
        .on('data', async function (block) {
            console.info(`NEW_BLOCK ${block.number}`);
            await processNewBlock(block.number);
        })
        .on('error', function (err) {
            console.error('block subscription error', err);
        });

    web3.eth.subscribe('logs', { topics: [UNISWAPV3_SWAP_EVENT_TOPIC] })
        .on('connected', function (id) {
            console.info('logs subscription connected', id);
        })
        .on('data', async function (raw) {
            if (handledBlocks[raw.blockNumber]) return;
            handledBlocks[raw.blockNumber] = true;
            await readSyncEventsForBlock(raw.blockNumber);
        })
        .on('error', function (err) {
            console.error('logs subscription error', err);
        });

    async function readSyncEventsForBlock(blockNumber) {
        try {
            const logsRaw = await web3.eth.getPastLogs({ fromBlock: blockNumber, toBlock: blockNumber, topics: [UNISWAPV3_SWAP_EVENT_TOPIC] });

            const syncs = {};
            logsRaw.forEach(data => {
                if (!data.removed) {
                    syncs[data.address] = true;
                }
            });

            const promises = Object.keys(syncs).map(async poolAddress => {
                if (state.pools[poolAddress]) {
                    await updatePoolPrices(state.pools[poolAddress]);
                }
            });

            await Promise.all(promises);
        } catch (error) {
            console.error(`Error reading sync events for block ${blockNumber}:`, error);
        }
    }

    factory.getPastEvents('PoolCreated', {
        fromBlock: 'latest',
        toBlock: await web3.eth.getBlockNumber()
    }).then(async events => {
        for (let event of events) {
            const isToken0Weth = isWeth(event.returnValues.token0);
            const isToken1Weth = isWeth(event.returnValues.token1);

            if (!isToken0Weth && !isToken1Weth) continue;

            if (!state.tokens[event.returnValues.token0]) {
                const tokenInfo = await getTokenInfo(event.returnValues.token0);
                if (!tokenInfo.name || !tokenInfo.symbol || !tokenInfo.decimals) continue;
                state.tokens[event.returnValues.token0] = tokenInfo;
            }
            if (!state.tokens[event.returnValues.token1]) {
                const tokenInfo = await getTokenInfo(event.returnValues.token1);
                if (!tokenInfo.name || !tokenInfo.symbol || !tokenInfo.decimals) continue;
                state.tokens[event.returnValues.token1] = tokenInfo;
            }

            state.pools[event.returnValues.pool] = event.returnValues;
            await updatePoolPrices(state.pools[event.returnValues.pool]);
        }
    });

    factory.events.PoolCreated({
        fromBlock: 'latest',
    })
        .on("connected", function (subscriptionId) {
            console.log('pools subscription connected', subscriptionId);
        })
        .on('data', async function (event) {
            const isToken0Weth = isWeth(event.returnValues.token0);
            const isToken1Weth = isWeth(event.returnValues.token1);

            if (!isToken0Weth && !isToken1Weth) return;

            if (!state.tokens[event.returnValues.token0]) {
                const tokenInfo = await getTokenInfo(event.returnValues.token0);
                if (!tokenInfo.name || !tokenInfo.symbol || !tokenInfo.decimals) return;
                state.tokens[event.returnValues.token0] = tokenInfo;
            }
            if (!state.tokens[event.returnValues.token1]) {
                const tokenInfo = await getTokenInfo(event.returnValues.token1);
                if (!tokenInfo.name || !tokenInfo.symbol || !tokenInfo.decimals) return;
                state.tokens[event.returnValues.token1] = tokenInfo;
            }

            state.pools[event.returnValues.pool] = event.returnValues;
            await updatePoolPrices(state.pools[event.returnValues.pool]);
        })
        .on('error', function (error, receipt) {
            console.error('pool created subscription error', error, receipt);
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
    res.send(Object.keys(state.prices).map(key => state.prices[key]));
});

app.get('/setEthAmount', async function (req, res) {
    if (!req.query || !req.query.amount) {
        return res.status(400).send({ error: 'Parameter "amount" is required.' });
    }

    try {
        const inWei = ethers.utils.parseUnits(req.query.amount.toString(), 18).toString();
        state.customAmountInWei = inWei;
        config.CUSTOM_AMOUNT = inWei;

        fs.writeFileSync('./config.json', JSON.stringify(config, null, 2), function (err) {
            if (err) console.error('Error writing to config file:', err);
        });

        res.send({ amount: config.CUSTOM_AMOUNT });
    } catch (error) {
        console.error('Error setting ETH amount:', error);
        return res.status(400).send({ error: 'Invalid value for parameter "amount". A string in ETH units is required.' });
    }
});

const port = process.env.NODE_PORT || config.DEFAULT_API_PORT;
app.listen(port, () => console.log(`Listening on port ${port}`));