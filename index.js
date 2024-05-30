const { JsonRpcProvider } = require('@ethersproject/providers');
const { Route, Trade, TokenAmount, TradeType, Fetcher } = require('@uniswap/sdk');
const { AddressZero } = require('@ethersproject/constants');
const { BigNumber } = require('@ethersproject/bignumber');

// Instantiate your Erigon node provider
const provider = new JsonRpcProvider('http://localhost:8545'); // Assuming your Erigon node is running on localhost:8545

// Hardcoded token addresses
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';

async function main() {
    try {
        // Fetch token information
        const DAI = await Fetcher.fetchTokenData(1, DAI_ADDRESS, provider);
        const WETH = await Fetcher.fetchTokenData(1, WETH_ADDRESS, provider);

        // Create the trade object for 1 ETH to DAI
        const pair = await Fetcher.fetchPairData(WETH, DAI, provider);
        const route = new Route([pair], WETH, DAI);
        const amountIn = new TokenAmount(WETH, BigNumber.from('10').pow(WETH.decimals)); // Amount of input (1 ETH)

        // Execute the trade
        const trade = new Trade(route, amountIn, TradeType.EXACT_INPUT);
        const amountOut = trade.minimumAmountOut(0.01); // Minimum amount of output (0.01 DAI)

        console.log(`Amount of ETH needed for 1 DAI: ${amountOut.toFixed(4)}`);
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
