const { ethers } = require('ethers');
const { AlphaRouter } = require('@uniswap/smart-order-router');
const { Token, CurrencyAmount, TradeType, Percent } = require('@uniswap/sdk-core');
require('dotenv').config();

// Use local Erigon node URL
const provider = new ethers.providers.WebSocketProvider('ws://127.0.0.1:8545');

const main = async () => {
  const chainId = 1; // Mainnet

  // Token definitions
  const WETH = new Token(chainId, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 18, 'WETH', 'Wrapped Ether');
  const DAI = new Token(chainId, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18, 'DAI', 'Dai Stablecoin');

  console.log('WETH Token:', WETH);
  console.log('DAI Token:', DAI);

  const router = new AlphaRouter({ chainId, provider });

  const amountIn = ethers.utils.parseUnits('1', 18); // 1 ETH in wei

  try {
    const route = await router.route(
      CurrencyAmount.fromRawAmount(WETH, amountIn.toString()),
      DAI,
      TradeType.EXACT_INPUT,
      {
        recipient: '0xYourWalletAddressHere', // Replace with your wallet address
        slippageTolerance: new Percent('50', '10000'), // 0.5% slippage tolerance
        deadline: Math.floor(Date.now() / 1000 + 60 * 20), // 20 minutes from now
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




