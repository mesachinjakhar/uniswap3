const { ethers } = require('ethers');
const { AlphaRouter } = require('@uniswap/smart-order-router');
const { Token, CurrencyAmount, TradeType, Percent } = require('@uniswap/sdk-core');
const { ChainId } = require('@uniswap/sdk-core');

require('dotenv').config();

// Use local Erigon node URL
const provider = new ethers.providers.WebSocketProvider(process.env.WS_URL);

const main = async () => {
  try {
    const WETH = new Token(ChainId.MAINNET, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 18, 'WETH', 'Wrapped Ether');
    const DAI = new Token(ChainId.MAINNET, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18, 'DAI', 'Dai Stablecoin');

    const router = new AlphaRouter({ chainId: ChainId.MAINNET, provider });

    const amountIn = ethers.utils.parseUnits('1', 18); // 1 ETH in wei

    const options = {
      slippageTolerance: new Percent('5', '10000'), // Adjusted slippage tolerance as a fraction (0.05%)
      deadline: Math.floor(Date.now() / 1000 + 60 * 20), // 20 minutes from now
      type: 1 // Specify the swap type (SwapType.EXACT_INPUT)
    };

    const route = await router.route(
      CurrencyAmount.fromRawAmount(WETH, amountIn.toString()),
      DAI,
      TradeType.EXACT_INPUT,
      options
    );

    if (route) {
      console.log(`Best price for swapping 1 ETH to DAI: ${route.quote.toExact()} DAI`);
    } else {
      console.log('No route found for the swap.');
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

main().catch(console.error);
