const { ethers } = require('ethers');
const { AlphaRouter, ChainId } = require('@uniswap/smart-order-router');
const { Token, CurrencyAmount, TradeType, Percent } = require('@uniswap/sdk-core');
const { fromReadableAmount } = require('./conversion');

// Example configuration
const CurrentConfig = {
  tokens: {
    in: new Token(ChainId.MAINNET, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 18, 'WETH', 'Wrapped Ether'),
    out: new Token(ChainId.MAINNET, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18, 'DAI', 'Dai Stablecoin'),
    amountIn: 1 // 1 ETH
  }
};

// Create provider for your local Erigon node
const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');

// Create router instance
const router = new AlphaRouter({
  chainId: ChainId.MAINNET,
  provider,
});

// Convert input amount to raw token amount
const rawTokenAmountIn = fromReadableAmount(CurrentConfig.tokens.amountIn, CurrentConfig.tokens.in.decimals);

// Route the swap and get price
const main = async () => {
  try {
    const route = await router.route(
      CurrencyAmount.fromRawAmount(CurrentConfig.tokens.in, rawTokenAmountIn),
      CurrentConfig.tokens.out,
      TradeType.EXACT_INPUT
    );

    // Check if route is valid
    if (route && route.midPrice) {
      console.log(`1 ETH = ${route.midPrice.toSignificant(6)} ${CurrentConfig.tokens.out.symbol}`);
    } else {
      console.log('Route not found or invalid.');
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

main().catch(console.error);
