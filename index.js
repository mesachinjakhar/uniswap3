const { ethers } = require('ethers');
const { Token, CurrencyAmount, TradeType, Percent } = require('@uniswap/sdk-core');
const { AlphaRouter } = require('@uniswap/smart-order-router');
const JSBI = require('jsbi');

// Setup
const RPC_URL = 'http://localhost:8545'; // Your Erigon node URL
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
const CHAIN_ID = 1; // Mainnet

const router = new AlphaRouter({ chainId: CHAIN_ID, provider });

async function getSwapPrice() {
  const weth = new Token(CHAIN_ID, WETH_ADDRESS, 18, 'WETH', 'Wrapped Ether');
  const dai = new Token(CHAIN_ID, DAI_ADDRESS, 18, 'DAI', 'Dai Stablecoin');

  const amountIn = ethers.utils.parseUnits('1', 18);

  try {
    const route = await router.route(
      CurrencyAmount.fromRawAmount(weth, JSBI.BigInt(amountIn.toString())),
      dai,
      TradeType.EXACT_INPUT,
      {
        recipient: ethers.constants.AddressZero,
        slippageTolerance: new Percent('50', '10000'),
        deadline: Math.floor(Date.now() / 1000) + 60 * 20,
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
