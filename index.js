const { ethers } = require('ethers');
const { ChainId, Token, TradeType, Percent } = require('@uniswap/sdk-core');
const { AlphaRouter } = require('@uniswap/smart-order-router');

require('dotenv').config();

// Define token addresses for ETH and DAI on the respective chain (MAINNET)
const ETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'; // WETH address
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

// Use local Erigon node URL
const provider = new ethers.providers.JsonRpcProvider(process.env.ERIGON_URL);

const main = async () => {
    try {
        // Create token instances for ETH and DAI
        const WETH = new Token(ChainId.MAINNET, ETH_ADDRESS, 18, 'WETH', 'Wrapped Ether');
        const DAI = new Token(ChainId.MAINNET, DAI_ADDRESS, 18, 'DAI', 'Dai Stablecoin');

        // Create router instance
        const router = new AlphaRouter({ chainId: ChainId.MAINNET, provider });

        // Define amount of 1 ETH in wei
        const amountIn = ethers.utils.parseEther('1');

        // Define swap options
        const options = {
            slippageTolerance: new Percent('50', '10000'), // 0.5% slippage tolerance
            deadline: Math.floor(Date.now() / 1000 + 60 * 20), // 20 minutes from now
        };

        // Route the swap
        const route = await router.route(
            { token: WETH, amount: amountIn },
            DAI,
            TradeType.EXACT_INPUT,
            options
        );

        if (route) {
            // Get the best quote
            const bestQuote = route.bestQuote;
            console.log(`Best price for swapping 1 ETH to DAI: ${bestQuote.toSignificant(6)} DAI`);
        } else {
            console.log('Route not found or invalid.');
        }
    } catch (error) {
        console.error('Error:', error);
    }
};

main().catch(console.error);

