const { ethers } = require('ethers');
const {
  ChainId,
  Token,
  WETH,
  Fetcher,
  Route,
  Trade,
  TradeType,
  TokenAmount,
  Percent
} = require('@uniswap/sdk');
const { AlphaRouter } = require('@uniswap/smart-order-router');
require('dotenv').config();

// Use local Erigon node URL
const provider = new ethers.providers.WebSocketProvider('ws://127.0.0.1:8545');

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

  try {
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

    if (route) {
      console.log(`Best price for swapping 1 ETH to DAI: ${route.quote.toExact()} DAI`);
    } else {
      console.log('No route found for the swap.');
    }
  } catch (error) {
    console.error('Error fetching the route:', error);
  }
};

main().catch(console.error);


