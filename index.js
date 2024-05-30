const { ethers } = require("ethers");
const { ChainId, Token, WETH, Fetcher, Route, Trade, TokenAmount, TradeType } = require('@uniswap/sdk-core');
const { Quoter } = require('@uniswap/v3-sdk');
const config = require('./config.json');

async function getSwapPrice() {
  // Connect to the local Erigon node
  const provider = new ethers.providers.JsonRpcProvider(config.DEFAULT_NODE_URL);

  // Define tokens
  const WETH = new Token(ChainId.MAINNET, config.WETH_ADDRESS_MAINNET, 18, 'WETH', 'Wrapped Ether');
  const DAI = new Token(ChainId.MAINNET, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18, 'DAI', 'Dai Stablecoin');

  // Fetch the pair data
  const pair = await Fetcher.fetchPairData(WETH, DAI, provider);

  // Create a route
  const route = new Route([pair], WETH);

  // Create a trade
  const amountIn = ethers.utils.parseEther('1'); // 1 WETH
  const trade = new Trade(route, new TokenAmount(WETH, amountIn.toString()), TradeType.EXACT_INPUT);

  // Quoter contract instance
  const quoter = new ethers.Contract(
    config.UNISWAPV3_QUOTER_ADDRESS,
    ['function quoteExactInputSingle(address,address,uint24,uint256,uint160) external returns (uint256)'],
    provider
  );

  // Quote swap price
  const amountOut = await quoter.callStatic.quoteExactInputSingle(
    WETH.address,
    DAI.address,
    3000, // Pool fee
    amountIn,
    0
  );

  console.log(`Swap 1 WETH to DAI: ${ethers.utils.formatUnits(amountOut, 18)} DAI`);
}

getSwapPrice().catch(console.error);


