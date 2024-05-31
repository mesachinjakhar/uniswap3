const { ethers } = require('ethers');
const { Token, WETH, Fetcher, Route, Trade, TokenAmount, TradeType, Percent } = require('@uniswap/sdk');
const { AlphaRouter } = require('@uniswap/smart-order-router');
const JSBI = require('jsbi');

// Configuration
const RPC_URL = 'http://localhost:8545'; // Your Erigon node URL
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

// Uniswap tokens and addresses
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
const CHAIN_ID = 1; // Mainnet

// Initialize the Uniswap AlphaRouter
const router = new AlphaRouter({ chainId: CHAIN_ID, provider });

async function getSwapPrice() {
  // Define the tokens
  const weth = new Token(CHAIN_ID, WETH_ADDRESS, 18, 'WETH', 'Wrapped Ether');
  const dai = new Token(CHAIN_ID, DAI_ADDRESS, 18, 'DAI', 'Dai Stablecoin');

  // Amount of WETH to swap (1 ETH)
  const amountIn = ethers.utils.parseUnits('1', 18);

  try {
    // Fetch the best route using AlphaRouter
    const route = await router.route(
      new TokenAmount(weth, JSBI.BigInt(amountIn.toString())),
      dai,
      TradeType.EXACT_INPUT,
      {
        recipient: '0x0000000000000000000000000000000000000000', // This can be any address since we're not making an actual trade
        slippageTolerance: new Percent('50', '10000'), // 0.5% slippage tolerance
        deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from the current Unix time
      }
    );

    if (route) {
      const amountOut = route.quote.toExact();
      console.log(`Best price route: 1 ETH = ${amountOut} DAI`);
    } else {
      console.log('No route found');
    }
  } catch (error) {
    console.error('Error getting swap price:', error);
  }
}

getSwapPrice();
