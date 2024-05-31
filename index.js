const { ChainId, Token, TokenAmount, TradeType, Route, Trade, Percent, TradeOptions } = require('@uniswap/sdk-core');
const {Fetcher } = require('@uniswap/v3-sdk');


async function main() {
    const chainId = ChainId.MAINNET;
    const tokenIn = await Fetcher.fetchTokenData(chainId, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'); // WETH address
    const tokenOut = await Fetcher.fetchTokenData(chainId, '0x6B175474E89094C44Da98b954EedeAC495271d0F'); // Replace 'DAI_ADDRESS' with the actual DAI token address

    const pair = await Fetcher.fetchPairData(tokenIn, tokenOut);
    const route = new Route([pair], tokenIn);

    const amountIn = '1000000000000000000'; // 1 ETH in wei
    const trade = new Trade(route, new TokenAmount(tokenIn, amountIn), TradeType.EXACT_INPUT);
    
    console.log(`1 ETH can be swapped for approximately ${trade.minimumAmountOut(0.01).toSignificant(6)} DAI`);
}

main().catch(console.error);
