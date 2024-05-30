const { ethers } = require('ethers');
const { ChainId, Token, WETH, Fetcher, Route, Trade, TradeType, TokenAmount, Percent } = require('@uniswap/sdk');
const { AlphaRouter } = require('@uniswap/smart-order-router');
require('dotenv').config();

const provider = new ethers.providers.JsonRpcProvider(process.config.DEFAULT_NODE_URL);

const main = async () => {
    const chainId = ChainId.MAINNET;

    const WETH_TOKEN = WETH[chainId];
    const DAI = new Token(
        chainId,
        '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI address
        18,
        'DAI',
        'Dai Stablecoin'
    );

    const router = new AlphaRouter({
        chainId: chainId,
        provider: provider
    });

    const amountIn = ethers.utils.parseUnits('1', 18); // 1 ETH in wei

    const route = await router.route(
        new TokenAmount(WETH_TOKEN, amountIn.toString()),
        DAI,
        TradeType.EXACT_INPUT,
        {
            recipient: '0x0000000000000000000000000000000000000000', // Replace with your wallet address
            slippageTolerance: new Percent('50', '10000'), // 0.5% slippage tolerance
            deadline: Math.floor(Date.now() / 1000 + 60 * 20) // 20 minutes from the current Unix time
        }
    );

    console.log(`Best price for swapping 1 ETH to DAI: ${route.quote.toExact()} DAI`);
};

main().catch(console.error);


