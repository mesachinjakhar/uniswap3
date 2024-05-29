const fs = require('fs');
const config = require('./config.json');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.WebsocketProvider(config.DEFAULT_NODE_URL));

const IUniswapV3FactoryAbi = require('@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json').abi;
const IUniswapV3QuoterAbi = require('@uniswap/v3-periphery/artifacts/contracts/interfaces/IQuoter.sol/IQuoter.json').abi;
const UniswapV3PoolAbi = require('@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json').abi;
const IERC20MetadataAbi = require('@uniswap/v3-periphery/artifacts/contracts/interfaces/IERC20Metadata.sol/IERC20Metadata.json').abi;

const factory = new web3.eth.Contract(IUniswapV3FactoryAbi, config.UNISWAPV3_FACTORY_ADDRESS);
const quoter = new web3.eth.Contract(IUniswapV3QuoterAbi, config.UNISWAPV3_QUOTER_ADDRESS);

function isWeth(address) {
    return config.WETH_ADDRESS_MAINNET === address;
}

async function getTokenInfo(address) {
    const token = new web3.eth.Contract(IERC20MetadataAbi, address);
    const symbol = await token.methods.symbol().call();
    const name = await token.methods.name().call();
    const decimals = await token.methods.decimals().call();

    return {
        symbol,
        name,
        decimals
    };
}

const state = {
    tokens: {},
    pools: {},
    prices: {}
};

async function updatePoolPrices(pool) {
    let otherToken = isWeth(pool.token0) ? pool.token1 : pool.token0;

    const ethToTokenPrice = await quoter.methods.quoteExactInputSingle(
        config.WETH_ADDRESS_MAINNET,
        otherToken,
        pool.fee,
        config.CUSTOM_AMOUNT,
        0
    ).call();

    const tokenToEthPrice = await quoter.methods.quoteExactOutputSingle(
        otherToken,
        config.WETH_ADDRESS_MAINNET,
        pool.fee,
        config.CUSTOM_AMOUNT,
        0
    ).call();

    if (!ethToTokenPrice || !tokenToEthPrice) {
        if (state.prices[otherToken]) {
            delete state.prices[otherToken].pools[pool.pool];
            if (Object.keys(state.prices[otherToken].pools).length === 0) {
                delete state.prices[otherToken];
            }
        }
        return;
    }

    if (!state.tokens[otherToken]) {
        const tokenInfo = await getTokenInfo(otherToken);
        state.tokens[otherToken] = tokenInfo;
    }

    if (!state.prices[otherToken]) {
        state.prices[otherToken] = {
            address: otherToken,
            ...state.tokens[otherToken],
            pools: {}
        };
    }

    state.prices[otherToken].pools[pool.pool] = {
        ethToTokenPrice: ethToTokenPrice.toString(),
        tokenToEthPrice: tokenToEthPrice.toString()
    };
}

// Fetch existing pool and token data when the app starts
factory.getPastEvents('PoolCreated', {
    fromBlock: 0, // or any other start block number
    toBlock: 'latest'
})
.then(async function (events) {
    for (let event of events) {
        const isToken0Weth = isWeth(event.returnValues.token0);
        const isToken1Weth = isWeth(event.returnValues.token1);

        if (isToken0Weth || isToken1Weth) {
            if (!state.tokens[event.returnValues.token0]) {
                const tokenInfo = await getTokenInfo(event.returnValues.token0);
                state.tokens[event.returnValues.token0] = tokenInfo;
            }
            if (!state.tokens[event.returnValues.token1]) {
                const tokenInfo = await getTokenInfo(event.returnValues.token1);
                state.tokens[event.returnValues.token1] = tokenInfo;
            }

            state.pools[event.returnValues.pool] = event.returnValues;
            updatePoolPrices(state.pools[event.returnValues.pool]);
        }
    }
})
.catch(function (error) {
    console.error('Error fetching past PoolCreated events:', error);
});

web3.eth.subscribe('newBlockHeaders')
    .on('data', async function (block) {
        console.log(`NEW_BLOCK ${block.number}`);

        const pools = Object.values(state.pools);
        for (const pool of pools) {
            await updatePoolPrices(pool);
        }
    })
    .on('error', function (err) {
        console.error('block subscription error', err);
    });

factory.events.PoolCreated({
    fromBlock: 'latest'
})
    .on('data', async function (event) {
        const isToken0Weth = isWeth(event.returnValues.token0);
        const isToken1Weth = isWeth(event.returnValues.token1);

        if (isToken0Weth || isToken1Weth) {
            if (!state.tokens[event.returnValues.token0]) {
                const tokenInfo = await getTokenInfo(event.returnValues.token0);
                state.tokens[event.returnValues.token0] = tokenInfo;
            }
            if (!state.tokens[event.returnValues.token1]) {
                const tokenInfo = await getTokenInfo(event.returnValues.token1);
                state.tokens[event.returnValues.token1] = tokenInfo;
            }

            state.pools[event.returnValues.pool] = event.returnValues;
            updatePoolPrices(state.pools[event.returnValues.pool]);
        }
    })
    .on('error', function (error, receipt) {
        console.error('pool created subscription error', error, receipt);
    });

const express = require('express');
const app = express();

app.get('/uniswap3', function (req, res) {
    res.send(Object.values(state.prices));
});

const port = process.env.NODE_PORT || config.DEFAULT_API_PORT;
app.listen(port, () => console.log(`Listening on port ${port}`));